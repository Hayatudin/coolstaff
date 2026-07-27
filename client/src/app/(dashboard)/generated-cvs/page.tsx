'use client';

import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FolderOpen, FileText, ChevronRight, ArrowLeft, Download,
  RefreshCw, Trash2, MoreVertical, LayoutTemplate, X, Check, AlertTriangle,
  FileDown, Image as ImageIcon, ChevronDown, PackageOpen, Flag, Eye, Search, Lock,
  Loader2, Video
} from 'lucide-react';
import { cn, getFileUrl, convertImageToBase64 } from '@/lib/utils';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';
import ALMTemplate from '@/components/cv/templates/ALMTemplate';
import AlmalaTemplate from '@/components/cv/templates/AlmalaTemplate';
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
  { id: 'alm', name: 'ALMERSAH', category: 'Classic', color: 'bg-blue-500', textColor: 'text-blue-600', bgLight: 'bg-blue-50', component: ALMTemplate },
  { id: 'almala', name: 'ALMALA', category: 'Classic', color: 'bg-teal-500', textColor: 'text-teal-600', bgLight: 'bg-teal-50', component: AlmalaTemplate },
  { id: 'ka7', name: 'KAAFAAT', category: 'Professional', color: 'bg-emerald-500', textColor: 'text-emerald-600', bgLight: 'bg-emerald-50', component: KA7Template },
  { id: 'ku2', name: 'KHUZAM', category: 'Minimal', color: 'bg-indigo-500', textColor: 'text-indigo-600', bgLight: 'bg-indigo-50', component: KU2Template },
  { id: 'ma', name: 'MA Standard', category: 'Modern', color: 'bg-orange-500', textColor: 'text-orange-600', bgLight: 'bg-orange-50', component: MATemplate },
  { id: 'ra', name: 'RAYAAT', category: 'Elegant', color: 'bg-purple-500', textColor: 'text-purple-600', bgLight: 'bg-purple-50', component: RATemplate },
  { id: 'vision', name: 'Vision Layout', category: 'Premium', color: 'bg-[#0a5c4e]', textColor: 'text-[#0a5c4e]', bgLight: 'bg-[#e8f5e9]', component: VisionTemplate },
];

const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  if (url.includes('youtube.com/embed/')) return url;
  return url;
};

