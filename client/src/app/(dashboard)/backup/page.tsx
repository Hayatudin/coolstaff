'use client';

import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FolderOpen, FileText, ChevronRight, ArrowLeft, Download,
  RefreshCw, Trash2, MoreVertical, LayoutTemplate, X, Check, AlertTriangle,
  FileDown, Image as ImageIcon, ChevronDown, PackageOpen, Lock, Eye, Search, Filter
} from 'lucide-react';
import { cn, getFileUrl } from '@/lib/utils';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';
import ALMTemplate from '@/components/cv/templates/ALMTemplate';
import KA7Template from '@/components/cv/templates/KA7Template';
import KU2Template from '@/components/cv/templates/KU2Template';
import MATemplate from '@/components/cv/templates/MATemplate';
import RATemplate from '@/components/cv/templates/RATemplate';
import AlShablanTemplate from '@/components/cv/templates/AlShablanTemplate';
import UssusTemplate from '@/components/cv/templates/UssusTemplate';
import VisionTemplate from '@/components/cv/templates/VisionTemplate';

const TEMPLATES = [
  { id: 'ussus', name: 'USSUS', category: 'Minimal', color: 'bg-cyan-500', textColor: 'text-cyan-600', bgLight: 'bg-cyan-50', component: UssusTemplate },
  { id: 'al-shablan', name: 'AL-Shablan', category: 'Classic', color: 'bg-yellow-500', textColor: 'text-yellow-600', bgLight: 'bg-yellow-50', component: AlShablanTemplate },
  { id: 'alm', name: 'ALAALAM', category: 'Classic', color: 'bg-blue-500', textColor: 'text-blue-600', bgLight: 'bg-blue-50', component: ALMTemplate },
  { id: 'ka7', name: 'KAAFAAT', category: 'Professional', color: 'bg-emerald-500', textColor: 'text-emerald-600', bgLight: 'bg-emerald-50', component: KA7Template },
  { id: 'ku2', name: 'KHUZAM', category: 'Minimal', color: 'bg-indigo-500', textColor: 'text-indigo-600', bgLight: 'bg-indigo-50', component: KU2Template },
  { id: 'ma', name: 'MA Standard', category: 'Modern', color: 'bg-orange-500', textColor: 'text-orange-600', bgLight: 'bg-orange-50', component: MATemplate },
  { id: 'ra', name: 'RAYAAT', category: 'Elegant', color: 'bg-purple-500', textColor: 'text-purple-600', bgLight: 'bg-purple-50', component: RATemplate },
  { id: 'vision', name: 'Vision Layout', category: 'Premium', color: 'bg-[#0a5c4e]', textColor: 'text-[#0a5c4e]', bgLight: 'bg-[#e8f5e9]', component: VisionTemplate },
];

// ── Action Dropdown — portal with fixed positioning so it escapes overflow:hidden ──
function ActionMenu({
  cvId,
  currentTemplateId,
  onRestore,
}: {
  cvId: string;
  currentTemplateId: string;
  onRestore: () => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  useLayoutEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY + 4, right: window.innerWidth - r.right });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const dropdown = open ? ReactDOM.createPortal(
    <div
      style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
      className="w-48 bg-white border border-border rounded-xl shadow-2xl overflow-hidden"
      onMouseDown={e => e.stopPropagation()}
    >
      <button onClick={() => { setOpen(false); onRestore(); }}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-text-primary hover:bg-surface transition-colors"
      >
        <RefreshCw size={14} className="text-amber-500" /> Restore from Backup
      </button>
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative">
      <button ref={btnRef} onClick={(e) => { e.stopPropagation(); setOpen(p => !p); }}
        className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors"
        title="Actions"
      >
        <MoreVertical size={16} />
      </button>
      {dropdown}
    </div>
  );
}

