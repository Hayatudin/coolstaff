'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Loader2, MoreVertical, CheckCircle, Trash2, Edit3, Eye, UserCheck } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { api } from '@/lib/api';
import Input from '@/components/ui/Input';
import { Candidate } from '@/types';

import { useCandidates } from '@/hooks/useCandidates';

export default function FitCandidatesPage() {
  const router = useRouter();
  const { candidates: allCandidates, isLoading, mutate } = useCandidates();
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [viewDoc, setViewDoc] = useState<string | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-action-menu]')) setOpenMenuId(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const candidates = allCandidates.filter(c => c.personalInfo.medicalStatus === 'Fit');

  const deleteCandidate = async (id: string) => {
    setOpenMenuId(null);
    if (!confirm('Are you sure you want to delete this candidate?')) return;
    try {
      const res = await api(`/api/candidates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      mutate(prev => prev.filter(c => c.id !== id));
    } catch { alert('Failed to delete candidate'); }
  };

  const filtered = candidates.filter(c => {
    const name = `${c.passportData.givenNames} ${c.passportData.surname}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || c.passportData.passportNumber.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-50"><UserCheck size={22} className="text-emerald-600" /></div>
          Fit Candidates
        </h1>
        <p className="text-text-secondary mt-1 ml-12">Candidates who are marked as Medically Fit</p>
      </div>

      <div className="w-full md:w-96">
        <Input placeholder="Search by name or passport..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      <div className="bg-surface rounded-[1.5rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-visible">
        <div className="overflow-visible">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fafaff] border-b border-border/50 text-[11px] uppercase tracking-[0.15em] font-bold text-text-tertiary">
                <th className="px-3 xl:px-6 py-3.5 font-semibold">Shelf ID</th>
                <th className="px-3 xl:px-6 py-3.5 font-semibold">Candidate</th>
                <th className="px-3 xl:px-6 py-3.5 font-semibold">Passport No.</th>
                <th className="px-3 xl:px-6 py-3.5 font-semibold">Medical</th>
                <th className="px-3 xl:px-6 py-3.5 font-semibold hidden xl:table-cell">Generated CVs</th>
                <th className="px-3 xl:px-6 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="px-3 xl:px-6 py-10 text-center"><div className="flex flex-col items-center gap-3"><Loader2 size={32} className="text-primary animate-spin" /><p className="text-text-tertiary">Loading...</p></div></td></tr>
              ) : filtered.length > 0 ? (
                filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 xl:px-6 py-3.5 whitespace-nowrap">
                      <div className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-mono font-bold inline-block border border-gray-200 shadow-sm">{c.shelfId || 'UNASSIGNED'}</div>
                    </td>
                    <td className="px-3 xl:px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2 xl:gap-3">
                        <div className="w-8 h-8 xl:w-10 xl:h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                          <span className="text-emerald-600 font-bold text-xs xl:text-sm">{c.passportData.givenNames.charAt(0)}{c.passportData.surname.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-text-primary text-xs xl:text-sm">{c.passportData.givenNames} {c.passportData.surname}</p>
                          <p className="text-[10px] xl:text-xs text-text-tertiary hidden xl:block">{c.personalInfo.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 xl:px-6 py-3.5 whitespace-nowrap">
                      <p className="text-xs xl:text-sm font-medium text-text-primary">{c.passportData.passportNumber}</p>
                    </td>
                    <td className="px-3 xl:px-6 py-3.5 whitespace-nowrap">
                      <Badge variant="success" className="text-[10px] xl:text-xs px-2 py-0.5 xl:py-1">Fit</Badge>
                    </td>
                    <td className="px-3 xl:px-6 py-3.5 whitespace-nowrap hidden xl:table-cell">
                      <div className="flex gap-2 flex-wrap max-w-[200px]">
                        {c.generatedCVs && c.generatedCVs.length > 0 ? (
                          c.generatedCVs.map((tmpl, idx) => {
                            const templateId = typeof tmpl === 'string' ? tmpl : tmpl?.templateId;
                            if (!templateId) return null;
                            return (
                              <span key={idx} className="px-2 py-0.5 text-[9px] xl:text-[10px] uppercase font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                                {templateId.replace('tmpl-', '').toUpperCase()}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-xs text-text-tertiary">No CVs</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 xl:px-6 py-3.5 whitespace-nowrap text-right text-xs xl:text-sm font-medium">
                      <div className="relative inline-block" data-action-menu>
                        <button onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)} className="text-text-tertiary hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-primary-50">
                          <MoreVertical size={16} />
                        </button>
                        {openMenuId === c.id && (
                          <div className="absolute right-0 top-full mt-1 w-52 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 animate-fade-in">
                            <button onClick={() => deleteCandidate(c.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors text-left text-red-600">
                              <Trash2 size={16} /><span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="px-3 xl:px-6 py-10 text-center text-text-tertiary">No fit candidates found. Mark candidates as &quot;Fit&quot; from the Candidates page.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
