'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ClipboardList, Loader2, Download, Search, AlertCircle, FileText, MoreVertical, Receipt } from 'lucide-react';
import Input from '@/components/ui/Input';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { generateDeploymentsPdf } from '@/lib/deploymentsPdfGenerator';
import { cn } from '@/lib/utils';

export default function DeploymentsPage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const router = useRouter();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        (menuRef.current && menuRef.current.contains(target)) ||
        (dropdownRef.current && dropdownRef.current.contains(target))
      ) {
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const fetchDeployments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api('/api/deployments', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch deployments');
      const data = await res.json();
      setCandidates(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong while fetching deployments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, []);

  const handleExportPdf = () => {
    setIsExporting(true);
    try {
      generateDeploymentsPdf(filtered);
    } catch (err) {
      alert('Failed to export PDF');
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const filtered = candidates.filter(c => {
    const fullName = `${c.givenNames} ${c.surname}`.toLowerCase();
    const passport = c.passportNumber?.toLowerCase() || '';
    const broker = c.broker?.name?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || passport.includes(query) || broker.includes(query);
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-50">
              <ClipboardList size={22} className="text-primary" />
            </div>
            Candidate Deployments
          </h1>
          <p className="text-text-secondary mt-1 ml-12">
            Candidates who have ticket images and deployment dates issued
          </p>
        </div>

        {candidates.length > 0 && (
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-rose-600/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isExporting ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
            <span>Export to PDF</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex gap-3 max-w-2xl">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-[2rem] shadow-sm border border-border/30">
        <div className="w-full sm:w-80 relative">
          <Input
            placeholder="Search by name, passport, broker..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="text-xs text-text-tertiary font-bold uppercase tracking-wider">
          Showing {filtered.length} of {candidates.length} deployed candidates
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-surface rounded-[2rem] border border-border/30 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-border/30 text-[10px] uppercase tracking-wider font-bold text-text-tertiary/90">
                <th className="px-6 py-4 font-semibold">Candidate ID</th>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Passport No.</th>
                <th className="px-6 py-4 font-semibold">CV Template</th>
                <th className="px-6 py-4 font-semibold">Broker</th>
                <th className="px-6 py-4 font-semibold">Deployment Date</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={32} className="text-primary animate-spin" />
                      <p className="text-sm font-medium text-text-tertiary">Loading deployments...</p>
                    </div>
                  </td>
                </tr>
              ) : paginated.length > 0 ? (
                paginated.map(c => {
                  const depDate = c.deployedDate
                    ? new Date(c.deployedDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'N/A';

                  return (
                    <tr key={c.id} className="hover:bg-gray-50/30 transition-colors">
                      {/* Candidate ID */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-mono font-bold inline-block border border-gray-200 shadow-sm">
                          {c.id.substring(0, 8)}
                        </span>
                      </td>

                      {/* Candidate Name */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center border border-primary-100 shrink-0">
                            <span className="text-primary font-bold text-sm">
                              {c.givenNames.charAt(0)}
                              {c.surname.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-text-primary text-sm">
                              {c.givenNames} {c.surname}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Passport Number */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-text-primary">
                          {c.passportNumber}
                        </p>
                      </td>

                      {/* Generated CV template */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 text-[10px] uppercase font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg shadow-sm">
                          {c.generatedCVs?.[0]?.templateId?.toUpperCase() || 'N/A'}
                        </span>
                      </td>

                      {/* Broker */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-text-secondary font-semibold">
                          {c.broker?.name || 'DIRECT'}
                        </p>
                      </td>

                      {/* Deployment Date */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-text-primary font-semibold">
                          {depDate}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative inline-block" ref={openMenuId === c.id ? menuRef : null}>
                          <button
                            onClick={(e) => {
                              const isOpen = openMenuId === c.id;
                              if (isOpen) {
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
                                disabled={c.hasInvoice}
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setMenuCoords(null);
                                  router.push(`/invoice/new?candidateId=${c.id}`);
                                }}
                                className={cn(
                                  "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left font-semibold cursor-pointer",
                                  c.hasInvoice 
                                    ? "text-text-tertiary cursor-not-allowed opacity-60" 
                                    : "hover:bg-blue-50 text-blue-600"
                                )}
                              >
                                <Receipt size={16} />
                                <span>{c.hasInvoice ? 'Invoice Generated' : 'Proceed (Generate Invoice)'}</span>
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
                  <td colSpan={7} className="px-6 py-12 text-center text-text-tertiary text-sm">
                    No deployed candidates found. Make sure visa selected candidates have a saved invoice with ticket upload and deployment date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Component */}
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
                  className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all border cursor-pointer ${page === currentPage
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
    </div>
  );
}
