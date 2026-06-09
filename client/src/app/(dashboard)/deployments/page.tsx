'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ClipboardList, Loader2, Download, Search, AlertCircle, FileText } from 'lucide-react';
import Input from '@/components/ui/Input';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { generateDeploymentsPdf } from '@/lib/deploymentsPdfGenerator';

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
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={32} className="text-primary animate-spin" />
                      <p className="text-sm font-medium text-text-tertiary">Loading deployments...</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map(c => {
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
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-tertiary text-sm">
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