// ── Change-Template Modal ─────────────────────────────────────────────────────
function ChangeTemplateModal({
  cv,
  currentTemplateId,
  onDownload,
  onClose,
  isLoading,
}: {
  cv: any;
  currentTemplateId: string;
  onDownload: (newTemplateId: string, format: 'pdf' | 'jpg' | 'doc') => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [dlOpen, setDlOpen] = useState(false);
  const others = TEMPLATES.filter(t => t.id !== currentTemplateId);

  // Add Enter key trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && selected && !isLoading) {
        onDownload(selected, 'pdf');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, isLoading, onDownload]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Change Template</h2>
            <p className="text-sm text-text-secondary mt-0.5">
              Select a new template for <strong>{cv.candidate.passportData?.givenNames || cv.candidate.givenNames} {cv.candidate.passportData?.surname || cv.candidate.surname}</strong>
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface transition-colors text-text-tertiary hover:text-text-primary">
            <X size={20} />
          </button>
        </div>

        {/* Template grid with live previews */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {others.map(template => {
              const TC = template.component;
              const isSelected = selected === template.id;
              return (
                <button
                  key={template.id}
                  onClick={() => setSelected(template.id)}
                  className={cn(
                    'relative rounded-xl border-2 overflow-hidden transition-all text-left group cursor-pointer',
                    isSelected
                      ? 'border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                      : 'border-border hover:border-primary/40 hover:shadow-md'
                  )}
                >
                  <div className="h-44 bg-gray-100 overflow-hidden relative">
                    <div className="origin-top-left scale-[0.22] w-[800px] absolute top-0 left-0 pointer-events-none">
                      <TC
                        candidate={cv.candidate}
                        facePhoto={cv.facePhotoUrl || cv.candidate.facePhotoUrl || cv.candidate.passportImageUrl}
                        fullBodyPhoto={cv.fullBodyPhotoUrl || cv.candidate.fullBodyPhotoUrl}
                      />
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow z-10">
                        <Check size={12} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div className={cn('px-3 py-2 flex items-center gap-2', isSelected ? 'bg-primary/5' : 'bg-white')}>
                    <span className={cn('w-2 h-2 rounded-full shrink-0', template.color)} />
                    <span className="text-sm font-medium text-text-primary truncate">{template.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer — Download dropdown like CV Generator */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-gray-50/50">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface transition-colors border border-border">
            Cancel
          </button>

          <div className="relative">
            <div className={cn('flex rounded-xl overflow-hidden border', selected ? 'border-primary' : 'border-border opacity-50 pointer-events-none')}>
              {/* Main download button */}
              <button
                onClick={() => selected && onDownload(selected, 'pdf')}
                disabled={!selected || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isLoading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Download size={15} />}
                {isLoading ? 'Processing…' : 'Download PDF'}
              </button>
              {/* Dropdown arrow */}
              <button
                onClick={() => setDlOpen(p => !p)}
                disabled={!selected || isLoading}
                className="px-2 py-2 bg-primary/90 text-white border-l border-white/20 hover:bg-primary/80 transition-colors"
              >
                <ChevronDown size={14} className={cn('transition-transform', dlOpen && 'rotate-180')} />
              </button>
            </div>

            {/* Format dropdown */}
            {dlOpen && selected && (
              <div className="absolute right-0 bottom-full mb-2 w-44 bg-white border border-border rounded-xl shadow-xl overflow-hidden z-10">
                <button onClick={() => { setDlOpen(false); onDownload(selected, 'pdf'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-surface transition-colors">
                  <FileDown size={14} className="text-red-500" /> Download as PDF
                </button>
                <button onClick={() => { setDlOpen(false); onDownload(selected, 'jpg'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-surface transition-colors border-t border-border">
                  <ImageIcon size={14} className="text-emerald-500" /> Download as JPG
                </button>
                <button onClick={() => { setDlOpen(false); onDownload(selected, 'doc'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-surface transition-colors border-t border-border">
                  <FileText size={14} className="text-blue-500" /> Download as DOCX
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteModal({
  cv,
  onConfirm,
  onClose,
  isLoading,
}: {
  cv: any;
  onConfirm: () => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  // Add Enter key trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isLoading) {
        onConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, onConfirm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-text-primary mb-2">Delete Generated CV?</h2>
          <p className="text-sm text-text-secondary">
            This will permanently remove the generated CV record for{' '}
            <strong>{cv.candidate.passportData?.givenNames || cv.candidate.givenNames} {cv.candidate.passportData?.surname || cv.candidate.surname}</strong> from the database.
            This action cannot be undone.
          </p>
        </div>
        <div className="flex items-center gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:bg-surface transition-colors border border-border"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            {isLoading ? 'Deleting…' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BackupPage() {
  const router = useRouter();
  const [cvs, setCvs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [religionFilter, setReligionFilter] = useState<string>('');
  const [downloadAllOpen, setDownloadAllOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'locked' | 'visa-selected'>('all');
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  // Modals
  const [previewCv, setPreviewCv] = useState<any | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Download state
  const [downloadingCv, setDownloadingCv] = useState<any | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'jpg' | 'doc' | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const cvRenderRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchCVs = async () => {
    try {
      setIsLoading(true);
      const res = await api('/api/generated-cvs', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setCvs(data.filter((c: any) => 
        c.candidate.isRequested || 
        c.candidate.medicalStatus === 'Unfit' || 
        c.candidate.visaSelected ||
        c.candidate.isLocked === true ||
        c.candidate?.broker?.isLocked === true
      ));
    } catch {
      showToast('Failed to load CVs', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCVs(); }, []);

  // ── Restore ─────────────────────────────────────────────────────────────────
  const handleRestore = async (cv: any) => {
    setActionLoading(true);
    try {
      const res = await api(`/api/candidates/${cv.candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          isRequested: false, 
          visaSelected: false,
          visaOrContractNumber: null 
        }),
      });
      if (!res.ok) throw new Error('Failed to restore');
      
      // Remove from the local cvs array because they are no longer in backup
      setCvs(prev => prev.filter(c => c.candidateId !== cv.candidateId));
      showToast('Candidate restored to active CV folders');
    } catch {
      showToast('Failed to restore candidate', 'error');
    } finally {
      setActionLoading(false);
    }
  };



  // ── Inline Download ────────────────────────────────────────────────────────
  // Trigger download after downloadingCv state is set & hidden div is rendered
  useEffect(() => {
    if (!downloadingCv || !downloadFormat || !cvRenderRef.current) return;
    const el = cvRenderRef.current;
    let cancelled = false;

    (async () => {
      setIsDownloading(true);
      try {
        const htmlToImage = await import('html-to-image');
        const safeName = (downloadingCv.candidate.surname || 'CV').replace(/[^a-zA-Z0-9]/g, '');
        const fileName = `CV_${safeName}_${downloadingCv.templateId.toUpperCase()}`;

        const origH = el.style.height; const origO = el.style.overflow;
        el.style.height = 'auto'; el.style.overflow = 'visible';
        const dataUrl = await htmlToImage.toJpeg(el, { quality: 0.95, backgroundColor: '#ffffff', pixelRatio: 2 });
        el.style.height = origH; el.style.overflow = origO;

        if (cancelled) return;

        const downloadBlob = (blob: Blob, name: string) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none'; a.href = url; a.download = name;
          document.body.appendChild(a); a.click();
          setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 2000);
        };

        if (downloadFormat === 'doc') {
          const payload = {
            candidateId: downloadingCv.candidateId,
            templateId: `tmpl-${downloadingCv.templateId}`,
            format: 'doc',
            deadline: downloadingCv.candidate.cvDeadline || new Date().toISOString().split('T')[0],
            facePhoto: downloadingCv.facePhotoUrl || downloadingCv.candidate.facePhotoUrl || downloadingCv.candidate.passportImageUrl,
            fullBodyPhoto: downloadingCv.fullBodyPhotoUrl || downloadingCv.candidate.fullBodyPhotoUrl
          };

          const response = await api('/api/cv/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!response.ok) throw new Error('Failed to generate DOCX');

          const blob = await response.blob();
          downloadBlob(blob, `${fileName}.docx`);
          showToast('Editable DOCX Downloaded!');
        } else if (downloadFormat === 'jpg') {
          const res = await fetch(dataUrl);
          downloadBlob(await res.blob(), `${fileName}.jpg`);
          showToast('Downloaded as JPG');
        } else {
          const { jsPDF } = await import('jspdf');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfW = pdf.internal.pageSize.getWidth();
          const props = pdf.getImageProperties(dataUrl);
          const totalH = props.height / (props.width / pdfW);
          pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfW, totalH);
          if (totalH > pdf.internal.pageSize.getHeight() + 10) {
            pdf.addPage(); pdf.addImage(dataUrl, 'JPEG', 0, -297, pdfW, totalH);
          }
          downloadBlob(pdf.output('blob'), `${fileName}.pdf`);
          showToast('Downloaded as PDF');
        }
      } catch (e) {
        if (!cancelled) showToast('Download failed', 'error');
      } finally {
        if (!cancelled) { setIsDownloading(false); setDownloadingCv(null); setDownloadFormat(null); }
      }
    })();

    return () => { cancelled = true; };
  }, [downloadingCv, downloadFormat]);

  const startDownload = (cv: any, format: 'pdf' | 'jpg' | 'doc') => {
    setDownloadingCv(cv);
    setDownloadFormat(format);
  };

  // ── Shared search + status filter helper ──────────────────────────────────
  const matchesSearch = (cv: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = `${cv.candidate.passportData?.givenNames || cv.candidate.givenNames || ''} ${cv.candidate.passportData?.surname || cv.candidate.surname || ''}`.toLowerCase();
    const passport = (cv.candidate.passportData?.passportNumber || cv.candidate.passportNumber || '').toLowerCase();
    return name.includes(q) || passport.includes(q);
  };
  const matchesStatus = (cv: any) => {
    if (statusFilter === 'all') return true;
    const isLocked = cv.candidate.isLocked === true || cv.candidate?.broker?.isLocked === true;
    const isVisaSelected = cv.candidate.isRequested || cv.candidate.visaSelected;
    if (statusFilter === 'locked') return isLocked;
    if (statusFilter === 'visa-selected') return isVisaSelected;
    return true;
  };

  // ── Group by template ──────────────────────────────────────────────────────
  const folders = TEMPLATES.map(t => {
    const templateCVs = cvs.filter(c => c.templateId === t.id);
    const filteredCVs = templateCVs.filter(c => matchesSearch(c) && matchesStatus(c));
    return { ...t, cvs: filteredCVs, totalCvs: templateCVs.length };
  });

  // ── Folder View ───────────────────────────────────────────────────────────
  if (!selectedFolder) {
    return (
      <>
        <div className="space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary-50"><FolderOpen size={22} className="text-primary" /></div>
                  Backup CVs
                </h1>
                <p className="text-text-secondary mt-1 ml-12">CV templates for candidates with Visa Selected status</p>
              </div>
            </div>

            {/* Search & Status Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search by name or passport number…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Filter size={14} className="text-text-tertiary hidden sm:block" />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as 'all' | 'locked' | 'visa-selected')}
                  className="px-3 py-2.5 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer min-w-[160px]"
                >
                  <option value="all">All Statuses</option>
                  <option value="locked">🔒 Locked</option>
                  <option value="visa-selected">✅ Visa Selected</option>
                </select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
              {folders.map(folder => (
                <div
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className="bg-surface border border-border/50 rounded-[1.5rem] p-5 cursor-pointer shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group relative overflow-hidden"
                >
                  <div className={cn('absolute top-0 inset-x-0 h-1 rounded-t-2xl', folder.color)} />
                  <div className="flex items-start justify-between mb-4 pt-1">
                    <div className={cn('p-2.5 rounded-xl', folder.bgLight)}>
                      <FolderOpen size={22} className={folder.textColor} />
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-surface-hover border border-border text-text-secondary">
                      {folder.cvs.length}{folder.cvs.length !== folder.totalCvs ? `/${folder.totalCvs}` : ''}
                    </span>
                  </div>
                  <p className="font-bold text-text-primary mb-0.5">{folder.name}</p>
                  <p className="text-xs text-text-tertiary mb-4">{folder.category} layout</p>
                  <div className="flex -space-x-2">
                    {folder.cvs.slice(0, 4).map(cv => (
                      <div key={cv.id} className="w-7 h-7 rounded-full ring-2 ring-surface overflow-hidden bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500">
                        {(cv.facePhotoUrl || cv.candidate.facePhotoUrl || cv.candidate.passportImageUrl)
                          ? <img src={getFileUrl(cv.facePhotoUrl || cv.candidate.facePhotoUrl || cv.candidate.passportImageUrl)} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                          : (cv.candidate.passportData?.givenNames || cv.candidate.givenNames || '').charAt(0)}
                      </div>
                    ))}
                    {folder.cvs.length > 4 && (
                      <div className="w-7 h-7 rounded-full ring-2 ring-surface bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                        +{folder.cvs.length - 4}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-primary text-xs font-medium mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open <ChevronRight size={12} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </>
    );
  }

  // ── Folder Detail View ────────────────────────────────────────────────────
  const activeTemplate = TEMPLATES.find(t => t.id === selectedFolder)!;
  const allFolderCVs = cvs.filter(c => c.templateId === selectedFolder);
  const activeCVs = allFolderCVs.filter(cv => {
    // Religion filter
    if (religionFilter) {
      const rel = (cv.candidate.religion || '').toLowerCase();
      if (religionFilter === 'muslim' && rel !== 'muslim') return false;
      if (religionFilter === 'non-muslim' && (rel === 'muslim' || rel === '')) return false;
    }
    // Search + status filters
    if (!matchesSearch(cv)) return false;
    if (!matchesStatus(cv)) return false;
    return true;
  });
  const TC = activeTemplate.component;

  // ── Download All as ZIP ────────────────────────────────────────────────────
  // ── Download All as ZIP ────────────────────────────────────────────────────
  const handleDownloadAll = async (format: 'pdf' | 'jpg' | 'doc') => {
    if (activeCVs.length === 0) return;
    setIsDownloadingAll(true);
    setDownloadAllOpen(false);
    try {
      const candidateIds = activeCVs.map(c => c.candidateId).filter(Boolean);
      if (candidateIds.length === 0) return;

      showToast('Initializing bulk generation on server...');
      const initRes = await api('/api/cv/bulk-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateIds, format })
      });
      
      if (!initRes.ok) throw new Error('Failed to initialize bulk generation');
      const { jobId } = await initRes.json();

      let status = 'processing';
      while (status === 'processing' || status === 'pending') {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const statusRes = await api(`/api/cv/bulk-generate/status/${jobId}`);
        if (!statusRes.ok) throw new Error('Failed to fetch processing status');
        const progressData = await statusRes.json();
        
        status = progressData.status;
        if (status === 'failed') {
          throw new Error(progressData.error || 'Server-side bulk generation failed');
        }

        showToast(`Generating CVs: ${progressData.progress}/${progressData.total} (${Math.round((progressData.progress / progressData.total) * 100)}%)`);
      }

      showToast('Downloading ZIP archive...');
      const downloadRes = await api(`/api/cv/bulk-generate/download/${jobId}`);
      if (!downloadRes.ok) throw new Error('Failed to download ZIP file');
      const blob = await downloadRes.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTemplate.name.replace(/\s+/g, '_')}_CVs${religionFilter ? '_' + religionFilter : ''}.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 2000);
      showToast('Download complete!');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to download CVs', 'error');
    } finally {
      setIsDownloadingAll(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Breadcrumb + Actions */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => { setSelectedFolder(null); setReligionFilter(''); }} className="p-2 rounded-lg hover:bg-surface border border-border transition-colors text-text-secondary hover:text-text-primary">
                <ArrowLeft size={18} />
              </button>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-text-tertiary mb-0.5">
                  <span className="hover:text-primary cursor-pointer" onClick={() => { setSelectedFolder(null); setReligionFilter(''); }}>Folders</span>
                  <ChevronRight size={12} />
                  <span className="text-text-primary font-medium">{activeTemplate.name}</span>
                </div>
                <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                  {activeTemplate.name}
                  <span className={cn('text-sm font-semibold px-2 py-0.5 rounded-full', activeTemplate.bgLight, activeTemplate.textColor)}>
                    {activeCVs.length} CV{activeCVs.length !== 1 ? 's' : ''}
                  </span>
                </h1>
              </div>
            </div>

            {/* Right side: Religion filter + Download All */}
            <div className="flex items-center gap-3">
              {/* Religion Filter */}
              <div className="w-44">
                <select
                  value={religionFilter}
                  onChange={e => setReligionFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                >
                  <option value="">All Religions</option>
                  <option value="muslim">Muslim</option>
                  <option value="non-muslim">Non-Muslim</option>
                </select>
              </div>

              {/* Download All */}
              <div className="relative">
                <button
                  onClick={() => setDownloadAllOpen(p => !p)}
                  disabled={activeCVs.length === 0 || isDownloadingAll}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border',
                    activeCVs.length > 0
                      ? 'bg-primary text-white border-primary hover:bg-primary/90 shadow-md shadow-primary/20'
                      : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  )}
                >
                  {isDownloadingAll ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <PackageOpen size={16} />
                  )}
                  {isDownloadingAll ? 'Creating ZIP...' : `Download All (${activeCVs.length})`}
                  <ChevronDown size={14} className={cn('transition-transform', downloadAllOpen && 'rotate-180')} />
                </button>
                {downloadAllOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-border rounded-xl shadow-2xl overflow-hidden z-50">
                    <button
                      onClick={() => handleDownloadAll('pdf')}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-primary hover:bg-surface transition-colors whitespace-nowrap"
                    >
                      <FileDown size={14} className="text-red-500 shrink-0" /> All as PDF
                    </button>
                    <button
                      onClick={() => handleDownloadAll('jpg')}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-primary hover:bg-surface transition-colors border-t border-border whitespace-nowrap"
                    >
                      <ImageIcon size={14} className="text-emerald-500 shrink-0" /> All as JPG
                    </button>
                    <button
                      onClick={() => handleDownloadAll('doc')}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-primary hover:bg-surface transition-colors border-t border-border whitespace-nowrap"
                    >
                      <FileText size={14} className="text-blue-500 shrink-0" /> All as DOCX
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search & Status Filter Bar (inside folder detail) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search by name or passport number…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Filter size={14} className="text-text-tertiary hidden sm:block" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as 'all' | 'locked' | 'visa-selected')}
                className="px-3 py-2.5 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer min-w-[160px]"
              >
                <option value="all">All Statuses</option>
                <option value="locked">🔒 Locked</option>
                <option value="visa-selected">✅ Visa Selected</option>
              </select>
            </div>
          </div>
        </div>

        {activeCVs.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-border p-16 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
              <FileText size={28} className="text-gray-300" />
            </div>
            <h3 className="text-base font-semibold text-text-primary mb-1">{religionFilter ? 'No matching candidates' : 'This folder is empty'}</h3>
            <p className="text-sm text-text-tertiary mb-6 max-w-xs">{religionFilter ? `No ${religionFilter} candidates found in ${activeTemplate.name}.` : `No CVs generated with ${activeTemplate.name} yet.`}</p>
            {religionFilter ? (
              <Button onClick={() => setReligionFilter('')}>Clear Filter</Button>
            ) : (
              <Link href="/cv-generator"><Button>Generate a CV</Button></Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {activeCVs.map(cv => {
              const isLocked = cv.candidate.isLocked === true || cv.candidate?.broker?.isLocked === true;
              const isVisaSelected = cv.candidate.isRequested || cv.candidate.visaSelected;
              const isUnfit = cv.candidate.medicalStatus === 'Unfit';
              return (
              <div key={cv.id} className={cn(
                "bg-surface border rounded-[1.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden transition-all flex flex-col",
                isLocked ? "border-red-200 bg-red-50/5" : "border-border/50"
              )}>
                {/* Live Preview */}
                <div
                  className="relative h-56 bg-gray-100 overflow-hidden cursor-pointer group border-b border-border"
                  onClick={() => { setPreviewCv(cv); }}
                >
                  {/* Scaled live template render */}
                  <div className="origin-top-left scale-[0.22] w-[800px] absolute top-0 left-0 pointer-events-none">
                    <TC
                      candidate={cv.candidate}
                      facePhoto={getFileUrl(cv.facePhotoUrl || cv.candidate.facePhotoUrl || cv.candidate.passportImageUrl)}
                      fullBodyPhoto={getFileUrl(cv.fullBodyPhotoUrl || cv.candidate.fullBodyPhotoUrl)}
                    />
                  </div>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-900 rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg font-medium text-sm">
                      <Eye size={15} /> Preview
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full shrink-0 overflow-hidden border border-border bg-primary-50 text-primary flex items-center justify-center font-bold text-sm">
                        {(cv.facePhotoUrl || cv.candidate.facePhotoUrl || cv.candidate.passportImageUrl)
                          ? <img src={getFileUrl(cv.facePhotoUrl || cv.candidate.facePhotoUrl || cv.candidate.passportImageUrl)} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                          : (cv.candidate.passportData?.givenNames || cv.candidate.givenNames || '').charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">
                          {cv.candidate.passportData?.givenNames || cv.candidate.givenNames} {cv.candidate.passportData?.surname || cv.candidate.surname}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs text-text-tertiary">{cv.candidate.passportData?.passportNumber || cv.candidate.passportNumber}</p>
                          {isLocked && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                              <Lock size={8} /> Locked
                            </span>
                          )}
                          {isVisaSelected && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                              <Check size={8} /> Visa Selected
                            </span>
                          )}
                          {isUnfit && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                              <AlertTriangle size={8} /> Unfit
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isLocked ? (
                      <div 
                        className="p-1.5 text-red-500 bg-red-50 rounded-lg shrink-0 border border-red-100" 
                        title={cv.candidate.isLocked ? "Candidate is locked. Restore by unlocking candidate in Broker Candidates." : `Broker "${cv.candidate.broker?.name}" is locked. Restore by unlocking the broker.`}
                      >
                        <Lock size={14} />
                      </div>
                    ) : (
                      <ActionMenu
                        cvId={cv.id}
                        currentTemplateId={cv.templateId}
                        onRestore={() => handleRestore(cv)}
                      />
                    )}
                  </div>

                  <div className="mt-auto pt-3 border-t border-dashed border-border flex items-center justify-between">
                    <span className="text-xs text-text-tertiary">
                      {new Date(cv.createdAt).toLocaleDateString()}
                    </span>
                    {/* Format Picker */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { startDownload(cv, 'pdf'); }}
                        disabled={isDownloading}
                        className="text-xs font-medium text-primary flex items-center gap-1 hover:underline disabled:opacity-50 px-1.5 py-1 rounded hover:bg-primary/5"
                        title="Download as PDF"
                      >
                        <FileDown size={12} /> PDF
                      </button>
                      <span className="text-border">|</span>
                      <button
                        onClick={() => { startDownload(cv, 'jpg'); }}
                        disabled={isDownloading}
                        className="text-xs font-medium text-primary flex items-center gap-1 hover:underline disabled:opacity-50 px-1.5 py-1 rounded hover:bg-primary/5"
                        title="Download as JPG"
                      >
                        <ImageIcon size={12} /> JPG
                      </button>
                      <span className="text-border">|</span>
                      <button
                        onClick={() => { startDownload(cv, 'doc'); }}
                        disabled={isDownloading}
                        className="text-xs font-medium text-primary flex items-center gap-1 hover:underline disabled:opacity-50 px-1.5 py-1 rounded hover:bg-primary/5"
                        title="Download as DOCX"
                      >
                        <FileText size={12} /> DOCX
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        )}

        {/* Hidden full-resolution CV render for download capture */}
        {downloadingCv && (() => {
          const DlTemplate = TEMPLATES.find(t => t.id === downloadingCv.templateId)?.component || ALMTemplate;
          return (
            <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: 800, zIndex: -1 }}>
              <div ref={cvRenderRef}>
                <DlTemplate
                  candidate={downloadingCv.candidate}
                  facePhoto={getFileUrl(downloadingCv.facePhotoUrl || downloadingCv.candidate.facePhotoUrl || downloadingCv.candidate.passportImageUrl)}
                  fullBodyPhoto={getFileUrl(downloadingCv.fullBodyPhotoUrl || downloadingCv.candidate.fullBodyPhotoUrl)}
                />
              </div>
            </div>
          );
        })()}
      </div>

      {/* Preview Modal */}
      {previewCv && (() => {
        const PrevTemplate = TEMPLATES.find(t => t.id === previewCv.templateId)?.component || ALMTemplate;
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewCv(null)}>
            <div className="relative bg-white rounded-2xl overflow-y-auto max-h-[95vh] p-8 max-w-4xl shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
              <button onClick={() => setPreviewCv(null)} className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black transition-colors backdrop-blur-md">
                ✕
              </button>
              <div className="w-[800px]">
                <PrevTemplate
                  candidate={previewCv.candidate}
                  facePhoto={getFileUrl(previewCv.facePhotoUrl || previewCv.candidate.facePhotoUrl || previewCv.candidate.passportImageUrl)}
                  fullBodyPhoto={getFileUrl(previewCv.fullBodyPhotoUrl || previewCv.candidate.fullBodyPhotoUrl)}
                />
              </div>
            </div>
          </div>
        );
      })()}

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div className="fixed bottom-6 right-6 z-[60] animate-in fade-in slide-in-from-bottom-3">
      <div className={cn(
        'flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium',
        type === 'success' ? 'bg-gray-900' : 'bg-red-600'
      )}>
        {type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
        {msg}
      </div>
    </div>
  );
}
