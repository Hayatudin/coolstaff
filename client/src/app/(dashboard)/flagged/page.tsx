'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Flag, Loader2, MoreVertical, Eye, Search, XCircle, RefreshCw } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { Candidate } from '@/types';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { cn } from '@/lib/utils';
import { useCandidates } from '@/hooks/useCandidates';

const getFileUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('http')) return path;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default function FlaggedCandidatesPage() {
  const router = useRouter();
  const { candidates: allCandidates, isLoading, mutate } = useCandidates();
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const [viewDoc, setViewDoc] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdownRef.current && dropdownRef.current.contains(target)) {
        return;
      }
      setOpenMenuId(null);
      setMenuCoords(null);
    };

    const handleScrollOrResize = () => {
      setOpenMenuId(null);
      setMenuCoords(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

  // Filter candidates who are flagged
  const flaggedCandidates = (allCandidates || [])
    .filter(c => c.isFlagged)
    .sort((a, b) => {
      const dateA = a.registeredAt ? new Date(a.registeredAt).getTime() : 0;
      const dateB = b.registeredAt ? new Date(b.registeredAt).getTime() : 0;
      return dateB - dateA;
    });

  // Search filter
  const filteredCandidates = flaggedCandidates.filter(c => {
    const nameStr = `${c.passportData?.givenNames || ''} ${c.passportData?.surname || ''}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return (
      nameStr.includes(query) ||
      (c.passportData?.passportNumber || '').toLowerCase().includes(query) ||
      (c.personalInfo?.idNumber || '').toLowerCase().includes(query)
    );
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredCandidates.length / ITEMS_PER_PAGE);
  const paginatedCandidates = filteredCandidates.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleUnflag = async (candidateId: string) => {
    setActionLoadingId(candidateId);
    setOpenMenuId(null);
    setMenuCoords(null);
    try {
      const res = await api(`/api/candidates/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFlagged: false }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to unflag candidate');
      }

      // Update useCandidates cache
      mutate((prev: any) => prev?.map((c: any) => c.id === candidateId ? { ...c, isFlagged: false } : c));
      window.dispatchEvent(new Event('app-refresh'));
    } catch (err: any) {
      alert(err.message || 'Error unflagging candidate');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="flex-1 bg-surface p-6 space-y-6 overflow-y-auto max-h-screen">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl border border-red-100">
              <Flag size={24} className="fill-red-500 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-text-primary">Flagged Candidates</h1>
              <p className="text-sm text-text-tertiary mt-0.5 font-medium">
                Manage and review candidates currently put on hold or flagged.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-tertiary">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search flagged candidates by name or passport..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
          />
        </div>
        <div className="text-xs font-semibold text-text-tertiary">
          Total Flagged: <span className="text-text-primary font-black bg-gray-100 px-2 py-1 rounded-md">{flaggedCandidates.length}</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-gray-50/50 text-text-secondary text-xs uppercase tracking-wider font-bold">
                <th className="px-6 py-4 font-semibold text-center w-16">No</th>
                <th className="px-6 py-4 font-semibold">Candidate Name</th>
                <th className="px-6 py-4 font-semibold">Passport Number</th>
                <th className="px-6 py-4 font-semibold">Religion</th>
                <th className="px-6 py-4 font-semibold text-center w-28">Face Photo</th>
                <th className="px-6 py-4 font-semibold text-center w-28">Full Body</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <TableSkeleton rows={5} cols={8} />
              ) : paginatedCandidates.length > 0 ? (
                paginatedCandidates.map((c, index) => {
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-text-tertiary text-center">
                        {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-bold text-text-primary uppercase flex items-center gap-1.5">
                            {c.passportData?.givenNames} {c.passportData?.surname}
                            <Flag size={12} className="text-red-500 fill-red-500 shrink-0" />
                          </div>
                          <div className="text-xs text-text-tertiary font-semibold mt-0.5">
                            ID: {c.personalInfo?.idNumber || '—'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-text-secondary uppercase">
                        {c.passportData?.passportNumber || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-secondary">
                        {c.personalInfo?.religion || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {c.facePhotoUrl ? (
                          <button
                            onClick={() => setViewDoc(getFileUrl(c.facePhotoUrl))}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-xl overflow-hidden border border-border/80 shadow-sm hover:border-primary/50 transition-all cursor-pointer"
                          >
                            <img src={getFileUrl(c.facePhotoUrl)} alt="Face" className="w-full h-full object-cover" />
                          </button>
                        ) : (
                          <span className="text-text-tertiary text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {c.fullBodyPhotoUrl ? (
                          <button
                            onClick={() => setViewDoc(getFileUrl(c.fullBodyPhotoUrl))}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-xl overflow-hidden border border-border/80 shadow-sm hover:border-primary/50 transition-all cursor-pointer"
                          >
                            <img src={getFileUrl(c.fullBodyPhotoUrl)} alt="Full Body" className="w-full h-full object-cover" />
                          </button>
                        ) : (
                          <span className="text-text-tertiary text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="danger" className="font-extrabold uppercase text-[10px]">
                          Flagged
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center" onClick={e => e.stopPropagation()}>
                          {actionLoadingId === c.id ? (
                            <Loader2 size={16} className="text-primary animate-spin" />
                          ) : (
                            <button
                              onClick={(e) => {
                                if (openMenuId === c.id) {
                                  setOpenMenuId(null);
                                  setMenuCoords(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setMenuCoords({
                                    top: rect.bottom + 4,
                                    left: Math.max(16, rect.right - 208)
                                  });
                                  setOpenMenuId(c.id);
                                }
                              }}
                              className="text-text-tertiary hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
                            >
                              <MoreVertical size={16} />
                            </button>
                          )}
                          {openMenuId === c.id && menuCoords && typeof window !== 'undefined' && createPortal(
                            <div
                              ref={dropdownRef}
                              className="fixed w-52 bg-white border border-border rounded-xl shadow-xl z-[9999] py-1 animate-fade-in text-left"
                              style={{
                                top: menuCoords.top,
                                left: menuCoords.left,
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setMenuCoords(null);
                                  router.push(`/candidates/${c.id}`);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left font-semibold text-text-primary cursor-pointer"
                              >
                                <Eye size={16} className="text-text-tertiary" />
                                <span>Preview Details</span>
                              </button>
                              <div className="border-t border-border/60 my-1" />
                              <button
                                onClick={() => handleUnflag(c.id)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors text-left text-red-600 font-semibold cursor-pointer"
                              >
                                <Flag size={16} className="text-red-500" />
                                <span>Unflag Candidate</span>
                              </button>
                            </div>,
                            document.body
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-text-tertiary text-sm font-semibold">
                    {searchQuery ? 'No matching flagged candidates found.' : 'No flagged candidates found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-text-secondary hover:bg-primary hover:text-white hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
            if (page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1) {
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all border cursor-pointer ${
                    page === currentPage
                      ? 'bg-primary text-white border-primary shadow-md'
                      : 'border-border text-text-secondary hover:bg-primary/10 hover:border-primary/30'
                  }`}
                >
                  {page}
                </button>
              );
            }
            if (page === currentPage - 2 || page === currentPage + 2) {
              return <span key={page} className="text-text-tertiary px-1 font-bold">…</span>;
            }
            return null;
          })}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-text-secondary hover:bg-primary hover:text-white hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
          >
            ›
          </button>
        </div>
      )}

      {/* Lightbox / Image Viewer */}
      {viewDoc && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setViewDoc(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl max-h-[90vh] w-full overflow-hidden cursor-default"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border bg-gray-50">
              <h3 className="font-bold text-text-primary">Photo Preview</h3>
              <button
                onClick={() => setViewDoc(null)}
                className="text-text-tertiary hover:text-text-primary text-xl font-bold p-1 hover:bg-gray-250/20 rounded-lg transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-6 flex items-center justify-center overflow-auto max-h-[80vh] bg-gray-900/5">
              <img src={viewDoc} alt="Preview" className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg border border-border/40" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
