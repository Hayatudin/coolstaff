'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { FileText, Loader2, Search, CheckCircle2, Eye, Download, AlertCircle, FileCheck, Circle } from 'lucide-react';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

export default function InvoicePage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewDoc, setViewDoc] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const res = await api('/api/invoices', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch invoices');
      const data = await res.json();
      setInvoices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const toggleDelivered = async (invoiceId: string, currentStatus: boolean) => {
    setActionLoading(invoiceId);
    try {
      const res = await api(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDelivered: !currentStatus }),
      });
      if (!res.ok) throw new Error();
      
      setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, isDelivered: !currentStatus } : inv));
    } catch {
      alert('Failed to update delivery status');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = invoices.filter(inv => {
    const name = `${inv.candidate.givenNames} ${inv.candidate.surname}`.toLowerCase();
    const passport = inv.candidate.passportNumber.toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || passport.includes(query);
  });

  const hasAnyDelivered = invoices.some(inv => inv.isDelivered);

  const getFileUrl = (pathStr: string) => {
    if (!pathStr) return '';
    if (pathStr.startsWith('http')) return pathStr;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return `${backendUrl}${pathStr}`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-50">
              <FileCheck size={22} className="text-primary" />
            </div>
            Invoices Management
          </h1>
          <p className="text-text-secondary mt-1 ml-12">
            Candidates with generated invoices — mark as delivered to download
          </p>
        </div>

        {/* Download Invoice Button (Only appears if at least 1 candidate is delivered) */}
        {hasAnyDelivered && (
          <button
            onClick={() => alert('Download Invoice layout configuration will be integrated in the next update!')}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-green-600/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <Download size={18} />
            <span>Download Invoice</span>
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="w-full md:w-96">
        <Input
          placeholder="Search by name or passport..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Table Container */}
      <div className="bg-surface rounded-[1.5rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-visible">
        <div className="overflow-visible">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fafaff] border-b border-border/50 text-[11px] uppercase tracking-[0.15em] font-bold text-text-tertiary">
                <th className="px-6 py-4 font-semibold">Delivered</th>
                <th className="px-6 py-4 font-semibold">Candidate</th>
                <th className="px-6 py-4 font-semibold">Passport No.</th>
                <th className="px-6 py-4 font-semibold">Visa Date</th>
                <th className="px-6 py-4 font-semibold">Price</th>
                <th className="px-6 py-4 font-semibold text-center">LMIS QR Code</th>
                <th className="px-6 py-4 font-semibold text-center">Insurance</th>
                <th className="px-6 py-4 font-semibold text-center">Ticket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <TableSkeleton rows={6} cols={8} />
              ) : filtered.length > 0 ? (
                filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Delivery Status Selector */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleDelivered(inv.id, inv.isDelivered)}
                        disabled={actionLoading === inv.id}
                        className="p-1 rounded-full hover:bg-gray-100 transition-colors relative cursor-pointer group"
                      >
                        {actionLoading === inv.id ? (
                          <Loader2 size={20} className="text-primary animate-spin" />
                        ) : inv.isDelivered ? (
                          <CheckCircle2 size={20} className="text-green-600 fill-green-50 group-hover:scale-110 transition-transform" />
                        ) : (
                          <Circle size={20} className="text-text-tertiary group-hover:text-primary group-hover:scale-110 transition-all" />
                        )}
                      </button>
                    </td>

                    {/* Candidate Details */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                          <span className="text-primary font-bold text-sm">
                            {inv.candidate.givenNames.charAt(0)}
                            {inv.candidate.surname.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-text-primary">
                            {inv.candidate.givenNames} {inv.candidate.surname}
                          </p>
                          <p className="text-xs text-text-tertiary">{inv.candidate.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Passport Number */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-text-primary">{inv.candidate.passportNumber}</p>
                    </td>

                    {/* Visa Selected Date */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-text-secondary font-medium">
                        {new Date(inv.candidate.registeredAt).toLocaleDateString()}
                      </p>
                    </td>

                    {/* Invoice Price */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-200">
                        {inv.price}
                      </span>
                    </td>

                    {/* LMIS File Preview */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => setViewDoc(getFileUrl(inv.lmisQrCodeUrl))}
                        className="text-xs text-primary hover:underline font-semibold flex items-center justify-center gap-1 mx-auto"
                      >
                        <Eye size={14} /> View
                      </button>
                    </td>

                    {/* Insurance File Preview */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => setViewDoc(getFileUrl(inv.insuranceUrl))}
                        className="text-xs text-primary hover:underline font-semibold flex items-center justify-center gap-1 mx-auto"
                      >
                        <Eye size={14} /> View
                      </button>
                    </td>

                    {/* Ticket File Preview */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => setViewDoc(getFileUrl(inv.ticketUrl))}
                        className="text-xs text-primary hover:underline font-semibold flex items-center justify-center gap-1 mx-auto"
                      >
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-text-tertiary">
                    No candidates with generated invoices. Mark candidates as &quot;Visa Selected&quot; and click Proceed to create invoices.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {viewDoc && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setViewDoc(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-4xl max-h-[90vh] w-full overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border bg-gray-50">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                Document Preview
              </h3>
              <button
                onClick={() => setViewDoc(null)}
                className="text-text-tertiary hover:text-text-primary text-xl font-bold px-2 hover:bg-gray-100 rounded transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 p-4 flex items-center justify-center overflow-auto bg-gray-100 max-h-[80vh]">
              {viewDoc.toLowerCase().endsWith('.pdf') ? (
                <iframe src={viewDoc} className="w-full h-[70vh] rounded-lg border shadow-sm bg-white" />
              ) : viewDoc.match(/\.(jpg|jpeg|png|webp|gif)$/i) || viewDoc.startsWith('data:image') ? (
                <img src={viewDoc} alt="Document" className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md" />
              ) : (
                <div className="text-center p-8 bg-white rounded-2xl shadow border border-border">
                  <AlertCircle size={32} className="text-amber-500 mx-auto mb-2" />
                  <p className="text-text-secondary font-medium mb-4">Cannot direct preview this document type.</p>
                  <a
                    href={viewDoc}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-primary text-white font-bold px-5 py-2.5 rounded-xl shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm"
                  >
                    <Download size={16} />
                    Open in new tab
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
