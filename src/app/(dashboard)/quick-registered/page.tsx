'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ClipboardList, Search, Eye, Calendar, User } from 'lucide-react';

interface QuickReg {
  id: string;
  passportNumber: string;
  surname: string;
  givenNames: string;
  nationality: string | null;
  gender: string | null;
  jobExperience: string | null;
  createdAt: string;
}

export default function QuickRegisteredPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<QuickReg[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/quick-registrations');
        const data = await res.json();
        if (Array.isArray(data)) setRegistrations(data);
      } catch (err) {
        console.error('Failed to fetch quick registrations', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = registrations.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.givenNames?.toLowerCase().includes(q) ||
      r.surname?.toLowerCase().includes(q) ||
      r.passportNumber?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-50"><ClipboardList size={22} className="text-primary" /></div>
            Quick Registered
          </h1>
          <p className="text-text-secondary text-sm mt-1 sm:ml-12">Walk-in candidates registered for Musaned entry</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-xl border border-primary/10">
          <span className="text-2xl font-black text-primary leading-none">{filtered.length}</span>
          <span className="text-xs font-semibold text-primary">Registered</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or passport..."
          className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-border bg-white text-text-primary placeholder:text-text-tertiary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
        />
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-border/50 text-[11px] uppercase tracking-widest font-bold text-text-tertiary">
                <th className="px-4 sm:px-6 py-3 font-semibold">Candidate</th>
                <th className="px-4 sm:px-6 py-3 font-semibold hidden sm:table-cell">Passport No.</th>
                <th className="px-4 sm:px-6 py-3 font-semibold hidden md:table-cell">Nationality</th>
                <th className="px-4 sm:px-6 py-3 font-semibold hidden lg:table-cell">Experience</th>
                <th className="px-4 sm:px-6 py-3 font-semibold hidden sm:table-cell">Date</th>
                <th className="px-4 sm:px-6 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 size={28} className="animate-spin text-primary mx-auto mb-2" />
                    <p className="text-text-tertiary text-sm">Loading...</p>
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map(r => (
                  <tr
                    key={r.id}
                    className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                    onClick={() => router.push(`/quick-registration/preview/${r.id}`)}
                  >
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-primary font-bold text-xs">
                            {r.givenNames?.charAt(0)}{r.surname?.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-text-primary text-sm truncate">{r.givenNames} {r.surname}</p>
                          <p className="text-[11px] text-text-tertiary sm:hidden">{r.passportNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                      <span className="text-xs font-mono font-bold text-text-secondary bg-gray-100 px-2 py-1 rounded">{r.passportNumber}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-text-secondary hidden md:table-cell">{r.nationality || '—'}</td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-text-secondary hidden lg:table-cell truncate max-w-[200px]">{r.jobExperience || '—'}</td>
                    <td className="px-4 sm:px-6 py-4 text-xs text-text-tertiary hidden sm:table-cell">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <button className="p-2 rounded-lg hover:bg-primary/10 text-text-tertiary hover:text-primary transition-colors">
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <ClipboardList size={32} className="mx-auto text-text-tertiary/20 mb-3" />
                    <p className="font-bold text-text-primary text-sm">No registrations yet</p>
                    <p className="text-xs text-text-tertiary mt-1">Quick registrations will appear here</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
