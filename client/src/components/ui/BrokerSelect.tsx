'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, User, Plus, Search } from 'lucide-react';
import { Broker } from '@/types';

interface BrokerSelectProps {
  label?: string;
  brokers: Broker[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  onCreate?: (name: string) => void;
  required?: boolean;
}

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
  const ref = useRef<HTMLDivElement>(null);

  // Flat sorted brokers list
  const sortedBrokers = useMemo(() => {
    return [...brokers].sort((a, b) => a.name.localeCompare(b.name));
  }, [brokers]);

  // Find currently selected broker
  const selectedBroker = useMemo(() => {
    return brokers.find((b) => b.id === value);
  }, [brokers, value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter brokers based on search query (broker name or leader name)
  const filteredBrokers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sortedBrokers;

    return sortedBrokers.filter((b) => {
      const brokerMatches = b.name.toLowerCase().includes(query);
      const leaderMatches = b.leader?.name?.toLowerCase().includes(query) || false;
      return brokerMatches || leaderMatches;
    });
  }, [search, sortedBrokers]);

  const handleSelectBroker = (brokerId: string) => {
    onChange(brokerId);
    setIsOpen(false);
    setSearch('');
  };

  const exactMatchExists = useMemo(() => {
    if (!search.trim()) return true;
    return brokers.some(
      (b) => b.name.toLowerCase() === search.trim().toLowerCase()
    );
  }, [search, brokers]);

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
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
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

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border/80 rounded-xl shadow-2xl z-50 animate-dropdown overflow-hidden flex flex-col max-h-[350px]">
            {/* Search Input */}
            <div className="p-2 border-b border-border bg-gray-50/50 flex items-center gap-2">
              <Search size={14} className="text-text-tertiary flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search broker or leader..."
                className="w-full px-2 py-1 text-sm bg-transparent border-none outline-none focus:ring-0 placeholder:text-text-tertiary/60"
                autoFocus
              />
            </div>

            {/* List area */}
            <div className="overflow-y-auto flex-1 py-1 px-1 space-y-0.5">
              {/* Direct option / Clear option if not required */}
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

              {/* Flat list of filtered brokers */}
              {filteredBrokers.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelectBroker(b.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-primary-50 hover:text-primary rounded-lg transition-colors text-text-primary',
                    value === b.id && 'bg-primary-50 text-primary font-bold'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <User size={14} className="opacity-70 shrink-0" />
                    <span className="truncate">{b.name}</span>
                    {b.leader && (
                      <span className="text-[10px] bg-lime-100 text-lime-800 font-bold px-1.5 py-0.5 rounded border border-lime-200 shrink-0 ml-1">
                        Leader: {b.leader.name}
                      </span>
                    )}
                  </div>
                </button>
              ))}

              {/* Empty state & create option */}
              {filteredBrokers.length === 0 && (
                <div className="px-3 py-6 text-center text-xs text-text-tertiary">
                  {search.trim() && onCreate ? (
                    <div>
                      <p className="mb-2">No matching brokers found</p>
                      <button
                        type="button"
                        onClick={() => {
                          onCreate(search);
                          setIsOpen(false);
                          setSearch('');
                        }}
                        className="px-3 py-1.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors inline-flex items-center gap-1"
                      >
                        <Plus size={14} /> Add "{search}"
                      </button>
                    </div>
                  ) : (
                    'No brokers found'
                  )}
                </div>
              )}

              {/* If search active and exact match doesn't exist, show quick add at the bottom */}
              {search.trim() && onCreate && !exactMatchExists && filteredBrokers.length > 0 && (
                <div className="border-t border-border mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onCreate(search);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-primary hover:bg-primary-50 rounded-lg transition-colors font-medium"
                  >
                    <Plus size={14} /> Add "{search}" as broker
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-danger mt-0.5">{error}</p>}
    </div>
  );
}
