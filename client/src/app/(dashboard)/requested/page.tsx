'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Loader2, MoreVertical, CheckCircle, Trash2, Edit3, Eye, Search, Flag } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { api } from '@/lib/api';
import Input from '@/components/ui/Input';
import { Candidate } from '@/types';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

import { useCandidates } from '@/hooks/useCandidates';

export default function RequestedPage() {
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

  const candidates = allCandidates.filter(c => c.isRequested);

  const cancelVisa = async (id: string) => {
    setOpenMenuId(null);
    try {
      const res = await api(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          isRequested: false, 
          visaSelected: false, 
          visaOrContractNumber: null 
        }),
      });
      if (!res.ok) throw new Error();
      mutate(prev => prev.map(c => c.id === id ? { 
        ...c, 
        isRequested: false, 
        visaSelected: false, 
        visaOrContractNumber: null 
      } : c));
    } catch { alert('Failed to update status'); }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-50"><ClipboardList size={22} className="text-green-600" /></div>
            Requested Candidates
          </h1>
          <p className="text-text-secondary mt-1 ml-12">Candidates marked as requested — remove to unrequest</p>
        </div>

        {/* Generate Report Button */}
        <button
          onClick={() => alert('Generate Report layout configuration will be integrated in the next update!')}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-blue-600/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <ClipboardList size={18} />
          <span>Generate Report</span>
        </button>
      </div>

      <div className="w-full md:w-96">
        <Input placeholder="Search by name or passport..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      <div className="bg-surface rounded-[1.5rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-visible">
        <div className="overflow-visible">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fafaff] border-b border-border/50 text-[11px] uppercase tracking-[0.15em] font-bold text-text-tertiary">
                <th className="px-6 py-4 font-semibold">Shelf ID</th>
                <th className="px-6 py-4 font-semibold">Candidate</th>
                <th className="px-6 py-4 font-semibold">Passport No.</th>
                <th className="px-6 py-4 font-semibold">Selected Date</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Medical</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <TableSkeleton rows={8} cols={8} />
              ) : filtered.length > 0 ? (
                filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono font-bold inline-block border border-gray-200 shadow-sm">{c.shelfId || 'UNASSIGNED'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                          <span className="text-green-600 font-bold text-sm">{c.passportData.givenNames.charAt(0)}{c.passportData.surname.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-text-primary flex items-center gap-2">
                            {c.passportData.givenNames} {c.passportData.surname}
                            {c.isFlagged && <Flag size={14} className="text-red-500 fill-red-500" />}
                          </p>
                          <p className="text-xs text-text-tertiary">{c.personalInfo.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-text-primary">{c.passportData.passportNumber}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-text-primary font-semibold">
                        {c.visaDate 
                          ? new Date(c.visaDate).toLocaleDateString()
                          : c.registeredAt 
                            ? new Date(c.registeredAt).toLocaleDateString()
                            : 'Pending'}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="success">✓ Visa Selected</Badge>
                      {c.visaOrContractNumber && (
                        <p className="text-[10px] text-text-tertiary mt-1 max-w-[120px] truncate" title={c.visaOrContractNumber}>No: {c.visaOrContractNumber}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        c.personalInfo.medicalStatus === 'Fit' ? "bg-emerald-100 text-emerald-700" :
                        c.personalInfo.medicalStatus === 'Unfit' ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {c.personalInfo.medicalStatus || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative inline-block" data-action-menu>
                        <button onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)} className="text-text-tertiary hover:text-primary transition-colors p-2 rounded-lg hover:bg-primary-50">
                          <MoreVertical size={18} />
                        </button>
                        {openMenuId === c.id && (
                          <div className="absolute right-0 top-full mt-1 w-52 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 animate-fade-in">
                            <button onClick={() => router.push(`/invoice/new?candidateId=${c.id}`)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-primary-50 transition-colors text-left text-primary">
                              <CheckCircle size={16} />
                              <span>Proceed</span>
                            </button>
                            <div className="border-t border-border my-1" />
                            <button onClick={() => cancelVisa(c.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left">
                              <CheckCircle size={16} className="text-amber-500" />
                              <span>Cancelled</span>
                            </button>
                            <div className="border-t border-border my-1" />
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
                <tr><td colSpan={8} className="px-6 py-10 text-center text-text-tertiary">No Visa Selected candidates. Mark candidates as &quot;Visa Selected&quot; from the Candidates page.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Viewer */}
      {viewDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewDoc(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl max-h-[90vh] w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary">Document Preview</h3>
              <button onClick={() => setViewDoc(null)} className="text-text-tertiary hover:text-text-primary text-xl font-bold px-2">✕</button>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto max-h-[80vh]">
              {viewDoc.startsWith('data:image') || (viewDoc.startsWith('http') && !viewDoc.toLowerCase().endsWith('.pdf')) ? (
                <img src={viewDoc} alt="Document" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
              ) : viewDoc.startsWith('data:application/pdf') ? (
                <iframe src={viewDoc} className="w-full h-[70vh] rounded-lg" />
              ) : viewDoc.startsWith('http') && viewDoc.toLowerCase().endsWith('.pdf') ? (
                <div className="flex flex-col items-center w-full">
                  <img src={viewDoc.replace(/\.pdf$/i, '.jpg')} alt="Document Preview" className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-sm border border-border mb-3" />
                  <a href={viewDoc} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm font-medium flex items-center gap-2 bg-primary-50 px-4 py-2 rounded-lg">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    Open Original PDF
                  </a>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-text-tertiary mb-2">Cannot preview this document type.</p>
                  <a href={viewDoc} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open in new tab</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
