'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Loader2, MoreVertical, CheckCircle, Trash2, Edit3, Eye, Search, Flag, CalendarDays } from 'lucide-react';
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [deployDateModal, setDeployDateModal] = useState<{ candidateId: string; name: string; currentDate: string } | null>(null);
  const [deployDateValue, setDeployDateValue] = useState('');
  const [cancelVisaModalId, setCancelVisaModalId] = useState<string | null>(null);
  const [cancelVisaNumberInput, setCancelVisaNumberInput] = useState('');

  const handleGenerateReport = async () => {
    if (candidates.length === 0) {
      alert("No visa selected candidates to generate report.");
      return;
    }
    setIsGenerating(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Create element container
      const element = document.createElement('div');
      element.style.padding = '20px';
      element.style.fontFamily = 'Inter, system-ui, sans-serif';
      element.style.color = '#1e293b';
      element.style.backgroundColor = '#ffffff';

      // Header Banner - COOL STAFF
      const header = document.createElement('div');
      header.style.backgroundColor = '#2563eb';
      header.style.color = '#ffffff';
      header.style.textAlign = 'center';
      header.style.padding = '14px 20px';
      header.style.fontSize = '24px';
      header.style.fontWeight = '800';
      header.style.letterSpacing = '0.05em';
      header.style.borderRadius = '8px 8px 0 0';
      header.style.border = '2px solid #2563eb';
      header.innerText = 'COOL STAFF';
      element.appendChild(header);

      // Table container
      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.marginTop = '0px';
      table.style.border = '2px solid #cbd5e1';

      // Table Header Row
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      headerRow.style.backgroundColor = '#1b4332'; // Forest green
      headerRow.style.color = '#ffffff';
      headerRow.style.fontSize = '12px';
      headerRow.style.fontWeight = 'bold';
      headerRow.style.textAlign = 'left';

      const columns = ['NO', 'NAME', 'DATE', 'MEDICAL', 'COC', 'TICKET', 'AGENT'];
      columns.forEach((col) => {
        const th = document.createElement('th');
        th.style.padding = '12px 10px';
        th.style.border = '1px solid #cbd5e1';
        th.style.fontSize = '11px';
        th.style.fontWeight = '800';
        th.style.textTransform = 'uppercase';
        th.style.letterSpacing = '0.05em';
        if (col === 'NO' || col === 'DATE' || col === 'MEDICAL') {
          th.style.textAlign = 'center';
        } else {
          th.style.textAlign = 'left';
        }
        th.innerText = col;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Table Body
      const tbody = document.createElement('tbody');
      candidates.forEach((c, index) => {
        const row = document.createElement('tr');
        row.style.fontSize = '11px';
        row.style.borderBottom = '1px solid #cbd5e1';
        row.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';

        // 1. NO
        const tdNo = document.createElement('td');
        tdNo.style.padding = '10px';
        tdNo.style.border = '1px solid #cbd5e1';
        tdNo.style.textAlign = 'center';
        tdNo.style.fontWeight = '600';
        tdNo.style.color = '#475569';
        tdNo.innerText = String(index + 1);
        row.appendChild(tdNo);

        // 2. NAME (in uppercase)
        const tdName = document.createElement('td');
        tdName.style.padding = '10px';
        tdName.style.border = '1px solid #cbd5e1';
        tdName.style.fontWeight = '700';
        tdName.style.color = '#1e3a8a';
        
        const medStatus = (c.personalInfo.medicalStatus || 'Pending').toUpperCase();
        if (medStatus === 'FIT') {
          tdName.style.backgroundColor = '#ecfdf5';
        } else if (medStatus === 'UNFIT') {
          tdName.style.backgroundColor = '#fef2f2';
        } else {
          tdName.style.backgroundColor = '#fffbeb';
        }
        tdName.innerText = `${c.passportData.givenNames} ${c.passportData.surname}`.toUpperCase();
        row.appendChild(tdName);

        // 3. DATE
        const tdDate = document.createElement('td');
        tdDate.style.padding = '10px';
        tdDate.style.border = '1px solid #cbd5e1';
        tdDate.style.textAlign = 'center';
        tdDate.style.color = '#334155';
        tdDate.innerText = c.visaDate 
          ? new Date(c.visaDate).toLocaleDateString()
          : c.registeredAt 
            ? new Date(c.registeredAt).toLocaleDateString()
            : '—';
        row.appendChild(tdDate);

        // 4. MEDICAL
        const tdMedical = document.createElement('td');
        tdMedical.style.padding = '10px';
        tdMedical.style.border = '1px solid #cbd5e1';
        tdMedical.style.textAlign = 'center';
        tdMedical.style.fontWeight = '800';
        if (medStatus === 'FIT') {
          tdMedical.style.color = '#059669';
          tdMedical.innerText = 'FIT';
        } else if (medStatus === 'UNFIT') {
          tdMedical.style.color = '#dc2626';
          tdMedical.innerText = 'NO';
        } else {
          tdMedical.style.color = '#d97706';
          tdMedical.innerText = 'PROGRESS';
        }
        row.appendChild(tdMedical);

        // 5. COC
        const tdCoc = document.createElement('td');
        tdCoc.style.padding = '10px';
        tdCoc.style.border = '1px solid #cbd5e1';
        tdCoc.style.color = '#475569';
        tdCoc.innerText = c.cocDocumentUrl ? 'YES' : '—';
        row.appendChild(tdCoc);

        // 6. TICKET
        const tdTicket = document.createElement('td');
        tdTicket.style.padding = '10px';
        tdTicket.style.border = '1px solid #cbd5e1';
        tdTicket.style.color = '#475569';
        tdTicket.innerText = c.visaOrContractNumber || '—';
        row.appendChild(tdTicket);

        // 7. AGENT
        const tdAgent = document.createElement('td');
        tdAgent.style.padding = '10px';
        tdAgent.style.border = '1px solid #cbd5e1';
        tdAgent.style.fontWeight = '600';
        tdAgent.style.color = '#334155';
        tdAgent.innerText = c.broker?.name || '—';
        row.appendChild(tdAgent);

        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      element.appendChild(table);

      // Footer notice
      const footer = document.createElement('div');
      footer.style.textAlign = 'right';
      footer.style.fontSize = '9px';
      footer.style.color = '#94a3b8';
      footer.style.marginTop = '15px';
      footer.innerText = `Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} • Page 1 of 1`;
      element.appendChild(footer);

      const opt = {
        margin: 10,
        filename: `coolstaff-visa-selected-report-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      } as any;

      await html2pdf().from(element).set(opt).save();
    } catch (err) {
      console.error(err);
      alert("Failed to download PDF report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-action-menu]')) setOpenMenuId(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const candidates = allCandidates
    .filter(c => c.isRequested)
    .sort((a, b) => {
      const dateA = a.visaDate ? new Date(a.visaDate).getTime() : (a.registeredAt ? new Date(a.registeredAt).getTime() : 0);
      const dateB = b.visaDate ? new Date(b.visaDate).getTime() : (b.registeredAt ? new Date(b.registeredAt).getTime() : 0);
      return dateB - dateA;
    });

  const handleCancelVisaClick = (c: any) => {
    setOpenMenuId(null);
    if (c.isInvoiceDelivered) {
      alert("This candidate's invoice is already delivered. You cannot cancel the visa.");
      return;
    }
    if (c.hasInvoice) {
      alert("An invoice has already been generated for this candidate. You cannot cancel the visa.");
      return;
    }
    setCancelVisaModalId(c.id);
    setCancelVisaNumberInput('');
  };

  const cancelVisa = async (id: string) => {
    try {
      const res = await api(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          isRequested: false, 
          visaSelected: false, 
          visaOrContractNumber: null,
          status: 'pending'
        }),
      });
      if (!res.ok) throw new Error();
      mutate(prev => prev.map(cand => cand.id === id ? { 
        ...cand, 
        isRequested: false, 
        visaSelected: false, 
        visaOrContractNumber: null,
        status: 'pending'
      } : cand));
      setCancelVisaModalId(null);
      setCancelVisaNumberInput('');
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

  const openDeployDateModal = (c: Candidate) => {
    setOpenMenuId(null);
    const currentDate = c.deployedDate ? new Date(c.deployedDate).toISOString().split('T')[0] : '';
    setDeployDateValue(currentDate);
    setDeployDateModal({
      candidateId: c.id,
      name: `${c.passportData.givenNames} ${c.passportData.surname}`,
      currentDate,
    });
  };

  const saveDeployedDate = async () => {
    if (!deployDateModal) return;
    try {
      const res = await api(`/api/candidates/${deployDateModal.candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deployedDate: deployDateValue || null }),
      });
      if (!res.ok) throw new Error();
      mutate(prev => prev.map(cand => cand.id === deployDateModal.candidateId ? { ...cand, deployedDate: deployDateValue || null } : cand));
      setDeployDateModal(null);
    } catch {
      alert('Failed to save deployment date');
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const filtered = candidates.filter(c => {
    const name = `${c.passportData.givenNames} ${c.passportData.surname}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || c.passportData.passportNumber.toLowerCase().includes(searchQuery.toLowerCase());
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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
          disabled={isGenerating}
          onClick={handleGenerateReport}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 disabled:from-blue-400 disabled:to-indigo-400 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-blue-600/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:cursor-not-allowed shrink-0"
        >
          {isGenerating ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Generating PDF...</span>
            </>
          ) : (
            <>
              <ClipboardList size={18} />
              <span>Generate Report</span>
            </>
          )}
        </button>
      </div>

      <div className="w-full md:w-96">
        <Input placeholder="Search by name or passport..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      <div className="bg-surface rounded-[2rem] border border-border/30 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-border/30 text-[10px] uppercase tracking-wider font-bold text-text-tertiary/90">
                <th className="px-6 py-4 font-semibold">Shelf ID</th>
                <th className="px-6 py-4 font-semibold">Candidate</th>
                <th className="px-6 py-4 font-semibold">Passport No.</th>
                <th className="px-6 py-4 font-semibold hidden xl:table-cell">Selected Date</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Medical</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={32} className="text-primary animate-spin" />
                      <p className="text-sm font-medium text-text-tertiary">Loading candidates...</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                paginated.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-mono font-bold inline-block border border-gray-200 shadow-sm">{c.shelfId || 'UNASSIGNED'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0 border border-green-100">
                          <span className="text-green-600 font-bold text-sm">{c.passportData.givenNames.charAt(0)}{c.passportData.surname.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-text-primary text-sm flex items-center gap-1.5">
                            {c.passportData.givenNames} {c.passportData.surname}
                            {c.isFlagged && <Flag size={13} className="text-red-500 fill-red-500" />}
                          </p>
                          <p className="text-xs text-text-tertiary">{c.personalInfo.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                      {c.passportData.passportNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden xl:table-cell">
                      <p className="text-sm text-text-primary font-semibold">
                        {c.visaDate 
                          ? new Date(c.visaDate).toLocaleDateString()
                          : c.registeredAt 
                            ? new Date(c.registeredAt).toLocaleDateString()
                            : 'Pending'}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Visa Selected
                      </span>
                      {c.visaOrContractNumber && (
                        <p className="text-[10px] text-text-tertiary mt-1 max-w-[100px] truncate" title={c.visaOrContractNumber}>No: {c.visaOrContractNumber}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {c.personalInfo.medicalStatus === 'Fit' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Fit
                        </span>
                      ) : c.personalInfo.medicalStatus === 'Unfit' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          Unfit
                        </span>
                      ) : c.personalInfo.medicalStatus === 'New' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          New
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative inline-block" data-action-menu>
                        <button onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)} className="text-text-tertiary hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-gray-100">
                          <MoreVertical size={16} />
                        </button>
                        {openMenuId === c.id && (
                          <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-border rounded-xl shadow-xl z-50 py-1 animate-fade-in">
                            {c.hasInvoice ? (
                              <button disabled className="w-full flex items-center gap-3 px-4 py-2.5 text-sm bg-gray-50 text-left text-green-600 font-semibold cursor-not-allowed">
                                <CheckCircle size={16} />
                                <span>Invoice Generated</span>
                              </button>
                            ) : (
                              <button onClick={() => router.push(`/invoice/new?candidateId=${c.id}`)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-primary-50 transition-colors text-left text-primary font-semibold">
                                <CheckCircle size={16} />
                                <span>Proceed (Generate Invoice)</span>
                              </button>
                            )}
                            <div className="border-t border-border/60 my-1" />
                            <button onClick={() => handleCancelVisaClick(c)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left font-semibold">
                              <CheckCircle size={16} className="text-amber-500" />
                              <span>Cancel Visa Selected</span>
                            </button>
                            <div className="border-t border-border/60 my-1" />
                            <button onClick={() => deleteCandidate(c.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors text-left text-red-600 font-semibold">
                              <Trash2 size={16} /><span>Delete</span>
                            </button>
                            <div className="border-t border-border/60 my-1" />
                            <button onClick={() => openDeployDateModal(c)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors text-left text-blue-600 font-semibold">
                              <CalendarDays size={16} /><span>{c.deployedDate ? 'Edit' : 'Set'} Deployment Date</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-text-tertiary text-sm">No Visa Selected candidates. Mark candidates as &quot;Visa Selected&quot; from the Candidates page.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          {/* Prev arrow */}
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-text-secondary hover:bg-primary hover:text-white hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold"
          >
            ‹
          </button>

          {/* Page numbers */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
            if (page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1) {
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all border ${
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

          {/* Next arrow */}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-text-secondary hover:bg-primary hover:text-white hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold"
          >
            ›
          </button>
        </div>
      )}

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

      {/* Deployment Date Modal */}
      {deployDateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeployDateModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50">
                  <CalendarDays size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">Set Deployment Date</h3>
                  <p className="text-xs text-text-tertiary">{deployDateModal.name}</p>
                </div>
              </div>
              <button onClick={() => setDeployDateModal(null)} className="text-text-tertiary hover:text-text-primary text-xl font-bold px-2">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Deployment Date</label>
                <input
                  type="date"
                  value={deployDateValue}
                  onChange={e => setDeployDateValue(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeployDateModal(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-text-secondary hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                {deployDateModal.currentDate && (
                  <button
                    onClick={() => { setDeployDateValue(''); saveDeployedDate(); }}
                    className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors font-medium text-sm"
                  >
                    Remove
                  </button>
                )}
                <button
                  onClick={saveDeployedDate}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-bold text-sm hover:from-blue-700 hover:to-indigo-600 transition-all shadow-lg shadow-blue-600/20"
                >
                  Save Date
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Visa Modal */}
      {cancelVisaModalId && (() => {
        const candidate = allCandidates.find(c => c.id === cancelVisaModalId);
        const expectedVisa = candidate?.visaOrContractNumber || '';
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setCancelVisaModalId(null)}>
            <div className="bg-white rounded-[1.5rem] shadow-2xl max-w-md w-full overflow-hidden scale-in" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-border bg-gray-50">
                <h3 className="font-bold text-text-primary text-lg flex items-center gap-2">
                  <Flag className="text-red-500" size={20} /> Cancel Visa Selection
                </h3>
                <button onClick={() => setCancelVisaModalId(null)} className="text-text-tertiary hover:text-text-primary p-1 rounded-lg hover:bg-gray-200 transition-colors">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-text-secondary">
                  Are you sure you want to cancel the visa selection for <strong className="text-text-primary">{candidate ? `${candidate.passportData.givenNames} ${candidate.passportData.surname}` : 'this candidate'}</strong>?
                </p>
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">
                    Enter the Visa/Contract Number ({expectedVisa}) to confirm:
                  </label>
                  <Input 
                    autoFocus
                    placeholder="Enter Visa / Contract Number" 
                    value={cancelVisaNumberInput} 
                    onChange={(e) => setCancelVisaNumberInput(e.target.value)} 
                    className="w-full"
                  />
                </div>
              </div>
              <div className="p-5 border-t border-border flex justify-end gap-3 bg-gray-50">
                <button onClick={() => setCancelVisaModalId(null)} className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors">
                  Cancel
                </button>
                <button 
                  disabled={cancelVisaNumberInput.trim().toLowerCase() !== expectedVisa.toLowerCase()}
                  onClick={() => cancelVisa(cancelVisaModalId)}
                  className="px-6 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md hover:shadow-lg"
                >
                  Confirm Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
