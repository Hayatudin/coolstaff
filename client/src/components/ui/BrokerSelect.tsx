'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, FolderClosed, FolderOpen, User, Plus, Search } from 'lucide-react';
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
  const [expandedLeaders, setExpandedLeaders] = useState<Record<string, boolean>>({});
  const ref = useRef<HTMLDivElement>(null);

  // Group brokers by leader
  const { leaders, independentBrokers, leaderBrokersMap } = useMemo(() => {
    const leadersMap = new Map<string, { id: string; name: string }>();
    const brokersMap: Record<string, Broker[]> = {};
    const independents: Broker[] = [];

    brokers.forEach((b) => {
      if (b.leader) {
        leadersMap.set(b.leader.id, b.leader);
        if (!brokersMap[b.leader.id]) {
          brokersMap[b.leader.id] = [];
        }
        brokersMap[b.leader.id].push(b);
      } else {
        independents.push(b);
      }
    });

    const sortedLeaders = Array.from(leadersMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    // Sort brokers inside each group
    Object.keys(brokersMap).forEach((leaderId) => {
      brokersMap[leaderId].sort((a, b) => a.name.localeCompare(b.name));
    });

    independents.sort((a, b) => a.name.localeCompare(b.name));

    return {
      leaders: sortedLeaders,
      independentBrokers: independents,
      leaderBrokersMap: brokersMap,
    };
  }, [brokers]);

  // Find currently selected broker label
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

  // Filter leaders and brokers based on search query
  const filteredData = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return {
        leadersToShow: leaders,
        independentsToShow: independentBrokers,
        brokersMapToShow: leaderBrokersMap,
      };
    }

    const brokersMapToShow: Record<string, Broker[]> = {};
    const leadersToShow = leaders.filter((l) => {
      // Show leader if leader's name matches or any of its brokers match
      const leaderMatches = l.name.toLowerCase().includes(query);
      const matchingBrokers = (leaderBrokersMap[l.id] || []).filter((b) =>
        b.name.toLowerCase().includes(query)
      );

      if (leaderMatches || matchingBrokers.length > 0) {
        brokersMapToShow[l.id] = leaderBrokersMap[l.id] || [];
        return true;
      }
      return false;
    });

    const independentsToShow = independentBrokers.filter((b) =>
      b.name.toLowerCase().includes(query)
    );

    return {
      leadersToShow,
      independentsToShow,
      brokersMapToShow,
    };
  }, [search, leaders, independentBrokers, leaderBrokersMap]);

  const toggleLeader = (leaderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedLeaders((prev) => ({
      ...prev,
      [leaderId]: !prev[leaderId],
    }));
  };

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
                placeholder="Search leader or broker..."
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

              {/* Leaders and their brokers */}
              {filteredData.leadersToShow.map((leader) => {
                const isExpanded = search.trim() !== '' || !!expandedLeaders[leader.id];
                const leaderBrokers = filteredData.brokersMapToShow[leader.id] || [];

                return (
                  <div key={leader.id} className="space-y-0.5">
                    {/* Leader header */}
                    <div
                      onClick={(e) => toggleLeader(leader.id, e)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-text-primary hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <FolderOpen size={16} className="text-primary" />
                        ) : (
                          <FolderClosed size={16} className="text-text-tertiary" />
                        )}
                        <span>{leader.name}</span>
                      </div>
                      <ChevronDown
                        size={14}
                        className={cn('text-text-tertiary transition-transform', isExpanded && 'rotate-180')}
                      />
                    </div>

                    {/* Brokers under this leader */}
                    {isExpanded && (
                      <div className="pl-4 space-y-0.5 border-l-2 border-dashed border-gray-100 ml-5">
                        {leaderBrokers.length === 0 ? (
                          <div className="pl-4 py-1 text-xs text-text-tertiary">No brokers assigned</div>
                        ) : (
                          leaderBrokers.map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => handleSelectBroker(b.id)}
                              className={cn(
                                'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-primary-50 hover:text-primary rounded-lg transition-colors text-text-secondary',
                                value === b.id && 'bg-primary-50 text-primary font-bold'
                              )}
                            >
                              <User size={12} className="opacity-70" />
                              <span>{b.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Independent Brokers Header */}
              {filteredData.independentsToShow.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-bold text-text-tertiary uppercase tracking-wider bg-gray-50/50 rounded-md my-1">
                    Independent Brokers
                  </div>
                  {filteredData.independentsToShow.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleSelectBroker(b.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-primary-50 hover:text-primary rounded-lg transition-colors text-text-primary',
                        value === b.id && 'bg-primary-50 text-primary font-bold'
                      )}
                    >
                      <User size={14} />
                      <span>{b.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Empty state & create option */}
              {filteredData.leadersToShow.length === 0 &&
                filteredData.independentsToShow.length === 0 && (
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
              {search.trim() && onCreate && !exactMatchExists && (
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
