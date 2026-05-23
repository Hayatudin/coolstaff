'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ClipboardList, Loader2, Download, Search, AlertCircle, FileSpreadsheet } from 'lucide-react';
import Input from '@/components/ui/Input';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

export default function DeploymentsPage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${backendUrl}/api/deployments/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) throw new Error('Failed to export Excel');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'candidate_deployments.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export Excel spreadsheet');
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
            onClick={handleExportExcel}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-emerald-600/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isExporting ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
            <span>Export to Excel</span>
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-[1.5rem] shadow-sm border border-border/50">
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
      <div className="bg-surface rounded-[1.5rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-visible">
        <div className="overflow-visible">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fafaff] border-b border-border/50 text-[11px] uppercase tracking-[0.15em] font-bold text-text-tertiary">
                <th className="px-4 xl:px-6 py-3.5 font-semibold">Candidate ID</th>
                <th className="px-4 xl:px-6 py-3.5 font-semibold">Name</th>
                <th className="px-4 xl:px-6 py-3.5 font-semibold">Passport No.</th>
                <th className="px-4 xl:px-6 py-3.5 font-semibold">CV Template</th>
                <th className="px-4 xl:px-6 py-3.5 font-semibold">Broker</th>
                <th className="px-4 xl:px-6 py-3.5 font-semibold">Deployment Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <TableSkeleton rows={5} cols={6} />
              ) : filtered.length > 0 ? (
                filtered.map(c => {
                  const invoice = c.invoices?.[0];
                  const depDate = invoice?.deployedDate
                    ? new Date(invoice.deployedDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'N/A';

                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Candidate ID */}
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-mono font-bold inline-block border border-gray-200 shadow-sm">
                          {c.id.substring(0, 8)}
                        </span>
                      </td>

                      {/* Candidate Name */}
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 xl:gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                            <span className="text-primary font-bold text-xs">
                              {c.givenNames.charAt(0)}
                              {c.surname.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-text-primary text-xs xl:text-sm">
                              {c.givenNames} {c.surname}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Passport Number */}
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                        <p className="text-xs xl:text-sm font-medium text-text-primary">
                          {c.passportNumber}
                        </p>
                      </td>

                      {/* Generated CV template */}
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 text-[9px] xl:text-[10px] uppercase font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                          {c.generatedCVs?.[0]?.templateId?.toUpperCase() || 'N/A'}
                        </span>
                      </td>

                      {/* Broker */}
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                        <p className="text-xs xl:text-sm text-text-secondary font-medium">
                          {c.broker?.name || 'DIRECT'}
                        </p>
                      </td>

                      {/* Deployment Date */}
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                        <p className="text-xs xl:text-sm text-text-primary font-semibold">
                          {depDate}
                        </p>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 xl:px-6 py-10 text-center text-text-tertiary">
                    No deployed candidates found. Make sure visa selected candidates have a saved invoice with ticket upload and deployment date.
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
