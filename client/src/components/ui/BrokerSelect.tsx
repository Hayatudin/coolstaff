'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { ChevronDown, User, Plus, Search } from 'lucide-react';

export interface BrokerOption {
  id: string;
  name: string;
  leaderId?: string | null;
  leader?: { id?: string; name?: string | null } | null;
}

interface BrokerSelectProps {
  label?: string;
  brokers: BrokerOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  onCreate?: (name: string) => void;
  required?: boolean;
}

const normalizeBrokerName = (name: string): string =>
  name.trim().replace(/\s+/g, ' ').toLowerCase();

const getBrokerLeaderPriority = (broker: BrokerOption): number => {
  const leaderName = (broker.leader?.name || '').trim().toUpperCase();
  if (leaderName === 'DAERA OFFICE 2' || leaderName === 'DAIRA OFFICE 2') return 3;
  if (leaderName === 'DAERA OFFICE' || leaderName === 'DAIRA OFFICE') return 2;
  return 1;
};

export default function BrokerSelect({
  label,
  brokers,
  value,
  onChange,
  placeholder = 'Select broker...',
  error,
  disabled = false,
  onCreate,
  required = false,
}: BrokerSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pendingJumpLetterRef = useRef<string | null>(null);

  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  // Deduplicate brokers by name (preferring DAERA OFFICE 2) and sort alphabetically A-Z
  const uniqueSortedBrokers = useMemo(() => {
    const byName = new Map<string, BrokerOption>();
    for (const b of brokers) {
      const trimmedName = (b.name || '').trim();
      if (!trimmedName) continue;
      const key = normalizeBrokerName(trimmedName);
      const existing = byName.get(key);
      if (!existing || getBrokerLeaderPriority(b) > getBrokerLeaderPriority(existing)) {
        byName.set(key, { ...b, name: trimmedName });
      }
    }
    return Array.from(byName.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }, [brokers]);

  // Find currently selected broker (even if its ID belongs to another leader)
  const selectedBroker = useMemo(() => {
    if (!value) return undefined;
    const direct = brokers.find((b) => b.id === value);
    if (direct) return { ...direct, name: (direct.name || '').trim() };
    return uniqueSortedBrokers.find((b) => b.id === value);
  }, [brokers, uniqueSortedBrokers, value]);

  const selectedNormalizedName = selectedBroker
    ? normalizeBrokerName(selectedBroker.name)
    : '';

  // Filter brokers by name only (A-Z, startsWith prioritized)
  const filteredBrokers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return uniqueSortedBrokers;

    const startsWithMatches: BrokerOption[] = [];
    const containsMatches: BrokerOption[] = [];

    for (const b of uniqueSortedBrokers) {
      const lower = b.name.toLowerCase();
      if (lower.startsWith(query)) {
        startsWithMatches.push(b);
      } else if (lower.includes(query)) {
        containsMatches.push(b);
      }
    }

    return [...startsWithMatches, ...containsMatches];
  }, [search, uniqueSortedBrokers]);

  const scrollItemIntoView = useCallback(
    (index: number, align: 'start' | 'nearest' = 'nearest') => {
      const container = listRef.current;
      const el = itemRefs.current[index];
      if (!container || !el) return;

      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();

      if (align === 'start') {
        container.scrollTop += elRect.top - containerRect.top - 4;
      } else if (elRect.top < containerRect.top) {
        container.scrollTop -= containerRect.top - elRect.top + 4;
      } else if (elRect.bottom > containerRect.bottom) {
        container.scrollTop += elRect.bottom - containerRect.bottom + 4;
      }
    },
    []
  );

  const jumpToLetter = useCallback(
    (rawChar: string, currentHighlight: number) => {
      const char = rawChar.toLowerCase();
      if (filteredBrokers.length === 0) return;

      const matchingIndices: number[] = [];
      for (let i = 0; i < filteredBrokers.length; i++) {
        if (filteredBrokers[i].name.trim().toLowerCase().startsWith(char)) {
          matchingIndices.push(i);
        }
      }

      if (matchingIndices.length === 0) return;

      const currentPosInMatches = matchingIndices.indexOf(currentHighlight);
      const targetIndex =
        currentPosInMatches !== -1
          ? matchingIndices[(currentPosInMatches + 1) % matchingIndices.length]
          : matchingIndices[0];

      setHighlightedIndex(targetIndex);
      requestAnimationFrame(() => {
        scrollItemIntoView(targetIndex, currentPosInMatches !== -1 ? 'nearest' : 'start');
      });
    },
    [filteredBrokers, scrollItemIntoView]
  );

  const closeDropdown = useCallback((returnFocus = false) => {
    setIsOpen(false);
    setSearch('');
    setHighlightedIndex(-1);
    if (returnFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  const handleSelectBroker = useCallback(
    (brokerId: string) => {
      onChange(brokerId);
      closeDropdown(true);
    },
    [onChange, closeDropdown]
  );

  // Measure coordinates when opening the dropdown (smart flip if near bottom)
  useEffect(() => {
    if (isOpen && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 12;
      const spaceAbove = rect.top - 12;

      if (spaceBelow < 220 && spaceAbove > spaceBelow) {
        setCoords({
          bottom: window.innerHeight - rect.top + 4,
          left: rect.left,
          width: rect.width,
          maxHeight: Math.min(350, Math.max(180, spaceAbove)),
        });
      } else {
        setCoords({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
          maxHeight: Math.min(350, Math.max(180, spaceBelow)),
        });
      }
    } else {
      setCoords(null);
    }
  }, [isOpen]);

  // Focus list container on open and jump to pending letter or selected broker
  useEffect(() => {
    if (!isOpen || !coords) return;

    requestAnimationFrame(() => {
      listRef.current?.focus({ preventScroll: true });

      if (pendingJumpLetterRef.current) {
        const letter = pendingJumpLetterRef.current;
        pendingJumpLetterRef.current = null;
        jumpToLetter(letter, -1);
        return;
      }

      if (selectedNormalizedName) {
        const idx = filteredBrokers.findIndex(
          (b) => normalizeBrokerName(b.name) === selectedNormalizedName
        );
        if (idx !== -1) {
          setHighlightedIndex(idx);
          scrollItemIntoView(idx, 'nearest');
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, Boolean(coords)]);

  // Keep highlight in sync when search text changes
  useEffect(() => {
    if (!isOpen) return;
    if (search.trim()) {
      setHighlightedIndex(filteredBrokers.length > 0 ? 0 : -1);
    } else if (selectedNormalizedName) {
      const idx = filteredBrokers.findIndex(
        (b) => normalizeBrokerName(b.name) === selectedNormalizedName
      );
      setHighlightedIndex(idx);
    } else {
      setHighlightedIndex(-1);
    }
  }, [search, isOpen, filteredBrokers, selectedNormalizedName]);

  // Close on click outside, resize, or scroll OUTSIDE the dropdown
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        (ref.current && ref.current.contains(event.target as Node)) ||
        (dropdownRef.current && dropdownRef.current.contains(event.target as Node))
      ) {
        return;
      }
      closeDropdown(false);
    }

    const handleScroll = (event: Event) => {
      if (
        dropdownRef.current &&
        event.target instanceof Node &&
        dropdownRef.current.contains(event.target)
      ) {
        return;
      }
      closeDropdown(false);
    };

    const handleResize = () => {
      closeDropdown(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, closeDropdown]);

  // Keyboard navigation while dropdown is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isSearchFocused = document.activeElement === searchInputRef.current;

      if (e.key === 'Escape') {
        e.preventDefault();
        closeDropdown(true);
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (filteredBrokers.length === 0) return;
        const nextIndex =
          highlightedIndex < filteredBrokers.length - 1 ? highlightedIndex + 1 : 0;
        setHighlightedIndex(nextIndex);
        requestAnimationFrame(() => scrollItemIntoView(nextIndex, 'nearest'));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (filteredBrokers.length === 0) return;
        const prevIndex =
          highlightedIndex > 0 ? highlightedIndex - 1 : filteredBrokers.length - 1;
        setHighlightedIndex(prevIndex);
        requestAnimationFrame(() => scrollItemIntoView(prevIndex, 'nearest'));
        return;
      }

      if (e.key === 'Home' && !isSearchFocused) {
        e.preventDefault();
        if (filteredBrokers.length === 0) return;
        setHighlightedIndex(0);
        requestAnimationFrame(() => scrollItemIntoView(0, 'start'));
        return;
      }

      if (e.key === 'End' && !isSearchFocused) {
        e.preventDefault();
        if (filteredBrokers.length === 0) return;
        const lastIndex = filteredBrokers.length - 1;
        setHighlightedIndex(lastIndex);
        requestAnimationFrame(() => scrollItemIntoView(lastIndex, 'nearest'));
        return;
      }

      if (e.key === 'Enter') {
        if (highlightedIndex >= 0 && filteredBrokers[highlightedIndex]) {
          e.preventDefault();
          handleSelectBroker(filteredBrokers[highlightedIndex].id);
        }
        return;
      }

      // Single-letter/digit jump when not actively typing inside the search input
      if (
        !isSearchFocused &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        e.key.length === 1 &&
        /^[a-z0-9]$/i.test(e.key)
      ) {
        e.preventDefault();
        jumpToLetter(e.key, highlightedIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    filteredBrokers,
    highlightedIndex,
    closeDropdown,
    handleSelectBroker,
    jumpToLetter,
    scrollItemIntoView,
  ]);

  // Allow pressing a letter or arrow key while trigger button is focused & closed
  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || isOpen) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
      return;
    }

    if (
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      e.key.length === 1 &&
      /^[a-z0-9]$/i.test(e.key)
    ) {
      e.preventDefault();
      pendingJumpLetterRef.current = e.key;
      setIsOpen(true);
    }
  };

  const exactMatchExists = useMemo(() => {
    const trimmed = search.trim();
    if (!trimmed) return true;
    const normalized = normalizeBrokerName(trimmed);
    return uniqueSortedBrokers.some((b) => normalizeBrokerName(b.name) === normalized);
  }, [search, uniqueSortedBrokers]);

  return (
    <div className={cn('flex flex-col gap-1.5 relative w-full', isOpen && 'z-50')} ref={ref}>
      {label && (
        <label className="text-sm font-medium text-text-secondary flex items-center gap-1">
          {label}
          {required && <span className="text-danger">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          onKeyDown={handleTriggerKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={cn(
            'w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-border bg-white text-left',
            'transition-all duration-200 cursor-pointer text-sm font-medium',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
            error && 'border-danger',
            isOpen && 'ring-2 ring-primary/20 border-primary'
          )}
        >
          <span className={cn('truncate', selectedBroker ? 'text-text-primary' : 'text-text-tertiary')}>
            {selectedBroker ? selectedBroker.name : placeholder}
          </span>
          <ChevronDown
            size={16}
            className={cn(
              'text-text-tertiary transition-transform duration-200 flex-shrink-0 ml-2',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {isOpen && coords && typeof window !== 'undefined' && createPortal(
          <div
            ref={dropdownRef}
            className="fixed bg-white border border-border/80 rounded-xl shadow-2xl z-[9999] animate-dropdown overflow-hidden flex flex-col"
            style={{
              top: coords.top,
              bottom: coords.bottom,
              left: coords.left,
              width: coords.width,
              maxHeight: coords.maxHeight,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="p-2 border-b border-border bg-gray-50/50 flex items-center gap-2 shrink-0">
              <Search size={14} className="text-text-tertiary flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={onCreate ? 'Search or add broker...' : 'Search broker...'}
                className="w-full px-2 py-1 text-sm bg-transparent border-none outline-none focus:ring-0 placeholder:text-text-tertiary/60"
              />
            </div>

            {/* Alphabetical List Area */}
            <div
              ref={listRef}
              tabIndex={-1}
              role="listbox"
              className="overflow-y-auto flex-1 py-1 px-1 space-y-0.5 outline-none"
            >
              {/* Direct / Clear option if not required */}
              {!required && !search && (
                <button
                  type="button"
                  onClick={() => handleSelectBroker('')}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-primary-50 hover:text-primary rounded-lg transition-colors font-medium',
                    value === '' && 'bg-primary-50 text-primary'
                  )}
                >
                  <User size={14} />
                  Direct / No Broker
                </button>
              )}

              {/* Deduplicated alphabetical list of brokers (names only, no leader badges) */}
              {filteredBrokers.map((b, idx) => {
                const isSelected = Boolean(
                  b.id === value ||
                  (selectedNormalizedName &&
                    normalizeBrokerName(b.name) === selectedNormalizedName)
                );
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={b.id}
                    ref={(el) => {
                      itemRefs.current[idx] = el;
                    }}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelectBroker(b.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-lg transition-colors text-text-primary cursor-pointer',
                      isHighlighted && 'bg-primary/10 text-primary ring-1 ring-primary/30',
                      !isHighlighted && 'hover:bg-primary-50 hover:text-primary',
                      isSelected && 'bg-primary-50 text-primary font-bold'
                    )}
                  >
                    <User size={14} className="opacity-70 shrink-0" />
                    <span className="truncate">{b.name}</span>
                  </button>
                );
              })}

              {/* Empty state & create option */}
              {filteredBrokers.length === 0 && (
                <div className="px-3 py-6 text-center text-xs text-text-tertiary">
                  {search.trim() && onCreate ? (
                    <div>
                      <p className="mb-2">No matching brokers found</p>
                      <button
                        type="button"
                        onClick={() => {
                          onCreate(search.trim());
                          closeDropdown(true);
                        }}
                        className="px-3 py-1.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={14} /> Add &quot;{search.trim()}&quot;
                      </button>
                    </div>
                  ) : (
                    'No brokers found'
                  )}
                </div>
              )}

              {/* Quick add at the bottom when search has no exact match */}
              {search.trim() && onCreate && !exactMatchExists && filteredBrokers.length > 0 && (
                <div className="border-t border-border mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onCreate(search.trim());
                      closeDropdown(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-primary hover:bg-primary-50 rounded-lg transition-colors font-medium cursor-pointer"
                  >
                    <Plus size={14} /> Add &quot;{search.trim()}&quot; as broker
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
      {error && <p className="text-xs text-danger mt-0.5">{error}</p>}
    </div>
  );
}
