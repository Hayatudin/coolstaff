'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
  required?: boolean;
  onCreate?: (value: string) => void;
}

export default function Select({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  error,
  disabled = false,
  searchable = false,
  required = false,
  onCreate,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  const filteredOptions = searchable
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

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

  return (
    <div className={cn("flex flex-col gap-1.5 relative", isOpen && "z-50")} ref={ref}>
      {label && (
        <label className="text-sm font-medium text-text-secondary">{label}</label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            'w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-border bg-surface text-left',
            'transition-all duration-200 cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            disabled && 'opacity-50 cursor-not-allowed bg-surface-hover',
            error && 'border-danger',
            isOpen && 'ring-2 ring-primary/20 border-primary'
          )}
        >
          <span className={cn(
            'text-sm truncate',
            selectedOption ? 'text-text-primary' : 'text-text-tertiary'
          )}>
            {selectedOption?.label || placeholder}
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
                <div className="px-4 py-2 text-sm text-text-tertiary">
                  {search && onCreate ? (
                    <button
                      type="button"
                      onClick={() => {
                        onCreate(search);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className="text-primary hover:underline font-medium text-left w-full"
                    >
                      + Add "{search}"
                    </button>
                  ) : (
                    "No options found"
                  )}
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-2 text-sm text-left cursor-pointer',
                      'hover:bg-primary-50 transition-colors duration-150',
                      value === option.value && 'bg-primary-50 text-primary font-medium'
                    )}
                  >
                    {option.label}
                    {value === option.value && <Check size={14} className="text-primary" />}
                  </button>
                ))
              )}
              {filteredOptions.length > 0 && search && onCreate && !options.some(o => o.label.toLowerCase() === search.toLowerCase()) && (
                <button
                  type="button"
                  onClick={() => {
                    onCreate(search);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm text-left cursor-pointer hover:bg-primary-50 transition-colors duration-150 text-primary font-medium border-t border-border mt-1 pt-2"
                >
                  + Add "{search}"
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