// ── Action Dropdown — portal with fixed positioning so it escapes overflow:hidden ──
function ActionMenu({
  currentTemplateId,
  onDelete,
  onChangeTemplate,
  isFlagged,
  onToggleFlag,
  cvDownloaded,
  onMarkAsCvAvailable,
}: {
  cvId: string;
  currentTemplateId: string;
  onDelete: () => void;
  onChangeTemplate: () => void;
  isFlagged: boolean;
  onToggleFlag: () => void;
  cvDownloaded?: boolean;
  onMarkAsCvAvailable?: () => void;
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

      {cvDownloaded && onMarkAsCvAvailable && (
        <button onClick={() => { setOpen(false); onMarkAsCvAvailable(); }}
          className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors font-semibold"
        >
          <Check size={14} className="text-emerald-600" /> Mark as CV Available
        </button>
      )}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col scale-in"
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
  const [cvStatusFilter, setCvStatusFilter] = useState<'cv-available' | 'cv-downloaded'>('cv-available');
  const [previewFullImageUrl, setPreviewFullImageUrl] = useState<string | null>(null);
  const [playVideoUrl, setPlayVideoUrl] = useState<string | null>(null);

  const getAge = (dateOfBirthStr: string | null | undefined): number | null => {
    if (!dateOfBirthStr) return null;
    const dob = new Date(dateOfBirthStr);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const getExperienceDisplay = (workExperience: any): string => {
    const exps = Array.isArray(workExperience) ? workExperience : [];
    if (exps.length === 0) {
      return 'First-Timer (جديد)';
    }
    return 'Experienced';
  };

  const markAsCvDownloaded = async (candidateId: string) => {
    try {
      const res = await api(`/api/candidates/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvDownloaded: true }),
      });
      if (!res.ok) throw new Error();
      setCvs(prev => prev.map(c =>
        c.candidateId === candidateId
          ? { ...c, candidate: { ...c.candidate, cvDownloaded: true } }
          : c
      ));
      clearCandidatesCache();
    } catch (err) {
      console.error('Failed to mark CV as downloaded:', err);
    }
  };

  const markAsCvAvailable = async (candidateId: string) => {
    try {
      const res = await api(`/api/candidates/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvDownloaded: false }),
      });
      if (!res.ok) throw new Error();
      setCvs(prev => prev.map(c =>
        c.candidateId === candidateId
          ? { ...c, candidate: { ...c.candidate, cvDownloaded: false } }
          : c
      ));
      clearCandidatesCache();
      showToast('Candidate marked as CV Available');
    } catch (err) {
      console.error('Failed to mark CV as available:', err);
      showToast('Failed to mark CV as available', 'error');
    }
  };

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
  const [renderingCandidates, setRenderingCandidates] = useState<any[]>([]);
  const cvRenderRef = useRef<HTMLDivElement>(null);

  // States for preloading download images as Base64 data URLs
  const [dlFaceB64, setDlFaceB64] = useState<string | null>(null);
  const [dlBodyB64, setDlBodyB64] = useState<string | null>(null);
  const [dlPassportB64, setDlPassportB64] = useState<string | null>(null);
  const [isDlPreloading, setIsDlPreloading] = useState(false);
  const [bulkB64Images, setBulkB64Images] = useState<Record<string, { face: string | null; body: string | null; passport: string | null }>>({});

  // Download task progress control
  const [downloadTask, setDownloadTask] = useState<{
    type: 'single' | 'bulk';
    format: 'pdf' | 'jpg' | 'doc';
    progress: number;
    total: number;
    status: 'pending' | 'processing' | 'generating_zip' | 'complete' | 'failed' | 'cancelled';
    message: string;
    candidateIds?: string[];
    singleCv?: any;
  } | null>(null);
  const isCancelledRef = useRef(false);

  const toastTimeoutRef = useRef<any>(null);
  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success', autoClose = true) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ msg, type });
    if (autoClose) {
      toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
    }
  }, []);

  const fetchCVs = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const res = await api('/api/generated-cvs', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setCvs(data.filter((c: any) => 
        !c.candidate.isRequested && 
        c.candidate.personalInfo?.medicalStatus !== 'Unfit' && 
        c.candidate.medicalStatus !== 'Unfit' && 
        !c.candidate.visaSelected &&
        !c.candidate.isFlagged
      ));
      if (showLoading) setSelectedCVIds(new Set()); // only clear selection on hard refresh
    } catch {
      if (showLoading) showToast('Failed to load CVs', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    fetchCVs(true);
    const interval = setInterval(() => {
      fetchCVs(false);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setSelectedCVIds(new Set());
  }, [selectedFolder, cvStatusFilter]);

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
      setCvs(prev => prev.map(c => c.id === changeTarget.id ? { ...c, templateId: newTemplateId, candidate: c.candidate ? { ...c.candidate, cvDownloaded: false } : c.candidate } : c));
      clearCandidatesCache();
      showToast(`Moved to "${newTemplateName}" folder`);
      setChangeTarget(null);
      setSelectedFolder(newTemplateId); // jump to new folder
    } catch {
      showToast('Failed to change template', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkMarkAsCvAvailable = async () => {
    if (selectedCVIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to mark ${selectedCVIds.size} selected CVs as CV Available?`)) return;

    setActionLoading(true);
    try {
      const selectedCvsList = cvs.filter(c => selectedCVIds.has(c.id));
      const candidateIds = selectedCvsList.map(c => c.candidateId).filter(Boolean);

      const res = await api('/api/candidates/bulk-cv-downloaded', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateIds, cvDownloaded: false }),
      });
      if (!res.ok) throw new Error('Failed to update candidates');
      
      showToast(`${candidateIds.length} candidates marked as CV Available`);
      
      // Update local state
      setCvs(prev => prev.map(c =>
        candidateIds.includes(c.candidateId)
          ? { ...c, candidate: { ...c.candidate, cvDownloaded: false } }
          : c
      ));
      clearCandidatesCache();
      setSelectedCVIds(new Set());
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to update candidates', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Bulk Change Template ───────────────────────────────────────────────────
  const handleBulkChangeTemplate = async (newTemplateId: string) => {
    if (selectedCVIds.size === 0) return;

    const ids = Array.from(selectedCVIds);
    setActionLoading(true);
    setBulkChangeOpen(false);

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
          setCvs(prev => prev.map(c => c.id === id ? { ...c, templateId: newTemplateId, candidate: c.candidate ? { ...c.candidate, cvDownloaded: false } : c.candidate } : c));
        }
      } catch { /* continue */ }
    }
    clearCandidatesCache();
    setSelectedCVIds(new Set());
    setActionLoading(false);

    const newTemplateName = TEMPLATES.find(t => t.id === newTemplateId)?.name;
    showToast(`${successCount} CV${successCount !== 1 ? 's' : ''} moved to "${newTemplateName}"`);
    if (successCount > 0) {
      setSelectedFolder(newTemplateId);
    }
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

  // Pre-load images as Base64 for the single downloading CV
  useEffect(() => {
    if (!downloadingCv) {
      setDlFaceB64(null);
      setDlBodyB64(null);
      setDlPassportB64(null);
      setIsDlPreloading(false);
      return;
    }

    let active = true;
    (async () => {
      setIsDlPreloading(true);
      const faceUrl = downloadingCv.facePhotoUrl || downloadingCv.candidate?.facePhotoUrl || downloadingCv.candidate?.passportImageUrl;
      const bodyUrl = downloadingCv.fullBodyPhotoUrl || downloadingCv.candidate?.fullBodyPhotoUrl;
      const passportUrl = downloadingCv.candidate?.passportImageUrl;

      const [face, body, passport] = await Promise.all([
        convertImageToBase64(faceUrl),
        convertImageToBase64(bodyUrl),
        convertImageToBase64(passportUrl)
      ]);

      if (active) {
        setDlFaceB64(face);
        setDlBodyB64(body);
        setDlPassportB64(passport);
        setIsDlPreloading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [downloadingCv]);

  // ── Inline Download ────────────────────────────────────────────────────────
  // Trigger download after downloadingCv state is set & hidden div is rendered
  useEffect(() => {
    if (!downloadingCv || !downloadFormat || !cvRenderRef.current || isDlPreloading) return;
    const el = cvRenderRef.current;
    let cancelled = false;

    (async () => {
      setIsDownloading(true);
      try {
        if (isCancelledRef.current) throw new Error('Cancelled');
        const htmlToImage = await import('html-to-image');
        const safeName = (downloadingCv.candidate.surname || 'CV').replace(/[^a-zA-Z0-9]/g, '');
        const fileName = `CV_${safeName}_${downloadingCv.templateId.toUpperCase()}`;

        const origH = el.style.height; const origO = el.style.overflow;
        el.style.height = 'auto'; el.style.overflow = 'visible';
        
        if (isCancelledRef.current) throw new Error('Cancelled');
        const dataUrl = await htmlToImage.toJpeg(el, { 
          quality: 0.95, 
          backgroundColor: '#ffffff', 
          pixelRatio: 1.5,
          fontEmbedCSS: '',
          imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        });
        el.style.height = origH; el.style.overflow = origO;

        if (cancelled || isCancelledRef.current) throw new Error('Cancelled');

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

          if (isCancelledRef.current) throw new Error('Cancelled');
          if (!response.ok) throw new Error('Failed to generate DOCX');

          const blob = await response.blob();
          downloadBlob(blob, `${fileName}.docx`);
          showToast('Editable DOCX Downloaded!');
        } else if (downloadFormat === 'jpg') {
          const res = await fetch(dataUrl);
          if (isCancelledRef.current) throw new Error('Cancelled');
          downloadBlob(await res.blob(), `${fileName}.jpg`);
          showToast('Downloaded as JPG');
        } else {
          const { jsPDF } = await import('jspdf');
          if (isCancelledRef.current) throw new Error('Cancelled');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfW = pdf.internal.pageSize.getWidth();
          const props = pdf.getImageProperties(dataUrl);
          const totalH = props.height / (props.width / pdfW);
          pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfW, totalH);
          if (totalH > pdf.internal.pageSize.getHeight() + 10) {
            pdf.addPage(); pdf.addImage(dataUrl, 'JPEG', 0, -297, pdfW, totalH);
          }
          if (isCancelledRef.current) throw new Error('Cancelled');
          downloadBlob(pdf.output('blob'), `${fileName}.pdf`);
          showToast('Downloaded as PDF');
        }

        const candidateId = downloadingCv.candidate?.id || downloadingCv.candidateId;
        if (candidateId) {
          await markAsCvDownloaded(candidateId);
        }
        setDownloadTask(prev => prev ? { ...prev, progress: 1, status: 'complete', message: 'Download complete!' } : null);
      } catch (e: any) {
        if (cancelled || isCancelledRef.current || e.message === 'Cancelled') {
          setDownloadTask(prev => prev ? { ...prev, status: 'cancelled', message: 'Download cancelled.' } : null);
        } else {
          showToast('Download failed', 'error');
          setDownloadTask(prev => prev ? { ...prev, status: 'failed', message: e.message || 'Download failed.' } : null);
        }
      } finally {
        if (!cancelled) { setIsDownloading(false); setDownloadingCv(null); setDownloadFormat(null); }
      }
    })();

    return () => { cancelled = true; };
  }, [downloadingCv, downloadFormat, isDlPreloading]);

  const startDownload = (cv: any, format: 'pdf' | 'jpg' | 'doc') => {
    if (cv.candidate?.personalInfo?.medicalStatus?.toLowerCase() === 'fit') {
      showToast('Fit candidates can only be downloaded from the Fit Candidates page', 'error');
      return;
    }
    isCancelledRef.current = false;
    setDownloadTask({
      type: 'single',
      format,
      progress: 0,
      total: 1,
      status: 'processing',
      message: 'Generating file...',
      singleCv: cv
    });
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
    const folderCvs = cvs.filter(c => c.templateId === t.id && c.candidate?.isLocked !== true && c.candidate?.broker?.isLocked !== true);
    return {
      ...t,
      cvs: folderCvs,
    };
  });

  const displayedFolders = processedFolders;

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
    ? cvs.filter(c => c.candidate?.isLocked === true || c.candidate?.broker?.isLocked === true)
    : cvs.filter(c => c.templateId === selectedFolder && c.candidate?.isLocked !== true && c.candidate?.broker?.isLocked !== true);

  const activeCVs = allFolderCVs.filter(cv => {
    const matchesCvStatus = cvStatusFilter === 'cv-downloaded'
      ? cv.candidate?.cvDownloaded === true
      : cv.candidate?.cvDownloaded !== true;
    if (!matchesCvStatus) return false;

    if (religionFilter) {
      const rel = (cv.candidate.personalInfo?.religion || '').toLowerCase().trim().replace('-', ' ');
      const filterVal = religionFilter.toLowerCase().trim().replace('-', ' ');
      if (filterVal === 'muslim' && rel !== 'muslim' && rel !== 'islam') return false;
      if (filterVal === 'non muslim' && (rel === 'muslim' || rel === 'islam' || rel === '')) return false;
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
    let cvsToDownload = selectedCVIds.size > 0 
      ? activeCVs.filter(c => selectedCVIds.has(c.id)) 
      : activeCVs;

    // Filter out candidates whose medical status is Fit
    cvsToDownload = cvsToDownload.filter(c => c.candidate?.personalInfo?.medicalStatus?.toLowerCase() !== 'fit');

    if (cvsToDownload.length === 0) {
      showToast('No downloadable candidates found (Fit candidates can only be downloaded from the Fit Candidates page)', 'error');
      return;
    }
    
    if (cvsToDownload.length === 1) {
      setDownloadAllOpen(false);
      startDownload(cvsToDownload[0], format);
      return;
    }

    setIsDownloadingAll(true);
    setDownloadAllOpen(false);
    isCancelledRef.current = false;

    const candidateIds = cvsToDownload.map(c => c.candidateId).filter(Boolean);
    if (candidateIds.length === 0) return;

    setDownloadTask({
      type: 'bulk',
      format,
      progress: 0,
      total: candidateIds.length,
      status: 'pending',
      message: 'Initializing bulk export...',
      candidateIds
    });

    const timerWorker = (() => {
      const workerCode = `
        self.onmessage = function(e) {
          setTimeout(function() {
            self.postMessage('tick');
          }, e.data);
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      return new Worker(URL.createObjectURL(blob));
    })();
    const bgWait = (ms: number) => new Promise<void>(resolve => {
      timerWorker.onmessage = () => resolve();
      timerWorker.postMessage(ms);
    });

    try {
      if (isCancelledRef.current) throw new Error('Cancelled');

      if (format === 'doc') {
        // DOCX is fast and functional on the server
        const initRes = await api('/api/cv/bulk-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateIds, format })
        });
        
        if (isCancelledRef.current) throw new Error('Cancelled');
        if (!initRes.ok) throw new Error('Failed to initialize bulk generation');
        const { jobId } = await initRes.json();

        let status = 'processing';
        while (status === 'processing' || status === 'pending') {
          if (isCancelledRef.current) throw new Error('Cancelled');
          await bgWait(1500);
          if (isCancelledRef.current) throw new Error('Cancelled');
          const statusRes = await api(`/api/cv/bulk-generate/status/${jobId}`);
          if (!statusRes.ok) throw new Error('Failed to fetch processing status');
          const progressData = await statusRes.json();
          
          status = progressData.status;
          if (status === 'failed') {
            throw new Error(progressData.error || 'Server-side bulk generation failed');
          }

          setDownloadTask(prev => prev ? {
            ...prev,
            progress: progressData.progress,
            total: progressData.total,
            status: 'processing',
            message: `Generating CVs: ${progressData.progress}/${progressData.total} (${Math.round((progressData.progress / progressData.total) * 100)}%)`
          } : null);
        }

        if (isCancelledRef.current) throw new Error('Cancelled');
        setDownloadTask(prev => prev ? { ...prev, status: 'generating_zip', message: 'Downloading ZIP archive...' } : null);
        const downloadRes = await api(`/api/cv/bulk-generate/download/${jobId}`);
        if (isCancelledRef.current) throw new Error('Cancelled');
        if (!downloadRes.ok) throw new Error('Failed to download ZIP file');
        const blob = await downloadRes.blob();

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeTemplate.name.replace(/\s+/g, '_')}_CVs${selectedCVIds.size > 0 ? '_Selected' : ''}${religionFilter ? '_' + religionFilter : ''}.zip`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 2000);
        setDownloadTask(prev => prev ? { ...prev, progress: candidateIds.length, status: 'complete', message: 'Download complete!' } : null);
      } else {
        // PDF and JPG format download via optimized client zipping
        setDownloadTask(prev => prev ? { ...prev, status: 'processing', message: 'Fetching candidate details in batch...' } : null);
        const batchRes = await api('/api/cv/candidates-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateIds })
        });
        if (isCancelledRef.current) throw new Error('Cancelled');
        if (!batchRes.ok) throw new Error('Failed to fetch candidate details');
        const candidatesData = await batchRes.json();

        const JSZip = (await import('jszip')).default;
        const htmlToImage = await import('html-to-image');
        const { jsPDF } = await import('jspdf');
        const zip = new JSZip();

        const CHUNK_SIZE = 5;
        const failedCandidates: { name: string; reason: string }[] = [];
        let renderedCount = 0;

        for (let i = 0; i < candidatesData.length; i += CHUNK_SIZE) {
          if (isCancelledRef.current) throw new Error('Cancelled');
          const chunk = candidatesData.slice(i, i + CHUNK_SIZE);

          // Preload face, body, and passport photos to Base64 for this chunk
          const preloadedForChunk: Record<string, { face: string | null; body: string | null; passport: string | null }> = {};
          await Promise.all(chunk.map(async (candidate: any) => {
            const correspondingCv = cvs.find(cv => cv.candidateId === candidate.id);
            const faceUrl = correspondingCv?.facePhotoUrl || candidate.facePhotoUrl || candidate.passportImageUrl;
            const bodyUrl = correspondingCv?.fullBodyPhotoUrl || candidate.fullBodyPhotoUrl;
            const passportUrl = candidate.passportImageUrl;
            const [face, body, passport] = await Promise.all([
              convertImageToBase64(faceUrl),
              convertImageToBase64(bodyUrl),
              convertImageToBase64(passportUrl)
            ]);
            preloadedForChunk[candidate.id] = { face, body, passport };
          }));
          setBulkB64Images(prev => ({ ...prev, ...preloadedForChunk }));

          setRenderingCandidates(chunk);
          await bgWait(150);

          await Promise.all(chunk.map(async (candidate: any) => {
            if (isCancelledRef.current) return;
            const pData = candidate.passportData || {};
            const givenNames = pData.givenNames || candidate.givenNames || '';
            const surname = pData.surname || candidate.surname || '';
            const candidateName = `${givenNames} ${surname}`.trim() || `Candidate ID ${candidate.id}`;

            try {
              const element = document.getElementById(`bulk-render-${candidate.id}`);
              if (!element) {
                throw new Error('CV template layout element not found in DOM.');
              }

              const pNo = pData.passportNumber || candidate.passportNumber || candidate.id.slice(-6);
              const namePart = `${givenNames}_${surname}`.trim().replace(/\s+/g, '_');

              const rawTemplateId = candidate.latestCVTemplate || 'alm';
              const templateId = rawTemplateId.replace('tmpl-', '').toLowerCase();
              const templateObj = TEMPLATES.find(t => t.id === templateId);
              const templateName = templateObj ? templateObj.name.replace(/\s+/g, '_') : 'ALMERSAH';

              const safeName = `${namePart}_${templateName}_${pNo}`.replace(/[^a-zA-Z0-9_]/g, '');

              if (isCancelledRef.current) return;
              const dataUrl = await htmlToImage.toJpeg(element, {
                quality: 0.90,
                backgroundColor: '#ffffff',
                pixelRatio: 1.0,
                fontEmbedCSS: '',
                cacheBust: false,
                imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
              });

              if (isCancelledRef.current) return;
              if (format === 'jpg') {
                const imgRes = await fetch(dataUrl);
                const blob = await imgRes.blob();
                zip.file(`${safeName}.jpg`, blob);
              } else {
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
            } catch (err: any) {
              console.error(`Failed rendering CV for ${candidateName}:`, err);
              let friendlyMessage = 'Unable to render the candidate CV layout.';
              const errMsg = String(err.message || err);
              if (errMsg.includes('CORS') || errMsg.includes('fetch') || errMsg.includes('Failed to fetch')) {
                friendlyMessage = 'Unable to load candidate images from network due to connection security.';
              } else if (errMsg.includes('element') || errMsg.includes('not found')) {
                friendlyMessage = 'CV layout element was missing in the browser rendering container.';
              }
              failedCandidates.push({ name: candidateName, reason: friendlyMessage });
            }
          }));

          renderedCount += chunk.length;
          setDownloadTask(prev => {
            if (!prev) return null;
            return {
              ...prev,
              progress: Math.min(renderedCount, prev.total),
              status: 'processing',
              message: `Rendering CVs: ${Math.min(renderedCount, prev.total)}/${prev.total}`
            };
          });
        }

        if (failedCandidates.length > 0) {
          const names = failedCandidates.map(f => `• ${f.name}: ${f.reason}`).join('\n');
          alert(`Some CVs failed to render, but the remaining CVs were processed successfully:\n\n${names}`);
        }

        if (isCancelledRef.current) throw new Error('Cancelled');
        setRenderingCandidates([]);
        setDownloadTask(prev => prev ? { ...prev, status: 'generating_zip', message: 'Generating ZIP file...' } : null);
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        if (isCancelledRef.current) throw new Error('Cancelled');
        const url = window.URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeTemplate.name.replace(/\s+/g, '_')}_CVs_${format.toUpperCase()}.zip`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 2000);
        setDownloadTask(prev => prev ? { ...prev, status: 'complete', message: 'Download complete!' } : null);

        // Update cvDownloaded status on server
        await api('/api/candidates/bulk-cv-downloaded', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateIds, cvDownloaded: true }),
        });
      }

      // Local state updates
      setCvs(prev => prev.map(c =>
        candidateIds.includes(c.candidateId)
          ? { ...c, candidate: { ...c.candidate, cvDownloaded: true } }
          : c
      ));
      clearCandidatesCache();
      setSelectedCVIds(new Set());
    } catch (err: any) {
      console.error(err);
      if (isCancelledRef.current || err.message === 'Cancelled') {
        setDownloadTask(prev => prev ? { ...prev, status: 'cancelled', message: 'Download cancelled.' } : null);
      } else {
        showToast(err.message || 'Failed to download CVs', 'error');
        setDownloadTask(prev => prev ? { ...prev, status: 'failed', message: err.message || 'Download failed.' } : null);
      }
    } finally {
      setIsDownloadingAll(false);
      setRenderingCandidates([]);
    }
  };

  return (
    <>
      {/* Hidden container for optimized bulk rendering */}
      <div style={{ position: 'fixed', top: -9999, left: -9999, width: '210mm', zIndex: -1 }}>
        {renderingCandidates.map(c => {
          const correspondingCv = cvs.find(cv => cv.candidateId === c.id);
          const rawTemplateId = correspondingCv ? correspondingCv.templateId : 'alm';
          const templateId = rawTemplateId.replace('tmpl-', '').toLowerCase();
          const FolderTemplate = TEMPLATES.find(t => t.id === templateId)?.component || ALMTemplate;
          const facePhoto = bulkB64Images[c.id]?.face || getFileUrl(correspondingCv?.facePhotoUrl || c.facePhotoUrl || c.passportImageUrl);
          const fullBodyPhoto = bulkB64Images[c.id]?.body || getFileUrl(correspondingCv?.fullBodyPhotoUrl || c.fullBodyPhotoUrl);
          const candidateWithPassport = {
            ...c,
            passportImageUrl: bulkB64Images[c.id]?.passport || getFileUrl(c.passportImageUrl)
          };

          return (
            <div key={c.id} id={`bulk-render-${c.id}`} style={{ width: '210mm', backgroundColor: '#ffffff' }}>
              <FolderTemplate
                candidate={candidateWithPassport}
                facePhoto={facePhoto}
                fullBodyPhoto={fullBodyPhoto}
              />
            </div>
          );
        })}
      </div>
      <div className="space-y-6">
        {/* Breadcrumb + Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
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

            {/* CV Status Filter Tabs */}
            <div className="bg-gray-100 p-1.5 rounded-2xl flex items-center gap-1 shadow-inner ml-2">
              <button
                type="button"
                onClick={() => setCvStatusFilter('cv-available')}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-widest cursor-pointer",
                  cvStatusFilter === 'cv-available'
                    ? "bg-white text-text-primary shadow-md"
                    : "text-text-tertiary hover:bg-white/50"
                )}
              >
                CV Available
              </button>
              <button
                type="button"
                onClick={() => setCvStatusFilter('cv-downloaded')}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-widest cursor-pointer",
                  cvStatusFilter === 'cv-downloaded'
                    ? "bg-white text-text-primary shadow-md"
                    : "text-text-tertiary hover:bg-white/50"
                )}
              >
                CV Downloaded
              </button>
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

                {cvStatusFilter === 'cv-downloaded' && (
                  <button
                    onClick={handleBulkMarkAsCvAvailable}
                    disabled={actionLoading || isBackupFolder}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 font-semibold"
                  >
                    <Check size={13} /> Mark as CV Available
                  </button>
                )}
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
              const isLocked = cv.candidate.isLocked || cv.candidate.broker?.isLocked;
              return (
              <div 
                key={cv.id} 
                className={`bg-white border-2 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col select-none ${
                  isSelected 
                    ? 'border-[#00A4EF] ring-2 ring-[#00A4EF]/20 bg-blue-50/5' 
                    : isLocked 
                      ? 'border-red-300 bg-red-50/5' 
                      : 'border-[#e2315a]'
                }`}
                onMouseDown={() => handleCardMouseDown(cv.id, isSelected)}
                onMouseEnter={() => handleCardMouseEnter(cv.id)}
              >
                {/* Selection Checkbox */}
                <div className="absolute top-4 left-4" onMouseDown={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      setSelectedCVIds(prev => {
                        const next = new Set(prev);
                        if (next.has(cv.id)) {
                          next.delete(cv.id);
                        } else {
                          next.add(cv.id);
                        }
                        return next;
                      });
                    }}
                    className="w-5 h-5 border-2 border-slate-350 rounded accent-[#e2315a] cursor-pointer"
                  />
                </div>

                {/* Age Badge */}
                <div className="absolute top-4 right-4 bg-white border border-[#e2315a] text-[#e2315a] text-[11px] font-black px-2.5 py-1 rounded-lg shadow-sm">
                  {getAge(cv.candidate.passportData?.dateOfBirth) ? `${getAge(cv.candidate.passportData?.dateOfBirth)} Years` : '—'}
                </div>

                {/* Avatar and Full Image Button */}
                <div className="flex items-center gap-4 mt-6">
                  <div className="w-20 h-20 rounded-full border-4 border-[#e2315a] overflow-hidden shrink-0 shadow-sm">
                    <img
                      src={getFileUrl(cv.facePhotoUrl || cv.candidate.facePhotoUrl || cv.candidate.passportImageUrl || '')}
                      alt={cv.candidate.passportData?.givenNames}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/150x150/f472b6/ffffff?text=' + cv.candidate.passportData?.givenNames.charAt(0);
                      }}
                    />
                  </div>
                  <div onMouseDown={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewFullImageUrl(getFileUrl(cv.fullBodyPhotoUrl || cv.facePhotoUrl || cv.candidate.facePhotoUrl || cv.candidate.passportImageUrl || ''));
                      }}
                      className="flex items-center gap-1.5 bg-[#e2315a] hover:bg-[#c9244c] text-white text-[11px] font-black px-3.5 py-1.5 rounded-full transition-all active:scale-95 shadow-sm shadow-pink-200 cursor-pointer"
                    >
                      <ImageIcon size={12} className="shrink-0" />
                      Full image
                    </button>
                  </div>
                </div>

                {/* Candidate Name & Action Menu */}
                <div className="flex items-start justify-between gap-2 mt-4" onMouseDown={(e) => e.stopPropagation()}>
                  <h3 className="font-black text-[#1e293b] text-[15px] uppercase leading-snug font-sans tracking-wide">
                    {cv.candidate.passportData?.givenNames} {cv.candidate.passportData?.surname}
                    {cv.candidate.isFlagged && <Flag size={14} className="text-red-500 fill-red-500 inline-block ml-1 shrink-0" />}
                  </h3>
                  {isLocked ? (
                    <div className="p-1.5 text-red-500 bg-red-50 rounded-lg shrink-0 border border-red-100" title={cv.candidate.isLocked ? "Candidate is locked. No actions allowed." : `Broker "${cv.candidate.broker?.name}" is locked. No actions allowed.`}>
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
                      cvDownloaded={cv.candidate?.cvDownloaded}
                      onMarkAsCvAvailable={() => markAsCvAvailable(cv.candidateId)}
                    />
                  )}
                </div>

                {/* Details list (two columns grid) */}
                <div className="mt-4 pt-4 border-t border-dashed border-pink-100 flex flex-col gap-2.5 text-[12px] text-slate-700">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 truncate">
                      <span className="text-slate-400 font-medium">Passport No : </span>
                      <span className="font-extrabold text-slate-800">{cv.candidate.passportData?.passportNumber}</span>
                    </div>
                    <div className="flex-1 truncate">
                      <span className="text-slate-400 font-medium">Job : </span>
                      <span className="font-extrabold text-slate-800">{cv.candidate.personalInfo?.job || '—'}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 truncate">
                      <span className="text-slate-400 font-medium">Nationality : </span>
                      <span className="font-extrabold text-slate-800">{cv.candidate.passportData?.nationality || '—'}</span>
                    </div>
                    <div className="flex-1 truncate">
                      <span className="text-slate-400 font-medium">Experience : </span>
                      <span className="font-extrabold text-slate-800">
                        {getExperienceDisplay(cv.candidate.personalInfo?.workExperience)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 truncate">
                      <span className="text-slate-400 font-medium">Religion : </span>
                      <span className="font-extrabold text-slate-800">{cv.candidate.personalInfo?.religion || '—'}</span>
                    </div>
                    <div className="flex-1 truncate">
                      <span className="text-slate-400 font-medium">City : </span>
                      <span className="font-extrabold text-slate-800">{cv.candidate.personalInfo?.city || '—'}</span>
                    </div>
                  </div>
                  {flagFilter === 'flagged' && (() => {
                    const targetDate = cv.candidate.flaggedAt ? new Date(cv.candidate.flaggedAt) : null;
                    let daysAgoText = '-';
                    if (targetDate) {
                      const now = new Date();
                      now.setHours(0, 0, 0, 0);
                      const selected = new Date(targetDate);
                      selected.setHours(0, 0, 0, 0);
                      const diffTime = now.getTime() - selected.getTime();
                      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                      if (diffDays <= 0) daysAgoText = 'Today';
                      else if (diffDays === 1) daysAgoText = '1 day ago';
                      else daysAgoText = `${diffDays} days ago`;
                    }
                    return (
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 truncate">
                          <span className="text-red-400 font-medium">Flagged : </span>
                          <span className="font-extrabold text-red-600">
                            {targetDate ? `${targetDate.toLocaleDateString()} (${daysAgoText})` : '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Watch Video / Preview CV and download format picker */}
                <div className="mt-auto pt-4 border-t border-dashed border-pink-100 flex flex-col gap-3" onMouseDown={(e) => e.stopPropagation()}>
                  {(() => {
                    const hasVideo = !!cv.candidate.videoUrl && cv.candidate.allowVideo === true;
                    if (hasVideo) {
                      return (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setPreviewCv(cv); }}
                            className="flex-1 bg-[#00A4EF] hover:bg-[#008bcb] text-white text-[12px] font-black py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Eye size={14} />
                            Preview CV
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setPlayVideoUrl(cv.candidate.videoUrl); }}
                            className="flex-1 bg-[#e2315a] hover:bg-[#c9244c] text-white text-[12px] font-black py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Video size={14} />
                            Watch Video
                          </button>
                        </div>
                      );
                    } else {
                      return (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setPreviewCv(cv); }}
                            className="w-full bg-[#00A4EF] hover:bg-[#008bcb] text-white text-[12px] font-black py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Eye size={14} />
                            Preview CV
                          </button>
                        </div>
                      );
                    }
                  })()}

                  {/* Format Pickers / Downloads & Date */}
                  <div className="flex items-center justify-between text-xs text-text-tertiary">
                    <span>
                      {new Date(cv.createdAt).toLocaleDateString()}
                    </span>
                    {cv.candidate?.personalInfo?.medicalStatus?.toLowerCase() === 'fit' ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 uppercase tracking-wider">
                        Medical: Fit
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); startDownload(cv, 'pdf'); }}
                          onMouseDown={(e) => e.stopPropagation()}
                          disabled={isDownloading}
                          className="text-xs font-medium text-primary flex items-center gap-1 hover:underline disabled:opacity-50 px-1.5 py-1 rounded hover:bg-primary/5 cursor-pointer"
                          title="Download as PDF"
                        >
                          <FileDown size={12} /> PDF
                        </button>
                        <span className="text-border">|</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); startDownload(cv, 'jpg'); }}
                          onMouseDown={(e) => e.stopPropagation()}
                          disabled={isDownloading}
                          className="text-xs font-medium text-primary flex items-center gap-1 hover:underline disabled:opacity-50 px-1.5 py-1 rounded hover:bg-primary/5 cursor-pointer"
                          title="Download as JPG"
                        >
                          <ImageIcon size={12} /> JPG
                        </button>
                        <span className="text-border">|</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); startDownload(cv, 'doc'); }}
                          onMouseDown={(e) => e.stopPropagation()}
                          disabled={isDownloading}
                          className="text-xs font-medium text-primary flex items-center gap-1 hover:underline disabled:opacity-50 px-1.5 py-1 rounded hover:bg-primary/5 cursor-pointer"
                          title="Download as DOCX"
                        >
                          <FileText size={12} /> DOCX
                        </button>
                      </div>
                    )}
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
          const candidateWithB64Passport = {
            ...downloadingCv.candidate,
            passportImageUrl: dlPassportB64 || getFileUrl(downloadingCv.candidate.passportImageUrl)
          };
          return (
            <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: 800, zIndex: -1 }}>
              <div ref={cvRenderRef}>
                <DlTemplate
                  candidate={candidateWithB64Passport}
                  facePhoto={dlFaceB64 || getFileUrl(downloadingCv.facePhotoUrl || downloadingCv.candidate.facePhotoUrl || downloadingCv.candidate.passportImageUrl)}
                  fullBodyPhoto={dlBodyB64 || getFileUrl(downloadingCv.fullBodyPhotoUrl || downloadingCv.candidate.fullBodyPhotoUrl)}
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

      {/* CV Download Progress Panel */}
      {downloadTask && (
        <div className="fixed bottom-6 right-6 z-50 w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-100 p-4.5 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-[#464479] flex items-center gap-1.5">
              {downloadTask.status === 'processing' || downloadTask.status === 'pending' || downloadTask.status === 'generating_zip' ? (
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
              ) : downloadTask.status === 'complete' ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : downloadTask.status === 'cancelled' ? (
                <X className="w-3.5 h-3.5 text-slate-505" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              )}
              {downloadTask.type === 'bulk' ? 'Bulk Export' : 'Single Export'}
            </span>
            <button 
              onClick={() => setDownloadTask(null)}
              className="text-text-tertiary hover:text-text-primary p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <p className="text-xs font-semibold text-text-primary mb-2.5 leading-normal">
            {downloadTask.message}
          </p>

          {(downloadTask.status === 'processing' || downloadTask.status === 'pending' || downloadTask.status === 'generating_zip') && (
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-[#464479] transition-all duration-300 rounded-full" 
                style={{ width: `${downloadTask.total > 0 ? (downloadTask.progress / downloadTask.total) * 100 : 0}%` }}
              />
            </div>
          )}

          <div className="flex gap-2">
            {(downloadTask.status === 'processing' || downloadTask.status === 'pending' || downloadTask.status === 'generating_zip') ? (
              <button
                onClick={() => {
                  isCancelledRef.current = true;
                  setDownloadTask(prev => prev ? { ...prev, status: 'cancelled', message: 'Cancelling export task...' } : null);
                }}
                className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl border border-red-100 transition-colors cursor-pointer"
              >
                Cancel Download
              </button>
            ) : (
              <button
                onClick={() => {
                  if (downloadTask.type === 'bulk' && downloadTask.candidateIds) {
                    handleDownloadAll(downloadTask.format);
                  } else if (downloadTask.type === 'single' && downloadTask.singleCv) {
                    startDownload(downloadTask.singleCv, downloadTask.format);
                  }
                }}
                className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded-xl border border-indigo-100 transition-colors cursor-pointer"
              >
                Restart Download
              </button>
            )}
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {playVideoUrl && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPlayVideoUrl(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4.5 border-b border-border bg-gray-50/50">
              <h3 className="font-extrabold text-text-primary text-sm flex items-center gap-2">
                <Video size={18} className="text-rose-600" />
                Watch Candidate Video
              </h3>
              <button 
                onClick={() => setPlayVideoUrl(null)}
                className="text-text-tertiary hover:text-text-primary p-2 rounded-lg hover:bg-gray-100 font-bold transition-all text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 bg-slate-900 flex items-center justify-center aspect-video relative">
              {(() => {
                const isYouTube = playVideoUrl.includes('youtube.com') || playVideoUrl.includes('youtu.be');
                if (isYouTube) {
                  return (
                    <iframe
                      src={getYouTubeEmbedUrl(playVideoUrl)}
                      className="absolute inset-0 w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  );
                } else {
                  return (
                    <video
                      src={getFileUrl(playVideoUrl)}
                      controls
                      autoPlay
                      className="max-w-full max-h-full rounded-xl"
                    />
                  );
                }
              })()}
            </div>
            
            <div className="p-4 border-t border-border bg-gray-50/50 flex justify-end">
              <button 
                onClick={() => setPlayVideoUrl(null)}
                className="px-5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-750 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Body Image Overlay Modal */}
      {previewFullImageUrl && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewFullImageUrl(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4.5 border-b border-border bg-gray-50/50">
              <h3 className="font-extrabold text-text-primary text-sm flex items-center gap-2">
                <ImageIcon size={18} className="text-[#e2315a]" />
                Candidate Full Image
              </h3>
              <button 
                onClick={() => setPreviewFullImageUrl(null)}
                className="text-text-tertiary hover:text-text-primary p-2 rounded-lg hover:bg-gray-100 font-bold transition-all text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 bg-slate-50 flex items-center justify-center max-h-[70vh] overflow-y-auto relative">
              <img
                src={previewFullImageUrl}
                alt="Full Candidate"
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/300x450/f472b6/ffffff?text=Full+Photo+Unavailable';
                }}
              />
            </div>
            
            <div className="p-4 border-t border-border bg-gray-50/50 flex justify-end">
              <button 
                onClick={() => setPreviewFullImageUrl(null)}
                className="px-5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-750 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
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
