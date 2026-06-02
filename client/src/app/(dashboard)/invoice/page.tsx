'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { FileText, Loader2, CheckCircle2, Eye, Download, AlertCircle, FileCheck, Circle, Edit3, Filter, Trash2 } from 'lucide-react';
import Input from '@/components/ui/Input';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { generateInvoicePdf } from '@/lib/invoicePdfGenerator';

const TEMPLATES: Record<string, { name: string; fullName: string }> = {
  'all': { name: 'ALL', fullName: '' },
  'ussus': { name: 'USSUS', fullName: 'USSUS ALENJAZ RECRUITMENT COMPANY' },
  'al-shablan': { name: 'AL-Shablan', fullName: 'AL-SHABLAN RECRUITMENT COMPANY' },
  'alm': { name: 'ALAALAM', fullName: 'ALEM RECRUITMENT AGENCY' },
  'ka7': { name: 'KAAFAAT', fullName: 'KAAFAAT ALAALAM RECRUITMENT COMPANY' },
  'ku2': { name: 'KHUZAM', fullName: 'KHUZAM  RECRUITMENT COMPANY' },
  'ma': { name: 'MA Standard', fullName: 'NAKHLAH RECRUITMENT COMPANY' },
  'ra': { name: 'RAYAAT', fullName: 'RAYAAT RECRUITMENT COMPANY' },
  'vision': { name: 'Vision Office', fullName: 'VISION RECRUITMENT OFFICE' }
};

