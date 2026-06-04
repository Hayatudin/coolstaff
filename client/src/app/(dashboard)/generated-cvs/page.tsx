'use client';

import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FolderOpen, FileText, ChevronRight, ArrowLeft, Download,
  RefreshCw, Trash2, MoreVertical, LayoutTemplate, X, Check, AlertTriangle,
  FileDown, Image as ImageIcon, ChevronDown, PackageOpen, Flag, Eye, Search, Lock
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
import { clearCandidatesCache } from '@/hooks/useCandidates';

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
  currentTemplateId,
  onDelete,
  onChangeTemplate,
  isFlagged,
  onToggleFlag,
}: {
  cvId: string;
  currentTemplateId: string;
  onDelete: () => void;
  onChangeTemplate: () => void;
  isFlagged: boolean;
  onToggleFlag: () => void;
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
      <button onClick={() => { setOpen(false); onChangeTemplate(); }}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-text-primary hover:bg-surface transition-colors"
      >
        <LayoutTemplate size={14} className="text-primary" /> Change Template
      </button>
      <button onClick={() => { setOpen(false); onToggleFlag(); }}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-text-primary hover:bg-red-50 transition-colors"
      >
        <Flag size={14} className={isFlagged ? "text-red-500 fill-red-500" : "text-text-tertiary"} /> 
        {isFlagged ? 'Unflag Candidate' : 'Flag Candidate'}
      </button>
      <div className="border-t border-border" />
      <button onClick={() => { setOpen(false); onDelete(); }}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
      >
        <Trash2 size={14} /> Delete CV
      </button>
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative">
      <button ref={btnRef} onClick={(e) => { e.stopPropagation(); setOpen(p => !p); }}
        onMouseDown={(e) => e.stopPropagation()}
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
  onChange,
  onClose,
  isLoading,
}: {
  cv: any;
  currentTemplateId: string;
  onChange: (newTemplateId: string) => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const others = TEMPLATES.filter(t => t.id !== currentTemplateId);

  // Add Enter key trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && selected && !isLoading) {
        onChange(selected);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, isLoading, onChange]);

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
              Select a new template for <strong>{cv.candidate.passportData?.givenNames} {cv.candidate.passportData?.surname}</strong>
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
                        facePhoto={getFileUrl(cv.facePhotoUrl || cv.candidate.facePhotoUrl || cv.candidate.passportImageUrl)}
                        fullBodyPhoto={getFileUrl(cv.fullBodyPhotoUrl || cv.candidate.fullBodyPhotoUrl)}
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

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-gray-50/50">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface transition-colors border border-border">
            Cancel
          </button>
          <button
            onClick={() => selected && onChange(selected)}
            disabled={!selected || isLoading}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 rounded-xl"
          >
            {isLoading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <LayoutTemplate size={15} />}
            {isLoading ? 'Changing…' : 'Change Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteModal({
  cv,
  bulkCount,
  onConfirm,
  onClose,
  isLoading,
}: {
  cv?: any;
  bulkCount?: number;
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
          <h2 className="text-lg font-bold text-text-primary mb-2">
            {bulkCount ? `Delete ${bulkCount} Generated CVs?` : 'Delete Generated CV?'}
          </h2>
          <p className="text-sm text-text-secondary">
            {bulkCount ? (
              <>This will permanently remove <strong>{bulkCount} selected CVs</strong> from the database.</>
            ) : (
              <>This will permanently remove the generated CV record for <strong>{cv?.candidate.givenNames} {cv?.candidate.surname}</strong> from the database.</>
            )}
            <br/>This action cannot be undone.
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

// ── Main Content ──────────────────────────────────────────────────────────────
function GeneratedCVsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cvs, setCvs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [religionFilter, setReligionFilter] = useState<string>('');
  const [flagFilter, setFlagFilter] = useState<'all' | 'flagged' | 'unflagged'>('all');
  const [minAgeFilter, setMinAgeFilter] = useState<string>('');
  const [maxAgeFilter, setMaxAgeFilter] = useState<string>('');
  const [downloadAllOpen, setDownloadAllOpen] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [previewCv, setPreviewCv] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const folder = searchParams.get('folder');
    const search = searchParams.get('search');
    if (folder) setSelectedFolder(folder);
    if (search) setSearchQuery(search);
  }, [searchParams]);

  // Modals
  const [changeTarget, setChangeTarget] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Bulk select
  const [selectedCVIds, setSelectedCVIds] = useState<Set<string>>(new Set());
  const [bulkChangeOpen, setBulkChangeOpen] = useState(false);

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
        !c.candidate.isRequested && 
        c.candidate.medicalStatus !== 'Unfit' && 
        !c.candidate.visaSelected
      ));
      setSelectedCVIds(new Set()); // clear selection on refresh
    } catch {
      showToast('Failed to load CVs', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCVs(); }, []);

  useEffect(() => {
    setSelectedCVIds(new Set());
  }, [selectedFolder]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    
    if (deleteTarget === 'bulk') {
      try {
        const ids = Array.from(selectedCVIds);
        for (const id of ids) {
          await api(`/api/generated-cvs/${id}`, { method: 'DELETE' });
        }
        setCvs(prev => prev.filter(c => !selectedCVIds.has(c.id)));
        setSelectedCVIds(new Set());
        showToast(`Deleted ${ids.length} CVs successfully`);
      } catch (err) {
        showToast('Failed to delete some CVs', 'error');
      } finally {
        setActionLoading(false);
        setDeleteTarget(null);
      }
    } else {
      try {
        const res = await api(`/api/generated-cvs/${deleteTarget.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed');
        setCvs(prev => prev.filter(c => c.id !== deleteTarget.id));
        showToast('CV record deleted successfully');
      } catch {
        showToast('Failed to delete CV record', 'error');
      } finally {
        setActionLoading(false);
        setDeleteTarget(null);
      }
    }
  };

  // ── Change Template ────────────────────────────────────────────────────────
  // Drag selection
  const [isDragging, setIsDragging] = useState(false);
  const [dragAction, setDragAction] = useState<'select' | 'deselect' | null>(null);

  useEffect(() => {
    const handleMouseUp = () => { setIsDragging(false); setDragAction(null); };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleCardMouseDown = (cvId: string, currentSelected: boolean) => {
    setIsDragging(true);
    const action = currentSelected ? 'deselect' : 'select';
    setDragAction(action);
    setSelectedCVIds(prev => {
      const next = new Set(prev);
      if (action === 'select') next.add(cvId); else next.delete(cvId);
      return next;
    });
  };

  const handleCardMouseEnter = (cvId: string) => {
    if (!isDragging || !dragAction) return;
    setSelectedCVIds(prev => {
      const next = new Set(prev);
      if (dragAction === 'select') next.add(cvId); else next.delete(cvId);
      return next;
    });
  };

  const handleConfirmChange = async (newTemplateId: string) => {
    if (!changeTarget) return;
    setActionLoading(true);
    try {
      const res = await api(`/api/generated-cvs/${changeTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: newTemplateId }),
      });
      
      if (res.status === 409) {
        showToast('Candidate already generated in that template', 'error');
        setChangeTarget(null);
        return;
      }
      
      if (!res.ok) throw new Error('Failed');
      const newTemplateName = TEMPLATES.find(t => t.id === newTemplateId)?.name;
      setCvs(prev => prev.map(c => c.id === changeTarget.id ? { ...c, templateId: newTemplateId } : c));
      showToast(`Moved to "${newTemplateName}" folder`);
      setChangeTarget(null);
      setSelectedFolder(newTemplateId); // jump to new folder
    } catch {
      showToast('Failed to change template', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Bulk Change Template ───────────────────────────────────────────────────
  const handleBulkChangeTemplate = async (newTemplateId: string) => {
    if (selectedCVIds.size === 0) return;
    setActionLoading(true);
    setBulkChangeOpen(false);
    const ids = Array.from(selectedCVIds);
    let successCount = 0;
    for (const id of ids) {
      try {
        const res = await api(`/api/generated-cvs/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId: newTemplateId }),
        });
        if (res.ok) {
          successCount++;
          setCvs(prev => prev.map(c => c.id === id ? { ...c, templateId: newTemplateId } : c));
        }
      } catch { /* continue */ }
    }
    setSelectedCVIds(new Set());
    setActionLoading(false);
    const newTemplateName = TEMPLATES.find(t => t.id === newTemplateId)?.name;
    showToast(`${successCount} CV${successCount !== 1 ? 's' : ''} moved to "${newTemplateName}"`);
    setSelectedFolder(newTemplateId);
  };



  const handleBulkDelete = () => {
    if (selectedCVIds.size === 0) return;
    setDeleteTarget('bulk');
  };

  // ── Toggle Flag ────────────────────────────────────────────────────────────
  const toggleFlag = async (cvId: string, candidateId: string, currentFlagStatus: boolean) => {
    try {
      const res = await api(`/api/candidates/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFlagged: !currentFlagStatus }),
      });
      if (!res.ok) throw new Error('Failed');
      
      // Clear global candidates cache so the Candidates page will refetch
      clearCandidatesCache();
      
      // Update local state by finding all CVs with this candidateId and toggling them
      setCvs(prev => prev.map(c => 
        c.candidateId === candidateId 
          ? { ...c, candidate: { ...c.candidate, isFlagged: !currentFlagStatus } } 
          : c
      ));
      showToast(currentFlagStatus ? 'Candidate Unflagged' : 'Candidate Flagged');
    } catch {
      showToast('Failed to update flag status', 'error');
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
        const dataUrl = await htmlToImage.toJpeg(el, { 
          quality: 0.95, 
          backgroundColor: '#ffffff', 
          pixelRatio: 2,
          imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        });
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
            facePhoto: getFileUrl(downloadingCv.facePhotoUrl || downloadingCv.candidate.facePhotoUrl || downloadingCv.candidate.passportImageUrl),
            fullBodyPhoto: getFileUrl(downloadingCv.fullBodyPhotoUrl || downloadingCv.candidate.fullBodyPhotoUrl)
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

  // Helper to check if a CV matches the search query (by candidate name or passport number)
  const cvMatchesSearch = useCallback((cv: any, query: string) => {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    const givenNames = (cv.candidate?.passportData?.givenNames || cv.candidate?.givenNames || '').toLowerCase();
    const surname = (cv.candidate?.passportData?.surname || cv.candidate?.surname || '').toLowerCase();
    const fullName = `${givenNames} ${surname}`;
    const passportNumber = (cv.candidate?.passportData?.passportNumber || cv.candidate?.passportNumber || '').toLowerCase();
    return fullName.includes(q) || passportNumber.includes(q);
  }, []);

  // ── Group by template and filter out locked broker candidates ─────────────
  const processedFolders = TEMPLATES.map(t => {
    const folderCvs = cvs.filter(c => c.templateId === t.id && c.candidate?.broker?.isLocked !== true);
    return {
      ...t,
      cvs: folderCvs,
    };
  });

  const backupCvs = cvs.filter(c => c.candidate?.broker?.isLocked === true);
  const backupFolder = {
    id: '__backup__',
    name: 'Back-up CVs',
    category: 'Archive',
    color: 'bg-rose-500',
    textColor: 'text-rose-600',
    bgLight: 'bg-rose-50',
    cvs: backupCvs,
  };

  const displayedFolders = [
    ...processedFolders,
    ...(backupCvs.length > 0 ? [backupFolder] : [])
  ];

  const someSelected = selectedCVIds.size > 0;

  // ── Keyboard Shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Delete' && selectedCVIds.size > 0 && !deleteTarget) {
        setDeleteTarget('bulk');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedCVIds, deleteTarget]);

  // ── Folder View ───────────────────────────────────────────────────────────
  if (!selectedFolder) {
    return (
      <>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary-50"><FolderOpen size={22} className="text-primary" /></div>
                Generated CVs
              </h1>
              <p className="text-text-secondary mt-1 ml-12">All generated CVs organized by template</p>
            </div>
            <Link href="/cv-generator">
              <Button className="flex items-center gap-2"><RefreshCw size={16} />Generate New CV</Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
              {displayedFolders.map(folder => (
                <div
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className="bg-surface border border-border/50 rounded-[1.5rem] p-5 cursor-pointer shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group relative overflow-hidden"
                >
                  <div className={cn('absolute top-0 inset-x-0 h-1 rounded-t-2xl', folder.color)} />
                  <div className="flex items-start justify-between mb-4 pt-1">
                    <div className={cn('p-2.5 rounded-xl', folder.bgLight)}>
                      {folder.id === '__backup__' ? <Lock size={22} className={folder.textColor} /> : <FolderOpen size={22} className={folder.textColor} />}
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-surface-hover border border-border text-text-secondary">
                      {folder.cvs.length}
                    </span>
                  </div>
                  <p className="font-bold text-text-primary mb-0.5">{folder.name}</p>
                  <p className="text-xs text-text-tertiary mb-4">{folder.category} layout</p>
                  <div className="flex -space-x-2">
                    {folder.cvs.slice(0, 4).map(cv => (
                      <div key={cv.id} className="w-7 h-7 rounded-full ring-2 ring-surface overflow-hidden bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500">
                        {(cv.facePhotoUrl || cv.candidate.facePhotoUrl || cv.candidate.passportImageUrl)
                          ? <img src={getFileUrl(cv.facePhotoUrl || cv.candidate.facePhotoUrl || cv.candidate.passportImageUrl)} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                          : cv.candidate.passportData?.givenNames?.charAt(0) || ''}
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

        {/* Bulk Action Bar removed from top level page view to let the inside-folder one take care of it */}

        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </>
    );
  }

  // ── Folder Detail View ────────────────────────────────────────────────────
  const isBackupFolder = selectedFolder === '__backup__';
  const activeTemplate = isBackupFolder
    ? {
        id: '__backup__',
        name: 'Back-up CVs',
        category: 'Archive',
        color: 'bg-rose-500',
        textColor: 'text-rose-600',
        bgLight: 'bg-rose-50',
      }
    : TEMPLATES.find(t => t.id === selectedFolder)!;

  const allFolderCVs = isBackupFolder
    ? cvs.filter(c => c.candidate?.broker?.isLocked === true)
    : cvs.filter(c => c.templateId === selectedFolder && c.candidate?.broker?.isLocked !== true);

  const activeCVs = allFolderCVs.filter(cv => {
    if (religionFilter) {
      const rel = (cv.candidate.personalInfo?.religion || '').toLowerCase();
      if (religionFilter === 'muslim' && rel !== 'muslim') return false;
      if (religionFilter === 'non-muslim' && (rel === 'muslim' || rel === '')) return false;
    }
    if (flagFilter === 'flagged' && !cv.candidate.isFlagged) return false;
    if (flagFilter === 'unflagged' && cv.candidate.isFlagged) return false;

    const min = minAgeFilter ? parseInt(minAgeFilter) : null;
    const max = maxAgeFilter ? parseInt(maxAgeFilter) : null;
    if (min !== null || max !== null) {
      if (!cv.candidate.passportData?.dateOfBirth) return false;
      const age = new Date().getFullYear() - new Date(cv.candidate.passportData.dateOfBirth).getFullYear();
      if (min !== null && age < min) return false;
      if (max !== null && age > max) return false;
    }

    if (searchQuery && !cvMatchesSearch(cv, searchQuery)) return false;

    return true;
  });

  const allSelected = activeCVs.length > 0 && activeCVs.every(cv => selectedCVIds.has(cv.id));

  // ── Download All as ZIP ────────────────────────────────────────────────────
  const handleDownloadAll = async (format: 'pdf' | 'jpg' | 'doc') => {
    const cvsToDownload = selectedCVIds.size > 0 
      ? activeCVs.filter(c => selectedCVIds.has(c.id)) 
      : activeCVs;

    if (cvsToDownload.length === 0) return;
    
    if (cvsToDownload.length === 1) {
      setDownloadAllOpen(false);
      startDownload(cvsToDownload[0], format);
      return;
    }

    setIsDownloadingAll(true);
    setDownloadAllOpen(false);
    try {
      const JSZip = (await import('jszip')).default;
      const htmlToImage = await import('html-to-image');
      const zip = new JSZip();

      // Create a hidden container for rendering
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:800px;z-index:-1;';
      document.body.appendChild(container);

      for (let i = 0; i < cvsToDownload.length; i++) {
        const cv = cvsToDownload[i];
        const safeName = `${cv.candidate.passportData?.givenNames || ''}_${cv.candidate.passportData?.surname || ''}`.replace(/[^a-zA-Z0-9_]/g, '');
        showToast(`Processing ${i + 1}/${cvsToDownload.length}: ${cv.candidate.passportData?.givenNames || ''}...`);

        // Render the CV template into the hidden container
        const { createRoot } = await import('react-dom/client');
        const wrapper = document.createElement('div');
        container.appendChild(wrapper);
        const root = createRoot(wrapper);

        const FolderTemplate = TEMPLATES.find(t => t.id === cv.templateId)?.component || ALMTemplate;
        await new Promise<void>((resolve) => {
          root.render(
            React.createElement(FolderTemplate, {
              candidate: cv.candidate,
              facePhoto: getFileUrl(cv.facePhotoUrl || cv.candidate.facePhotoUrl || cv.candidate.passportImageUrl),
              fullBodyPhoto: getFileUrl(cv.fullBodyPhotoUrl || cv.candidate.fullBodyPhotoUrl),
            })
          );
          // Wait briefly for React to render DOM, htmlToImage will wait for images
          setTimeout(resolve, 50);
        });

        const origH = wrapper.style.height;
        const origO = wrapper.style.overflow;
        wrapper.style.height = 'auto';
        wrapper.style.overflow = 'visible';
        const dataUrl = await htmlToImage.toJpeg(wrapper, { 
          quality: 0.92, 
          backgroundColor: '#ffffff', 
          pixelRatio: 2,
          imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        });
        wrapper.style.height = origH;
        wrapper.style.overflow = origO;

        if (format === 'doc') {
          // DOCX via server-side API
          const payload = {
            candidateId: cv.candidateId,
            templateId: `tmpl-${selectedFolder}`,
            format: 'doc',
            deadline: cv.candidate.cvDeadline || new Date().toISOString().split('T')[0],
            facePhoto: getFileUrl(cv.facePhotoUrl || cv.candidate.facePhotoUrl || cv.candidate.passportImageUrl),
            fullBodyPhoto: getFileUrl(cv.fullBodyPhotoUrl || cv.candidate.fullBodyPhotoUrl)
          };
          const response = await api('/api/cv/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!response.ok) throw new Error('DOCX generation failed');
          const blob = await response.blob();
          zip.file(`${safeName}.docx`, blob);
        } else if (format === 'jpg') {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          zip.file(`${safeName}.jpg`, blob);
        } else {
          const { jsPDF } = await import('jspdf');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfW = pdf.internal.pageSize.getWidth();
          const props = pdf.getImageProperties(dataUrl);
          const totalH = props.height / (props.width / pdfW);
          pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfW, totalH);
          if (totalH > pdf.internal.pageSize.getHeight() + 10) {
            pdf.addPage();
            pdf.addImage(dataUrl, 'JPEG', 0, -297, pdfW, totalH);
          }
          zip.file(`${safeName}.pdf`, pdf.output('blob'));
        }

        root.unmount();
        container.removeChild(wrapper);
      }

      document.body.removeChild(container);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTemplate.name.replace(/\s+/g, '_')}_CVs${selectedCVIds.size > 0 ? '_Selected' : ''}${religionFilter ? '_' + religionFilter : ''}.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 2000);
      showToast(`Downloaded ${cvsToDownload.length} CVs as ZIP!`);
    } catch (err) {
      console.error('Download all error:', err);
      showToast('Failed to download all CVs', 'error');
    } finally {
      setIsDownloadingAll(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Breadcrumb + Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => { setSelectedFolder(null); setReligionFilter(''); setFlagFilter('all'); setSearchQuery(''); }} className="p-2 rounded-lg hover:bg-surface border border-border transition-colors text-text-secondary hover:text-text-primary">
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-text-tertiary mb-0.5">
                <span className="hover:text-primary cursor-pointer" onClick={() => { setSelectedFolder(null); setReligionFilter(''); setFlagFilter('all'); }}>Folders</span>
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
            {/* Bulk action bar */}
            {someSelected && (
              <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
                <span className="text-sm font-semibold text-primary">{selectedCVIds.size} selected</span>
                <button
                  onClick={() => setBulkChangeOpen(true)}
                  disabled={actionLoading || isBackupFolder}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <LayoutTemplate size={13} /> Change Template
                </button>
                <button
                  onClick={() => setSelectedCVIds(new Set())}
                  className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            {/* Search Input */}
            <div className="w-56 relative">
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={14} />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary p-0.5 rounded-lg hover:bg-surface-hover transition-all"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            {/* Religion Filter */}
            <div className="w-36">
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

            {/* Flag Filter */}
            <div className="w-36">
              <select
                value={flagFilter}
                onChange={e => setFlagFilter(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="flagged">Flagged Only</option>
                <option value="unflagged">Unflagged Only</option>
              </select>
            </div>

            {/* Age Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-secondary">Age:</span>
              <div className="flex items-center gap-1 w-32 bg-surface border border-border rounded-xl px-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minAgeFilter}
                  onChange={e => setMinAgeFilter(e.target.value)}
                  className="w-full py-2 bg-transparent text-text-primary text-sm focus:outline-none text-center"
                />
                <span className="text-text-tertiary">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxAgeFilter}
                  onChange={e => setMaxAgeFilter(e.target.value)}
                  className="w-full py-2 bg-transparent text-text-primary text-sm focus:outline-none text-center"
                />
              </div>
            </div>

            {/* Download */}
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
                {isDownloadingAll 
                  ? 'Creating ZIP...' 
                  : selectedCVIds.size > 0 
                    ? `Download Selected (${selectedCVIds.size})` 
                    : `Download All (${activeCVs.length})`
                }
                <ChevronDown size={14} className={cn('transition-transform', downloadAllOpen && 'rotate-180')} />
              </button>
              {downloadAllOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-border rounded-xl shadow-2xl overflow-hidden z-50">
                  <button
                    onClick={() => handleDownloadAll('pdf')}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-primary hover:bg-surface transition-colors whitespace-nowrap"
                  >
                    <FileDown size={14} className="text-red-500 shrink-0" /> {selectedCVIds.size > 0 ? 'Selected as PDF' : 'All as PDF'}
                  </button>
                  <button
                    onClick={() => handleDownloadAll('jpg')}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-primary hover:bg-surface transition-colors border-t border-border whitespace-nowrap"
                  >
                    <ImageIcon size={14} className="text-emerald-500 shrink-0" /> {selectedCVIds.size > 0 ? 'Selected as JPG' : 'All as JPG'}
                  </button>
                  <button
                    onClick={() => handleDownloadAll('doc')}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-primary hover:bg-surface transition-colors border-t border-border whitespace-nowrap"
                  >
                    <FileText size={14} className="text-blue-500 shrink-0" /> {selectedCVIds.size > 0 ? 'Selected as DOCX' : 'All as DOCX'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {activeCVs.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-border p-16 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
              <FileText size={28} className="text-gray-300" />
            </div>
            <h3 className="text-base font-semibold text-text-primary mb-1">{religionFilter ? 'No matching candidates' : 'This folder is empty'}</h3>
            <p className="text-sm text-text-tertiary mb-6 max-w-xs">{religionFilter ? `No ${religionFilter} candidates found in ${activeTemplate.name}.` : isBackupFolder ? 'No locked candidates\' CVs found.' : `No CVs generated with ${activeTemplate.name} yet.`}</p>
            {religionFilter ? (
              <Button onClick={() => setReligionFilter('')}>Clear Filter</Button>
            ) : isBackupFolder ? (
              <p className="text-xs text-text-tertiary">All candidate folders are operating normally.</p>
            ) : (
              <Link href="/cv-generator"><Button>Generate a CV</Button></Link>
            )}
          </div>
        ) : (
          <>
            {/* Select All row */}
            <div className="flex items-center gap-3 pb-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => {
                    if (allSelected) {
                      setSelectedCVIds(prev => {
                        const next = new Set(prev);
                        activeCVs.forEach(cv => next.delete(cv.id));
                        return next;
                      });
                    } else {
                      setSelectedCVIds(prev => {
                        const next = new Set(prev);
                        activeCVs.forEach(cv => next.add(cv.id));
                        return next;
                      });
                    }
                  }}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
                <span className="text-sm font-medium text-text-secondary">
                  {allSelected ? 'Deselect All' : 'Select All'}
                </span>
              </label>
              {someSelected && (
                <span className="text-xs text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-full">
                  {selectedCVIds.size} of {activeCVs.length} selected
                </span>
              )}
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {activeCVs.map(cv => {
              const isSelected = selectedCVIds.has(cv.id);
              const CardTemplate = TEMPLATES.find(t => t.id === cv.templateId)?.component || ALMTemplate;
              const isLocked = cv.candidate.broker?.isLocked;
              return (
              <div 
                key={cv.id} 
                className={`bg-surface border rounded-[1.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden transition-all flex flex-col select-none ${
                  isSelected 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : isLocked 
                      ? 'border-red-200/60 hover:border-red-300 bg-red-50/5' 
                      : 'border-border/50'
                }`}
                onMouseDown={() => handleCardMouseDown(cv.id, isSelected)}
                onMouseEnter={() => handleCardMouseEnter(cv.id)}
              >
                {/* Live Preview */}
                <div
                  className="relative h-56 bg-gray-100 overflow-hidden cursor-pointer group border-b border-border"
                  onClick={() => { setPreviewCv(cv); }}
                >
                  {/* Scaled live template render */}
                  <div className="origin-top-left scale-[0.22] w-[800px] absolute top-0 left-0 pointer-events-none">
                    <CardTemplate
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
                  {/* Per-card checkbox */}
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="w-4 h-4 accent-primary rounded cursor-pointer pointer-events-none"
                      />
                    </label>
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate flex items-center gap-1.5">
                          {cv.candidate.passportData?.givenNames} {cv.candidate.passportData?.surname}
                          {cv.candidate.isFlagged && <Flag size={14} className="text-red-500 fill-red-500 shrink-0" />}
                        </p>
                        <p className="text-xs text-text-tertiary">{cv.candidate.passportData?.passportNumber}</p>
                      </div>
                    </div>

                    {isLocked ? (
                      <div className="p-1.5 text-red-500 bg-red-50 rounded-lg shrink-0 border border-red-100" title={`Broker "${cv.candidate.broker?.name}" is locked. No actions allowed.`}>
                        <Lock size={14} />
                      </div>
                    ) : (
                      <ActionMenu
                        cvId={cv.id}
                        currentTemplateId={cv.templateId}
                        onDelete={() => setDeleteTarget(cv)}
                        onChangeTemplate={() => setChangeTarget(cv)}
                        isFlagged={cv.candidate.isFlagged || false}
                        onToggleFlag={() => toggleFlag(cv.id, cv.candidateId, cv.candidate.isFlagged || false)}
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
                        onClick={(e) => { e.stopPropagation(); startDownload(cv, 'pdf'); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        disabled={isDownloading}
                        className="text-xs font-medium text-primary flex items-center gap-1 hover:underline disabled:opacity-50 px-1.5 py-1 rounded hover:bg-primary/5"
                        title="Download as PDF"
                      >
                        <FileDown size={12} /> PDF
                      </button>
                      <span className="text-border">|</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); startDownload(cv, 'jpg'); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        disabled={isDownloading}
                        className="text-xs font-medium text-primary flex items-center gap-1 hover:underline disabled:opacity-50 px-1.5 py-1 rounded hover:bg-primary/5"
                        title="Download as JPG"
                      >
                        <ImageIcon size={12} /> JPG
                      </button>
                      <span className="text-border">|</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); startDownload(cv, 'doc'); }}
                        onMouseDown={(e) => e.stopPropagation()}
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
          </>
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

        {/* Sticky Floating Delete Selected Button */}
        {someSelected && (
          <button
            onClick={handleBulkDelete}
            disabled={actionLoading || isBackupFolder}
            className="fixed bottom-8 right-8 z-50 flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-bold shadow-lg shadow-red-500/30 hover:scale-[1.03] active:scale-[0.97] transition-all disabled:opacity-50"
          >
            <Trash2 size={16} /> Delete Selected ({selectedCVIds.size})
          </button>
        )}
      </div>

      {/* Modals */}
      {changeTarget && (
        <ChangeTemplateModal
          cv={changeTarget}
          currentTemplateId={changeTarget.templateId}
          onChange={handleConfirmChange}
          onClose={() => !actionLoading && setChangeTarget(null)}
          isLoading={actionLoading}
        />
      )}
      {/* Bulk Change Template Modal */}
      {bulkChangeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setBulkChangeOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-text-primary">Bulk Change Template</h2>
                <p className="text-sm text-text-secondary mt-0.5">Move <strong>{selectedCVIds.size} selected CV{selectedCVIds.size !== 1 ? 's' : ''}</strong> to a new template</p>
              </div>
              <button onClick={() => setBulkChangeOpen(false)} className="p-2 rounded-lg hover:bg-surface transition-colors text-text-tertiary hover:text-text-primary"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {TEMPLATES.filter(t => t.id !== selectedFolder).map(template => {
                  const TC = template.component;
                  const sampleCv = activeCVs.find(c => selectedCVIds.has(c.id));
                  return (
                    <button
                      key={template.id}
                      onClick={() => handleBulkChangeTemplate(template.id)}
                      disabled={actionLoading}
                      className="relative rounded-xl border-2 border-border overflow-hidden hover:border-primary hover:shadow-md transition-all text-left group cursor-pointer disabled:opacity-50"
                    >
                      <div className="h-36 bg-gray-100 overflow-hidden relative">
                        {sampleCv && (
                          <div className="origin-top-left scale-[0.22] w-[800px] absolute top-0 left-0 pointer-events-none">
                            <TC
                              candidate={sampleCv.candidate}
                              facePhoto={getFileUrl(sampleCv.facePhotoUrl || sampleCv.candidate.facePhotoUrl)}
                              fullBodyPhoto={getFileUrl(sampleCv.fullBodyPhotoUrl || sampleCv.candidate.fullBodyPhotoUrl)}
                            />
                          </div>
                        )}
                      </div>
                      <div className="px-3 py-2 flex items-center gap-2 bg-white">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${template.color}`} />
                        <span className="text-sm font-medium text-text-primary truncate">{template.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-gray-50/50">
              <button onClick={() => setBulkChangeOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface transition-colors border border-border">Cancel</button>
              <p className="text-xs text-text-tertiary">Click a template above to move all selected CVs</p>
            </div>
          </div>
        </div>
      )}
        {/* Delete Modal */}
      {deleteTarget && (
        <DeleteModal
          cv={deleteTarget === 'bulk' ? undefined : deleteTarget}
          bulkCount={deleteTarget === 'bulk' ? selectedCVIds.size : undefined}
          isLoading={actionLoading}
          onConfirm={handleConfirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
      {/* Preview Modal */}
      {previewCv && (() => {
        const PrevTemplate = TEMPLATES.find(t => t.id === previewCv.templateId)?.component || ALMTemplate;
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewCv(null)}>
            <div className="relative max-h-[95vh] overflow-auto bg-white rounded-xl shadow-2xl flex items-start justify-center" onClick={e => e.stopPropagation()}>
              <button onClick={() => setPreviewCv(null)} className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black transition-colors backdrop-blur-md">
                <X size={20} />
              </button>
              <div className="w-[800px] shrink-0 bg-white shadow-xl relative">
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

export default function GeneratedCVsPage() {
  return (
    <React.Suspense fallback={
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <GeneratedCVsContent />
    </React.Suspense>
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
