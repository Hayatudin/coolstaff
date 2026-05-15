'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';
import { Candidate } from '@/types';

interface CandidateSelectorProps {
  candidates: Candidate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function CandidateSelector({ candidates, selectedId, onSelect }: CandidateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const selected = candidates.find(c => c.id === selectedId);

  const filtered = candidates.filter(c =>
    `${c.passportData.givenNames} ${c.passportData.surname} ${c.passportData.passportNumber}`
      .toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setIsOpen(false); setSearch(''); }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="text-sm font-medium text-text-secondary block mb-1.5">Select Candidate</label>
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className={cn('w-full flex items-center justify-between px-4 py-3 rounded-xl border bg-surface text-left transition-all duration-200 cursor-pointer',
          isOpen ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50')}>
        {selected ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold">
              {selected.passportData.givenNames[0]}{selected.passportData.surname[0]}
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">{selected.passportData.givenNames} {selected.passportData.surname}</p>
              <p className="text-xs text-text-tertiary">{selected.passportData.passportNumber} • {selected.passportData.nationality}</p>
            </div>
          </div>
        ) : <span className="text-sm text-text-tertiary">Choose a registered candidate...</span>}
        <ChevronDown size={16} className={cn('text-text-tertiary transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface border border-border rounded-xl shadow-xl z-50 animate-dropdown overflow-hidden">
          <div className="p-3 border-b border-border">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or passport..." autoFocus
              className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:border-primary bg-surface-hover" />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-text-tertiary text-center">No candidates found</p>
            ) : filtered.map(c => (
              <button key={c.id} type="button" onClick={() => { onSelect(c.id); setIsOpen(false); setSearch(''); }}
                className={cn('w-full flex items-center justify-between px-4 py-2.5 text-left cursor-pointer hover:bg-primary-50 transition-colors',
                  selectedId === c.id && 'bg-primary-50')}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-light to-accent flex items-center justify-center text-white text-xs font-bold">
                    {c.passportData.givenNames[0]}{c.passportData.surname[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{c.passportData.givenNames} {c.passportData.surname}</p>
                    <p className="text-xs text-text-tertiary">{c.passportData.passportNumber}</p>
                  </div>
                </div>
                {selectedId === c.id && <Check size={14} className="text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
