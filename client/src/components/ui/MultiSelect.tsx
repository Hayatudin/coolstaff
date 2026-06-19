'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check, X } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label?: string;
  options: SelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
  allowAddCustom?: boolean;
  customStorageKey?: string;
  required?: boolean;
}

export default function MultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  error,
  disabled = false,
  searchable = false,
  allowAddCustom = false,
  customStorageKey,
  required = false,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customOptions, setCustomOptions] = useState<SelectOption[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const allOptions = [...options, ...customOptions];

  const filteredOptions = searchable
    ? allOptions.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : allOptions;

  // Load custom options from localStorage on mount
  useEffect(() => {
    if (customStorageKey && typeof window !== 'undefined') {
      const saved = localStorage.getItem(customStorageKey);
      if (saved) {
        try {
          setCustomOptions(JSON.parse(saved));
        } catch (e) {
          console.error('[MultiSelect] Failed to parse custom options:', e);
        }
      }
    }
  }, [customStorageKey]);

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

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const removeOption = (e: React.MouseEvent, optionValue: string) => {
    e.stopPropagation();
    onChange(value.filter(v => v !== optionValue));
  };

  const hasExactMatch = allOptions.some(
    o => o.label.trim().toLowerCase() === search.trim().toLowerCase()
  );

  const handleAddCustom = () => {
    const trimmed = search.trim();
    if (!trimmed) return;
    const upper = trimmed.toUpperCase();

    if (!allOptions.some(o => o.value === upper)) {
      const newOpt = { value: upper, label: upper };
      const updatedCustom = [...customOptions, newOpt];
      setCustomOptions(updatedCustom);
      
      if (customStorageKey && typeof window !== 'undefined') {
        localStorage.setItem(customStorageKey, JSON.stringify(updatedCustom));
      }
      
      onChange([...value, upper]);
    } else {
      if (!value.includes(upper)) {
        onChange([...value, upper]);
      }
    }
    setSearch('');
  };

  return (
    <div className={cn("flex flex-col gap-1.5 relative", isOpen && "z-30")} ref={ref}>
      {label && (
        <label className="text-sm font-medium text-text-secondary">{label} {required && <span className="text-red-500">*</span>}</label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            'w-full min-h-[42px] flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-surface text-left',
            'transition-all duration-200 cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            disabled && 'opacity-50 cursor-not-allowed bg-surface-hover',
            error && 'border-danger',
            isOpen && 'ring-2 ring-primary/20 border-primary'
          )}
        >
          <div className="flex flex-wrap gap-1.5 items-center flex-1 pr-2">
            {value.length === 0 ? (
              <span className="text-sm text-text-tertiary pl-1">{placeholder}</span>
            ) : (
              value.map((val) => {
                const label = allOptions.find(o => o.value === val)?.label || val;
                return (
                  <span key={val} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-50 text-primary text-xs font-medium border border-primary/10">
                    {label}
                    <X size={12} className="cursor-pointer hover:text-primary-600 transition-colors" onClick={(e) => removeOption(e, val)} />
                  </span>
                )
              })
            )}
          </div>
          <ChevronDown
            size={16}
            className={cn(
              'text-text-tertiary transition-transform duration-200 flex-shrink-0',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 animate-dropdown overflow-hidden">
            {searchable && (
              <div className="p-2 border-b border-border">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-border focus:outline-none focus:border-primary bg-surface-hover"
                  autoFocus
                />
              </div>
            )}
            <div className="max-h-48 overflow-y-auto py-1">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-2 text-sm text-text-tertiary">No options found</div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = value.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleOption(option.value)}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-2 text-sm text-left cursor-pointer',
                        'hover:bg-primary-50 transition-colors duration-150',
                        isSelected && 'bg-primary-50 text-primary font-medium'
                      )}
                    >
                      {option.label}
                      {isSelected && <Check size={14} className="text-primary" />}
                    </button>
                  );
                })
              )}
              {allowAddCustom && search.trim() !== '' && !hasExactMatch && (
                <button
                  type="button"
                  onClick={handleAddCustom}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-primary hover:bg-primary-50 border-t border-border mt-1 flex items-center gap-1.5 cursor-pointer"
                >
                  + Add "{search.trim().toUpperCase()}"
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-danger mt-0.5">{error}</p>}
    </div>
  );
}