export default function InvoicePage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewDoc, setViewDoc] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Template filter state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('all');

  // Download Invoice Modal states
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Edit Invoice States
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editLmisFile, setEditLmisFile] = useState<any | null>(null);
  const [editInsuranceFile, setEditInsuranceFile] = useState<any | null>(null);
  const [editTicketFile, setEditTicketFile] = useState<any | null>(null);
  const [editDeployedDate, setEditDeployedDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingInvoice) {
      setEditLmisFile(null);
      setEditInsuranceFile(null);
      setEditTicketFile(null);
      setEditDeployedDate(editingInvoice.deployedDate ? new Date(editingInvoice.deployedDate).toISOString().split('T')[0] : '');
    }
  }, [editingInvoice]);

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (value: any) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setter({
        name: file.name,
        base64: reader.result as string
      });
    };
    reader.readAsDataURL(file);
  };

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

      const updated = await res.json();

      setInvoices(prev => prev.map(inv =>
        inv.id === invoiceId
          ? { ...inv, isDelivered: updated.isDelivered, deployedDate: updated.deployedDate }
          : inv
      ));
    } catch {
      alert('Failed to update delivery status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    setActionLoading(invoiceId);
    try {
      const res = await api(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete invoice');
      }
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
    } catch (err: any) {
      alert(err.message || 'Something went wrong while deleting');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = invoices.filter(inv => {
    // 1. Filter by template
    if (selectedTemplateId !== 'all') {
      const cvs = inv.candidate?.generatedCVs || [];
      if (selectedTemplateId === 'other') {
        const hasStandardTemplate = cvs.some((cv: any) =>
          TEMPLATES[cv.templateId] && cv.templateId !== 'all' && cv.templateId !== 'other'
        );
        if (hasStandardTemplate) return false;
      } else {
        const hasTemplate = cvs.some((cv: any) =>
          cv.templateId.toLowerCase() === selectedTemplateId.toLowerCase()
        );
        if (!hasTemplate) return false;
      }
    }

    // 2. Filter by search query
    const name = `${inv.candidate.givenNames} ${inv.candidate.surname}`.toLowerCase();
    const passport = inv.candidate.passportNumber.toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || passport.includes(query);
  });

  const getFileUrl = (pathStr: string) => {
    if (!pathStr) return '';
    if (pathStr.startsWith('http')) return pathStr;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return `${backendUrl}${pathStr}`;
  };

  const handleDownloadInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim()) return;

    setIsGeneratingPdf(true);
    try {
      // Get delivered candidates in the current filtered list
      const deliveredInvoices = filtered.filter(inv => inv.isDelivered);

      if (deliveredInvoices.length === 0) {
        alert("No delivered candidates to include in the invoice.");
        return;
      }

      // Map to the format needed by the PDF generator
      const candidatesToInvoice = deliveredInvoices.map((inv, index) => {
        let priceNum = parseFloat(inv.price.replace(/[^0-9.]/g, ''));
        if (isNaN(priceNum)) priceNum = 0;

        let formattedDate = 'N/A';
        if (inv.deployedDate) {
          const d = new Date(inv.deployedDate);
          const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
          formattedDate = `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
        }

        return {
          name: `${inv.candidate.givenNames} ${inv.candidate.surname}`,
          passportNumber: inv.candidate.passportNumber,
          deployedDate: formattedDate,
          price: priceNum,
        };
      });

      const templateFullName = TEMPLATES[selectedTemplateId]?.fullName || '';

      await generateInvoicePdf(candidatesToInvoice, templateFullName, invoiceNumber);

      setShowDownloadModal(false);
      setInvoiceNumber('');
    } catch (err: any) {
      console.error(err);
      alert('Failed to generate PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Only show download button if a specific template is selected and there's at least one delivered candidate in this view
  const canDownload = selectedTemplateId !== 'all' && filtered.some(inv => inv.isDelivered);

  const allFilteredSelected = filtered.length > 0 && filtered.every(inv => inv.isDelivered);

  const handleSelectAllToggle = async () => {
    const targetStatus = !allFilteredSelected;
    const toUpdate = filtered.filter(inv => inv.isDelivered !== targetStatus);
    if (toUpdate.length === 0) return;

    setIsLoading(true);
    try {
      await Promise.all(
        toUpdate.map(async (inv) => {
          const res = await api(`/api/invoices/${inv.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isDelivered: targetStatus }),
          });
          if (!res.ok) throw new Error();
        })
      );
      await fetchInvoices();
    } catch (err) {
      alert('Failed to update some invoices. Make sure their candidate brokers are not locked.');
      await fetchInvoices();
    } finally {
      setIsLoading(false);
    }
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

        {/* Download Invoice Button */}
        {canDownload && (
          <button
            onClick={() => setShowDownloadModal(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-green-600/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <Download size={18} />
            <span>Download Invoice</span>
          </button>
        )}
      </div>

      {/* Template Tabs & Search */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-4 rounded-[1.5rem] shadow-sm border border-border/50">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 xl:pb-0 hide-scrollbar">
          <div className="flex items-center gap-2 mr-2 text-text-tertiary">
            <Filter size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Filter by CV:</span>
          </div>
          {Object.entries(TEMPLATES).map(([id, t]) => (
            <button
              key={id}
              onClick={() => setSelectedTemplateId(id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${selectedTemplateId === id
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                }`}
            >
              {t.name}
            </button>
          ))}
        </div>
        <div className="w-full xl:w-80 shrink-0">
          <Input
            placeholder="Search by name or passport..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-surface rounded-[1.5rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-visible">
        <div className="overflow-visible">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fafaff] border-b border-border/50 text-[11px] uppercase tracking-[0.15em] font-bold text-text-tertiary">
                <th className="px-2.5 xl:px-5 py-3.5 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleSelectAllToggle}
                      className="p-1 rounded-md hover:bg-gray-200 transition-colors inline-flex items-center justify-center cursor-pointer"
                      title={allFilteredSelected ? "Deselect All" : "Select All"}
                    >
                      {allFilteredSelected ? (
                        <CheckCircle2 size={16} className="text-green-600 fill-green-50" />
                      ) : (
                        <Circle size={16} className="text-text-tertiary" />
                      )}
                    </button>
                    <span>Delivered</span>
                  </div>
                </th>
                <th className="px-2.5 xl:px-5 py-3.5 font-semibold">Candidate</th>
                <th className="px-2.5 xl:px-5 py-3.5 font-semibold">Passport No.</th>
                <th className="px-2.5 xl:px-5 py-3.5 font-semibold hidden xl:table-cell">Visa Date</th>
                <th className="px-2.5 xl:px-5 py-3.5 font-semibold text-center">LMIS QR Code</th>
                <th className="px-2.5 xl:px-5 py-3.5 font-semibold text-center">Insurance</th>
                <th className="px-2.5 xl:px-5 py-3.5 font-semibold text-center">Ticket</th>
                <th className="px-2.5 xl:px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <TableSkeleton rows={6} cols={8} />
              ) : filtered.length > 0 ? (
                filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Delivery Status Selector */}
                    <td className="px-2.5 xl:px-5 py-3.5 whitespace-nowrap">
                      <button
                        onClick={() => toggleDelivered(inv.id, inv.isDelivered)}
                        disabled={actionLoading === inv.id}
                        className="p-1 rounded-full hover:bg-gray-100 transition-colors relative cursor-pointer group"
                      >
                        {actionLoading === inv.id ? (
                          <Loader2 size={18} className="text-primary animate-spin" />
                        ) : inv.isDelivered ? (
                          <CheckCircle2 size={18} className="text-green-600 fill-green-50 group-hover:scale-110 transition-transform" />
                        ) : (
                          <Circle size={18} className="text-text-tertiary group-hover:text-primary group-hover:scale-110 transition-all" />
                        )}
                      </button>
                    </td>

                    {/* Candidate Details */}
                    <td className="px-2.5 xl:px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2 xl:gap-3">
                        <div className="w-8 h-8 xl:w-10 xl:h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                          <span className="text-primary font-bold text-xs xl:text-sm">
                            {inv.candidate.givenNames.charAt(0)}
                            {inv.candidate.surname.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-text-primary text-xs xl:text-sm">
                            {inv.candidate.givenNames} {inv.candidate.surname}
                          </p>
                          <p className="text-[10px] xl:text-xs text-text-tertiary hidden xl:block">{inv.candidate.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Passport Number */}
                    <td className="px-2.5 xl:px-5 py-3.5 whitespace-nowrap">
                      <p className="text-xs xl:text-sm font-medium text-text-primary">{inv.candidate.passportNumber}</p>
                    </td>

                    {/* Visa Selected Date */}
                    <td className="px-2.5 xl:px-5 py-3.5 whitespace-nowrap hidden xl:table-cell">
                      <p className="text-xs xl:text-sm text-text-secondary font-medium">
                        {inv.candidate.visaDate
                          ? new Date(inv.candidate.visaDate).toLocaleDateString()
                          : new Date(inv.candidate.registeredAt).toLocaleDateString()}
                      </p>
                    </td>

                    {/* LMIS File Preview */}
                    <td className="px-2.5 xl:px-5 py-3.5 whitespace-nowrap text-center">
                      <button
                        onClick={() => setViewDoc(getFileUrl(inv.lmisQrCodeUrl))}
                        className="text-[10px] xl:text-xs text-primary hover:underline font-semibold flex items-center justify-center gap-1 mx-auto"
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>

                    {/* Insurance File Preview */}
                    <td className="px-2.5 xl:px-5 py-3.5 whitespace-nowrap text-center">
                      <button
                        onClick={() => setViewDoc(getFileUrl(inv.insuranceUrl))}
                        className="text-[10px] xl:text-xs text-primary hover:underline font-semibold flex items-center justify-center gap-1 mx-auto"
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>

                    {/* Ticket File Preview */}
                    <td className="px-2.5 xl:px-5 py-3.5 whitespace-nowrap text-center">
                      <button
                        onClick={() => setViewDoc(getFileUrl(inv.ticketUrl))}
                        className="text-[10px] xl:text-xs text-primary hover:underline font-semibold flex items-center justify-center gap-1 mx-auto"
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>

                    {/* Action Column */}
                    <td className="px-2.5 xl:px-5 py-3.5 whitespace-nowrap text-right text-xs xl:text-sm font-medium">
                      <div className="flex items-center justify-end gap-1 xl:gap-2">
                        <button
                          onClick={() => setEditingInvoice(inv)}
                          className="text-primary hover:text-primary-700 transition-colors p-1.5 rounded-lg hover:bg-primary-50 inline-flex items-center gap-1"
                        >
                          <Edit3 size={14} />
                          <span className="hidden xl:inline">Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(inv.id)}
                          disabled={actionLoading === inv.id}
                          className="text-red-500 hover:text-red-700 transition-colors p-1.5 rounded-lg hover:bg-red-50 inline-flex items-center gap-1"
                          title="Delete Invoice"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-2.5 xl:px-5 py-10 text-center text-text-tertiary">
                    No candidates found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Download Invoice Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDownloadModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-border bg-gray-50 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-xl text-green-600">
                <Download size={20} />
              </div>
              <h3 className="font-bold text-text-primary text-lg">Generate PDF</h3>
            </div>
            <form onSubmit={handleDownloadInvoice} className="p-5 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-text-secondary">Invoice Number</label>
                <Input
                  required
                  autoFocus
                  placeholder="e.g. KU0050"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value.toUpperCase())}
                />
              </div>
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl">
                <p className="text-xs text-blue-800 font-medium leading-relaxed">
                  Generating invoice for <strong>{filtered.filter(i => i.isDelivered).length}</strong> delivered candidates under <strong>{TEMPLATES[selectedTemplateId]?.name}</strong>.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDownloadModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingPdf || !invoiceNumber}
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all shadow-md text-sm flex items-center justify-center gap-2"
                >
                  {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  <span>Download</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* Edit Invoice Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-scale-in border border-white/10">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-gray-50/50">
              <h3 className="font-semibold text-text-primary flex items-center gap-2 text-lg">
                <Edit3 size={20} className="text-primary" />
                <span>Edit Invoice Details</span>
              </h3>
              <button
                onClick={() => setEditingInvoice(null)}
                className="text-text-tertiary hover:text-text-primary text-xl font-bold px-2 hover:bg-gray-100 rounded transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSaving(true);
                try {
                  const payload: any = {};
                  if (editLmisFile?.base64) payload.lmisQrCodeUrl = editLmisFile.base64;
                  if (editInsuranceFile?.base64) payload.insuranceUrl = editInsuranceFile.base64;
                  if (editTicketFile?.base64) payload.ticketUrl = editTicketFile.base64;
                  payload.deployedDate = editDeployedDate || null;

                  const res = await api(`/api/invoices/${editingInvoice.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                  });

                  if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Failed to update invoice');
                  }

                  const updatedInvoice = await res.json();

                  // Update the local list
                  setInvoices(prev => prev.map(inv => inv.id === editingInvoice.id ? {
                    ...inv,
                    lmisQrCodeUrl: updatedInvoice.lmisQrCodeUrl,
                    insuranceUrl: updatedInvoice.insuranceUrl,
                    ticketUrl: updatedInvoice.ticketUrl,
                    deployedDate: updatedInvoice.deployedDate,
                  } : inv));

                  setEditingInvoice(null);
                  alert('Invoice details updated successfully!');
                } catch (err: any) {
                  alert(err.message || 'Failed to save changes');
                } finally {
                  setIsSaving(false);
                }
              }}
              className="p-6 space-y-4 overflow-y-auto max-h-[75vh]"
            >
              {/* Candidate Info Card */}
              <div className="p-4 bg-gray-50 border border-border/60 rounded-xl">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold">Candidate</p>
                <h4 className="font-bold text-text-primary text-base mt-0.5">
                  {editingInvoice.candidate.givenNames} {editingInvoice.candidate.surname}
                </h4>
                <p className="text-xs text-text-secondary mt-0.5">Passport: {editingInvoice.candidate.passportNumber}</p>
              </div>

              {/* LMIS QR Code Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  LMIS QR Code (Leave empty to keep existing)
                </label>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleEditFileChange(e, setEditLmisFile)}
                    className="block w-full text-xs text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary hover:file:bg-primary-100"
                  />
                  {editLmisFile?.name && (
                    <span className="text-[11px] text-green-600 font-semibold">✓ Ready: {editLmisFile.name}</span>
                  )}
                </div>
              </div>

              {/* Insurance Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  Insurance (Leave empty to keep existing)
                </label>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleEditFileChange(e, setEditInsuranceFile)}
                    className="block w-full text-xs text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary hover:file:bg-primary-100"
                  />
                  {editInsuranceFile?.name && (
                    <span className="text-[11px] text-green-600 font-semibold">✓ Ready: {editInsuranceFile.name}</span>
                  )}
                </div>
              </div>

              {/* Ticket Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  Ticket (Leave empty to keep existing)
                </label>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleEditFileChange(e, setEditTicketFile)}
                    className="block w-full text-xs text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary hover:file:bg-primary-100"
                  />
                  {editTicketFile?.name && (
                    <span className="text-[11px] text-green-600 font-semibold">✓ Ready: {editTicketFile.name}</span>
                  )}
                </div>
              </div>

              {/* Deployment Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  Deployment Date
                </label>
                <input
                  type="date"
                  value={editDeployedDate}
                  onChange={(e) => setEditDeployedDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:outline-none focus:border-primary bg-surface-hover"
                />
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  disabled={isSaving}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 text-white font-bold rounded-xl transition-all shadow-md text-sm flex items-center justify-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
