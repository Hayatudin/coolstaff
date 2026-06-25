'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Users, Loader2, Search, ArrowLeft, FileText,
  ChevronRight, Filter, Download, Trash2, Briefcase,
  Lock, FileDown, ImageIcon, LayoutTemplate, Check, X, AlertCircle,
  MoreVertical, CheckCircle, Eye, ChevronDown, ArrowRightLeft, Flag, ArrowRight
} from 'lucide-react';
import { createPortal } from 'react-dom';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Broker } from '@/types';
import { api } from '@/lib/api';
import { getFileUrl, cn } from '@/lib/utils';
import { useSession } from '@/lib/auth-client';

// Import CV templates
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

const AGENCIES = [
  { id: 'all', name: 'All' },
  { id: 'ussus', name: 'USSUS' },
  { id: 'ku2', name: 'KHUZAM' },
  { id: 'ka7', name: 'KHAAFAAT' },
  { id: 'alm', name: 'ALAALAM' },
  { id: 'al-shablan', name: 'AL-Shablan' },
  { id: 'ma', name: 'MA Standard' },
  { id: 'ra', name: 'RAYAAT' },
  { id: 'vision', name: 'Vision Layout' },
];

interface BrokerCandidate {
  id: string;
  givenNames: string;
  surname: string;
  passportNumber: string;
  job: string | null;
  facePhotoUrl: string | null;
  fullBodyPhotoUrl: string | null;
  isRequested: boolean;
  registeredAt: string;
  generatedCVs: {
    id: string;
    templateId: string;
    facePhotoUrl?: string;
    fullBodyPhotoUrl?: string;
    createdAt?: string;
  }[];
  isLocked?: boolean;
  visaSelected?: boolean;
  religion?: string | null;
  isFlagged?: boolean;
  medicalStatus?: string;
  visaOrContractNumber?: string | null;
  cvDownloaded?: boolean;
  price?: string | null;
}

export default function BrokerCandidatesPage() {
  const params = useParams();
  const router = useRouter();
  const brokerId = params.id as string;
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  const [broker, setBroker] = useState<Broker | null>(null);
  const [candidates, setCandidates] = useState<BrokerCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Advanced Filters
  const [visaFilter, setVisaFilter] = useState<'visa-selected' | 'pending'>('pending');
  const [religionFilter, setReligionFilter] = useState('');
  const [flaggedFilter, setFlaggedFilter] = useState('unflagged');
  const [agencyFilter, setAgencyFilter] = useState('all');

  // Mark CV status helpers
  const markAsCvDownloaded = async (candidateId: string) => {
    try {
      const res = await api(`/api/candidates/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvDownloaded: true }),
      });
      if (!res.ok) throw new Error();
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, cvDownloaded: true } : c));
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
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, cvDownloaded: false } : c));
      showToast('Candidate marked as CV Available');
    } catch (err) {
      console.error('Failed to mark CV as available:', err);
      showToast('Failed to mark CV as available', 'error');
    }
  };

  // Visa Status Modals State
  const [visaModalId, setVisaModalId] = useState<string | null>(null);
  const [visaNumberInput, setVisaNumberInput] = useState('');
  const [cancelVisaModalId, setCancelVisaModalId] = useState<string | null>(null);
  const [cancelVisaNumberInput, setCancelVisaNumberInput] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Custom states
  const [previewCv, setPreviewCv] = useState<any | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Template Changer states
  const [templateChangeTarget, setTemplateChangeTarget] = useState<BrokerCandidate | 'bulk' | null>(null);
  const [isChangingTemplate, setIsChangingTemplate] = useState(false);

  const [downloadAllOpen, setDownloadAllOpen] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadingCv, setDownloadingCv] = useState<any | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'jpg' | 'doc' | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [renderingCandidates, setRenderingCandidates] = useState<any[]>([]);
  const cvRenderRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

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

  // Move candidates state
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [selectedTargetBrokerId, setSelectedTargetBrokerId] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  const [brokerSearchQuery, setBrokerSearchQuery] = useState('');
  const [lockingCandidateId, setLockingCandidateId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const menuBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const toastTimeoutRef = useRef<any>(null);
  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success', autoClose = true) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ msg, type });
    if (autoClose) {
      toastTimeoutRef.current = setTimeout(() => {
        setToast(null);
      }, 3000);
    }
  }, []);

  const [actionLoading, setActionLoading] = useState(false);

  const handleBulkMarkAsCvAvailable = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to mark ${selectedIds.length} selected candidates as CV Available?`)) return;

    setActionLoading(true);
    try {
      const res = await api('/api/candidates/bulk-cv-downloaded', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateIds: selectedIds, cvDownloaded: false }),
      });
      if (!res.ok) throw new Error('Failed to update candidates');
      
      showToast(`${selectedIds.length} candidates marked as CV Available`);
      
      // Update local state
      setCandidates(prev => prev.map(c => selectedIds.includes(c.id) ? { ...c, cvDownloaded: false } : c));
      setSelectedIds([]);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to update candidates', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Close menu on outside click, scroll, or resize
  useEffect(() => {
    if (!openMenuId) return;
    function close(e: Event) {
      const target = e.target as HTMLElement;
      if (e.type === 'mousedown' && target.closest('[data-action-menu]')) return;
      setOpenMenuId(null);
      setMenuCoords(null);
    }
    window.addEventListener('mousedown', close, true);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close, true);
    return () => {
      window.removeEventListener('mousedown', close, true);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close, true);
    };
  }, [openMenuId]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredCandidates.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(v => v !== id));
    }
  };

  // Helper to extract candidate template ID
  const getNormalizedTemplateId = (c: BrokerCandidate) => {
    const cvs = c.generatedCVs || [];
    const firstCV = cvs[0];
    if (!firstCV) return null;
    const templateId = firstCV.templateId;
    return templateId ? templateId.replace('tmpl-', '').toLowerCase() : null;
  };

  // Open single CV preview modal (fetching details dynamically)
  const handleOpenCV = async (candidate: any) => {
    const activeTemplate = getNormalizedTemplateId(candidate) || 'alm';

    try {
      setIsPreviewLoading(true);
      const res = await api(`/api/candidates/${candidate.id}`);
      if (!res.ok) throw new Error('Failed to fetch details');
      const fullCandidate = await res.json();

      setPreviewCv({
        id: candidate.id,
        templateId: activeTemplate,
        facePhotoUrl: candidate.facePhotoUrl,
        fullBodyPhotoUrl: candidate.fullBodyPhotoUrl,
        candidate: fullCandidate
      });
    } catch (err) {
      console.error(err);
      showToast('Failed to load candidate CV', 'error');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Template change handler
  const handleConfirmChangeTemplate = async (newTemplateId: string) => {
    if (!templateChangeTarget) return;
    setIsChangingTemplate(true);

    try {
      const isBulk = templateChangeTarget === 'bulk';
      if (isBulk) {
        let successCount = 0;
        for (const candidateId of selectedIds) {
          const candidate = candidates.find(c => c.id === candidateId);
          if (!candidate) continue;
          const existingCv = candidate.generatedCVs?.[0];
          if (existingCv) {
            await api(`/api/generated-cvs/${existingCv.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ templateId: newTemplateId }),
            });
          } else {
            await api('/api/generated-cvs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                candidateId,
                templateId: newTemplateId,
                facePhotoUrl: candidate.facePhotoUrl,
                fullBodyPhotoUrl: candidate.fullBodyPhotoUrl
              }),
            });
          }
          successCount++;
        }
        showToast(`Template changed to "${newTemplateId.toUpperCase()}" for ${successCount} candidates`);
        setSelectedIds([]);
      } else {
        const candidate = templateChangeTarget;
        const existingCv = candidate.generatedCVs?.[0];
        if (existingCv) {
          await api(`/api/generated-cvs/${existingCv.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templateId: newTemplateId }),
          });
        } else {
          await api('/api/generated-cvs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              candidateId: candidate.id,
              templateId: newTemplateId,
              facePhotoUrl: candidate.facePhotoUrl,
              fullBodyPhotoUrl: candidate.fullBodyPhotoUrl
            }),
          });
        }
        showToast(`Template updated to "${newTemplateId.toUpperCase()}"`);
      }
      setTemplateChangeTarget(null);
      fetchBrokerData();
    } catch (err) {
      console.error(err);
      showToast('Failed to change template', 'error');
    } finally {
      setIsChangingTemplate(false);
    }
  };

  // Toggle Visa Selected
  const toggleRequested = async (id: string, current: boolean, visaNum?: string) => {
    setOpenMenuId(null);
    setVisaModalId(null);
    setVisaNumberInput('');
    setCancelVisaModalId(null);
    setCancelVisaNumberInput('');

    const cand = candidates.find(c => c.id === id);
    if (!current && cand && (!cand.generatedCVs || cand.generatedCVs.length === 0) && cand.job !== 'Calling') {
      alert("Generate CV first. The candidate must have a Generated CV to be marked as Visa Selected.");
      return;
    }

    try {
      const bodyPayload: any = { 
        isRequested: !current,
        visaSelected: !current,
        status: !current ? 'visa selected' : 'pending'
      };
      if (!current && visaNum) {
        bodyPayload.visaOrContractNumber = visaNum;
      } else if (current) {
        bodyPayload.visaOrContractNumber = null; // Clear if cancelled
      }

      console.log('Sending toggleRequested payload:', bodyPayload);
      const res = await api(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      console.log('toggleRequested response status:', res.status);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update status');
      }
      
      setCandidates(prev => prev.map(c => c.id === id ? { 
        ...c, 
        isRequested: !current, 
        visaSelected: !current,
        status: !current ? 'visa selected' : 'pending',
        visaOrContractNumber: bodyPayload.visaOrContractNumber 
      } : c));
      showToast(!current ? 'Visa Selected status updated!' : 'Visa Selection cancelled!');
    } catch (err: any) { 
      console.error(err);
      alert(err.message || 'Failed to update status'); 
    }
  };

  // Inline Medical Status change handler
  const handleUpdateMedicalStatus = async (candidateId: string, newStatus: string) => {
    try {
      const res = await api(`/api/candidates/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicalStatus: newStatus }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update medical status');
      }
      setCandidates(prev => prev.map(c =>
        c.id === candidateId ? { ...c, medicalStatus: newStatus } : c
      ));
      showToast(`Medical status updated to ${newStatus}`);
      if (newStatus === 'Unfit') {
        fetchBrokerData();
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to update medical status', 'error');
    }
  };

  // Toggle Flag Status
  const handleToggleFlag = async (candidateId: string, currentFlagged: boolean) => {
    setOpenMenuId(null);
    try {
      const res = await api(`/api/candidates/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFlagged: !currentFlagged }),
      });
      if (!res.ok) throw new Error();
      setCandidates(prev => prev.map(c =>
        c.id === candidateId ? { ...c, isFlagged: !currentFlagged } : c
      ));
      showToast(!currentFlagged ? 'Candidate Flagged' : 'Candidate Unflagged');
    } catch {
      showToast('Failed to update flag status', 'error');
    }
  };

  // Delete Candidate
  const handleDeleteCandidate = async (candidateId: string) => {
    setOpenMenuId(null);
    if (!confirm('Are you sure you want to delete this candidate?')) return;
    try {
      const res = await api(`/api/candidates/${candidateId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setCandidates(prev => prev.filter(c => c.id !== candidateId));
      setSelectedIds(prev => prev.filter(id => id !== candidateId));
      showToast('Candidate deleted successfully');
    } catch {
      showToast('Failed to delete candidate', 'error');
    }
  };

  // Single CV download handler
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

  // Single CV download effect (similar to generated-cvs page)
  useEffect(() => {
    if (!downloadingCv || !downloadFormat || !cvRenderRef.current) return;
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
            candidateId: downloadingCv.candidateId || downloadingCv.id,
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

        const candidateId = downloadingCv.candidate?.id || downloadingCv.candidateId || downloadingCv.id;
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
  }, [downloadingCv, downloadFormat]);

  // Bulk ZIP CVs download handler
  const handleBulkDownload = async (format: 'pdf' | 'jpg' | 'doc') => {
    // Check if any selected candidates are locked
    const lockedSelected = selectedIds.some(id => candidates.find(cand => cand.id === id)?.isLocked);
    if (lockedSelected) {
      showToast('Locked candidates were excluded from download', 'error');
    }

    // Only download candidates matching the active visa option
    const candidatesToDownload = selectedIds.filter(id => {
      const c = candidates.find(cand => cand.id === id);
      if (!c) return false;
      // Block locked candidates
      if (c.isLocked) return false;
      // Do not download candidates whose medical status is fit
      if (c.medicalStatus?.toLowerCase() === 'fit') return false;
      if (visaFilter === 'visa-selected') return c.visaSelected === true;
      return c.visaSelected !== true;
    });

    if (candidatesToDownload.length === 0) {
      showToast('No downloadable candidates selected (Fit candidates can only be downloaded from the Fit Candidates page)', 'error', true);
      return;
    }

    setIsDownloadingAll(true);
    setDownloadAllOpen(false);
    isCancelledRef.current = false;

    setDownloadTask({
      type: 'bulk',
      format,
      progress: 0,
      total: candidatesToDownload.length,
      status: 'pending',
      message: 'Initializing bulk export...',
      candidateIds: candidatesToDownload
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
          body: JSON.stringify({ candidateIds: candidatesToDownload, format })
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
        a.download = `Broker_Candidates_CVs_DOC.zip`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 2000);
        setDownloadTask(prev => prev ? { ...prev, progress: candidatesToDownload.length, status: 'complete', message: 'Download complete!' } : null);
      } else {
        // PDF and JPG format download via optimized client zipping
        setDownloadTask(prev => prev ? { ...prev, status: 'processing', message: 'Fetching candidate details in batch...' } : null);
        const batchRes = await api('/api/cv/candidates-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateIds: candidatesToDownload })
        });
        if (isCancelledRef.current) throw new Error('Cancelled');
        if (!batchRes.ok) throw new Error('Failed to fetch candidate details');
        const candidatesData = await batchRes.json();

        const JSZip = (await import('jszip')).default;
        const htmlToImage = await import('html-to-image');
        const { jsPDF } = await import('jspdf');
        const zip = new JSZip();

        const CHUNK_SIZE = 5;
        for (let i = 0; i < candidatesData.length; i += CHUNK_SIZE) {
          if (isCancelledRef.current) throw new Error('Cancelled');
          const chunk = candidatesData.slice(i, i + CHUNK_SIZE);
          setRenderingCandidates(chunk);
          await bgWait(60);

          await Promise.all(chunk.map(async (candidate: any) => {
            if (isCancelledRef.current) return;
            const element = document.getElementById(`bulk-render-${candidate.id}`);
            if (!element) return;

            const pData = candidate.passportData || {};
            const pNo = pData.passportNumber || candidate.passportNumber || candidate.id.slice(-6);
            const givenNames = pData.givenNames || candidate.givenNames || '';
            const surname = pData.surname || candidate.surname || '';
            const namePart = `${givenNames}_${surname}`.trim().replace(/\s+/g, '_');

            const rawTemplateId = candidate.latestCVTemplate || 'alm';
            const templateId = rawTemplateId.replace('tmpl-', '').toLowerCase();
            const templateObj = TEMPLATES.find(t => t.id === templateId);
            const templateName = templateObj ? templateObj.name.replace(/\s+/g, '_') : 'ALAALAM';

            const safeName = `${namePart}_${templateName}_${pNo}`.replace(/[^a-zA-Z0-9_]/g, '');

            if (isCancelledRef.current) return;
            const dataUrl = await htmlToImage.toJpeg(element, {
              quality: 0.90,
              backgroundColor: '#ffffff',
              pixelRatio: 1.5,
              fontEmbedCSS: '',
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

            setDownloadTask(prev => {
              if (!prev) return null;
              const nextProgress = Math.min(prev.progress + 1, prev.total);
              return {
                ...prev,
                progress: nextProgress,
                status: 'processing',
                message: `Rendering CVs: ${nextProgress}/${prev.total}`
              };
            });
          }));
        }

        if (isCancelledRef.current) throw new Error('Cancelled');
        setRenderingCandidates([]);
        setDownloadTask(prev => prev ? { ...prev, status: 'generating_zip', message: 'Generating ZIP file...' } : null);
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        if (isCancelledRef.current) throw new Error('Cancelled');
        const url = window.URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Broker_Candidates_CVs_${format.toUpperCase()}.zip`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 2000);
        setDownloadTask(prev => prev ? { ...prev, status: 'complete', message: 'Download complete!' } : null);

        // Update cvDownloaded status on server
        await api('/api/candidates/bulk-cv-downloaded', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateIds: candidatesToDownload, cvDownloaded: true }),
        });
      }

      // Local state updates
      setCandidates(prev => prev.map(c => candidatesToDownload.includes(c.id) ? { ...c, cvDownloaded: true } : c));
      setSelectedIds([]);
    } catch (err: any) {
      console.error(err);
      if (isCancelledRef.current || err.message === 'Cancelled') {
        setDownloadTask(prev => prev ? { ...prev, status: 'cancelled', message: 'Download cancelled.' } : null);
      } else {
        showToast(err.message || 'Failed to download CVs', 'error', true);
        setDownloadTask(prev => prev ? { ...prev, status: 'failed', message: err.message || 'Download failed.' } : null);
      }
    } finally {
      setIsDownloadingAll(false);
      setRenderingCandidates([]);
      timerWorker.terminate();
    }
  };

  const handleToggleCandidateLock = async (candidateId: string, currentlyLocked: boolean) => {
    setLockingCandidateId(candidateId);
    try {
      const res = await api(`/api/candidates/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: !currentlyLocked }),
      });
      if (!res.ok) throw new Error('Failed');
      setCandidates(prev => prev.map(c =>
        c.id === candidateId ? { ...c, isLocked: !currentlyLocked } : c
      ));
      showToast(currentlyLocked ? 'Candidate unlocked' : 'Candidate locked');
    } catch {
      showToast('Failed to update lock status', 'error');
    } finally {
      setLockingCandidateId(null);
    }
  };

  const fetchBrokerData = async () => {
    try {
      setIsLoading(true);
      const res = await api(`/api/brokers/${brokerId}/candidates?interval=ALL`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setBroker(data);
      setCandidates(data.candidates || []);
    } catch (err) {
      console.error('Failed to fetch broker candidates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBrokers = async () => {
    try {
      const res = await api('/api/brokers');
      const data = await res.json();
      if (Array.isArray(data)) {
        setBrokers(data);
      }
    } catch (err) {
      console.error('Failed to fetch brokers:', err);
    }
  };

  const handleMoveSelectedCandidates = async () => {
    if (selectedIds.length === 0 || !selectedTargetBrokerId) return;
    setIsMoving(true);
    try {
      const res = await api('/api/brokers/move-candidates-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateIds: selectedIds,
          targetBrokerId: selectedTargetBrokerId
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Candidates moved successfully');
        setMoveModalOpen(false);
        setSelectedTargetBrokerId('');
        setBrokerSearchQuery('');
        setSelectedIds([]);
        fetchBrokerData();
      } else {
        showToast(data.error || 'Failed to move candidates', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to move candidates', 'error');
    } finally {
      setIsMoving(false);
    }
  };

  useEffect(() => {
    fetchBrokerData();
  }, [brokerId]);

  // Client-side filtering
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      // 1. Search Query
      const name = `${c.givenNames} ${c.surname}`.toLowerCase();
      const passport = c.passportNumber.toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch = name.includes(query) || passport.includes(query);

      // 2. Visa Status Filter
      const matchesVisa = visaFilter === 'visa-selected'
        ? c.visaSelected === true
        : c.visaSelected !== true;

      // 3. Religion Filter
      const matchesReligion = !religionFilter
        ? true
        : religionFilter === 'muslim'
          ? (c.religion?.toLowerCase() === 'muslim' || c.religion?.toLowerCase() === 'islam')
          : (c.religion?.toLowerCase() !== 'muslim' && c.religion?.toLowerCase() !== 'islam');

      // 4. Flagged Filter
      const matchesFlagged = flaggedFilter
        ? flaggedFilter === 'flagged' ? c.isFlagged === true : c.isFlagged === false
        : true;

      // 5. Agency Filter
      const matchesAgency = agencyFilter === 'all'
        ? true
        : getNormalizedTemplateId(c) === agencyFilter.toLowerCase();

      return matchesSearch && matchesVisa && matchesReligion && matchesFlagged && matchesAgency;
    });
  }, [candidates, searchQuery, visaFilter, religionFilter, flaggedFilter, agencyFilter]);

  // Reset pagination on filter changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [searchQuery, visaFilter, religionFilter, flaggedFilter, agencyFilter]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredCandidates.length / ITEMS_PER_PAGE);
  const paginatedCandidates = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCandidates.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCandidates, currentPage]);

  return (
    <div className="space-y-8 animate-fade-in pb-12 w-full px-4 md:px-8">
      {/* Hidden container for optimized bulk rendering */}
      <div style={{ position: 'fixed', top: -9999, left: -9999, width: '210mm', zIndex: -1 }}>
        {renderingCandidates.map(c => {
          const firstCv = c.generatedCVs?.[0];
          const rawTemplateId = firstCv ? (typeof firstCv === 'string' ? firstCv : firstCv.templateId) : 'alm';
          const templateId = rawTemplateId.replace('tmpl-', '').toLowerCase();
          const FolderTemplate = TEMPLATES.find(t => t.id === templateId)?.component || ALMTemplate;

          return (
            <div key={c.id} id={`bulk-render-${c.id}`} style={{ width: '210mm', backgroundColor: '#ffffff' }}>
              <FolderTemplate
                candidate={c}
                facePhoto={getFileUrl(c.facePhotoUrl || c.passportImageUrl)}
                fullBodyPhoto={getFileUrl(c.fullBodyPhotoUrl)}
              />
            </div>
          );
        })}
      </div>
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
          <button
            onClick={() => {
              if (broker?.leaderId) {
                router.push(`/brokers/leader/${broker.leaderId}`);
              } else {
                router.push('/brokers');
              }
            }}
            className="w-12 h-12 bg-surface border border-border/50 rounded-2xl flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <nav className="flex items-center gap-2 text-text-tertiary text-xs font-bold uppercase tracking-widest mb-1">
              <span 
                className="hover:text-primary cursor-pointer transition-colors" 
                onClick={() => {
                  if (broker?.leaderId) {
                    router.push(`/brokers/leader/${broker.leaderId}`);
                  } else {
                    router.push('/brokers');
                  }
                }}
              >
                Brokers
              </span>
              <ChevronRight size={12} />
              <span className="text-primary/60">Portfolio</span>
            </nav>
            <h1 className="text-4xl font-black text-text-primary tracking-tight flex items-center gap-3">
              {broker?.name || 'Recruitment Source'}
              {broker?.isLocked && (
                <div className="bg-red-50 text-red-600 px-3 py-1 rounded-full border border-red-100 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                  <Lock size={12} />
                  <span>Locked</span>
                </div>
              )}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-primary/5 border border-primary/10 rounded-[2rem] px-6 py-4">
          <div className="text-right">
            <p className="text-[10px] text-primary/60 uppercase font-black tracking-widest leading-none font-bold">Total Candidates</p>
            <p className="text-2xl font-black text-primary leading-none mt-1">{candidates.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Users size={20} />
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-surface rounded-3xl border border-border/50 p-6 space-y-6">
        {/* Visa Selected / Pending Visa toggle and search */}
        <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
          <div className="flex-1 relative group w-full">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search within this portfolio..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 h-14 bg-gray-50/50 border border-border/50 rounded-2xl text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 w-full lg:w-auto">
            {/* Visa Status Filter Tabs */}
            <div className="bg-gray-100 p-1.5 rounded-2xl flex items-center gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => setVisaFilter('pending')}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-widest cursor-pointer",
                  visaFilter === 'pending'
                    ? "bg-white text-text-primary shadow-md"
                    : "text-text-tertiary hover:bg-white/50"
                )}
              >
                Pending Visa
              </button>
              <button
                type="button"
                onClick={() => setVisaFilter('visa-selected')}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-widest cursor-pointer",
                  visaFilter === 'visa-selected'
                    ? "bg-white text-text-primary shadow-md"
                    : "text-text-tertiary hover:bg-white/50"
                )}
              >
                Visa Selected
              </button>
            </div>
          </div>
        </div>

        {/* Filters and Actions Bar */}
        <div className="flex flex-wrap items-center gap-4 justify-between pt-4 border-t border-border/50">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Religion dropdown */}
            <div className="w-full sm:w-44">
              <Select
                placeholder="All Religions"
                value={religionFilter}
                onChange={setReligionFilter}
                options={[
                  { value: '', label: 'All Religions' },
                  { value: 'muslim', label: 'Muslim' },
                  { value: 'non-muslim', label: 'Non-Muslim' }
                ]}
              />
            </div>
            {/* Flagged dropdown */}
            <div className="w-full sm:w-44">
              <Select
                placeholder="Unflagged Candidates"
                value={flaggedFilter}
                onChange={setFlaggedFilter}
                options={[
                  { value: '', label: 'All Candidates' },
                  { value: 'flagged', label: 'Flagged Only' },
                  { value: 'unflagged', label: 'Unflagged Only' }
                ]}
              />
            </div>
          </div>

          {(searchQuery || religionFilter || flaggedFilter !== 'unflagged' || agencyFilter !== 'all') && (
            <button
              onClick={() => { setSearchQuery(''); setReligionFilter(''); setFlaggedFilter('unflagged'); setAgencyFilter('all'); }}
              className="px-4 py-2.5 rounded-xl text-[10px] font-black text-red-500 uppercase tracking-widest hover:bg-red-50 transition-colors flex items-center gap-2 border border-red-200"
            >
              <Trash2 size={12} /> Clear All Filters
            </button>
          )}
        </div>

        {/* Agency Tab Filter Tabs Bar */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <span className="text-xs font-bold text-text-tertiary uppercase tracking-wider mr-2 hidden md:inline-block">Agency CV:</span>
            {AGENCIES.map(agency => {
              const isActive = agencyFilter === agency.id;
              return (
                <button
                  key={agency.id}
                  onClick={() => setAgencyFilter(agency.id)}
                  className={cn(
                    "px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer border",
                    isActive
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-surface text-text-secondary border-border hover:bg-gray-50/50 hover:text-text-primary"
                  )}
                >
                  {agency.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected candidates Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border/50 animate-in fade-in slide-in-from-top-2">
            <span className="text-xs font-bold text-primary px-3 py-1.5 bg-primary/10 rounded-lg">
              {selectedIds.length} Candidate{selectedIds.length > 1 ? 's' : ''} Selected
            </span>

            {/* Change Template Button */}
            <button
              onClick={() => setTemplateChangeTarget('bulk')}
              disabled={isChangingTemplate}
              className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-dark transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isChangingTemplate ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <LayoutTemplate size={14} />
              )}
              Change Template
            </button>

            {/* Move Candidates Button */}
            <button
              onClick={() => {
                fetchBrokers();
                setMoveModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <ArrowRightLeft size={14} />
              Move Candidates
            </button>

            {/* Download Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDownloadAllOpen(prev => !prev)}
                disabled={isDownloadingAll}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isDownloadingAll ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                Download CVs
                <ChevronDown size={12} className={`transition-transform duration-200 ${downloadAllOpen ? 'rotate-180' : ''}`} />
              </button>

              {downloadAllOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white border border-border rounded-xl shadow-xl overflow-hidden z-30 animate-in fade-in slide-in-from-top-2">
                  <button
                    onClick={() => handleBulkDownload('pdf')}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-text-primary hover:bg-surface transition-colors font-semibold cursor-pointer text-left"
                  >
                    <FileDown size={14} className="text-red-500" /> As PDF
                  </button>
                  <button
                    onClick={() => handleBulkDownload('jpg')}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-text-primary hover:bg-surface transition-colors border-t border-border font-semibold cursor-pointer text-left"
                  >
                    <ImageIcon size={14} className="text-emerald-500" /> As JPG
                  </button>
                  <button
                    onClick={() => handleBulkDownload('doc')}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-text-primary hover:bg-surface transition-colors border-t border-border font-semibold cursor-pointer text-left"
                  >
                    <FileText size={14} className="text-blue-500" /> As DOCX
                  </button>
                </div>
              )}
            </div>

            {/* Cancel Selection button */}
            <button
              onClick={() => setSelectedIds([])}
              className="px-4 py-2 bg-gray-100 text-text-secondary text-xs font-bold rounded-xl hover:bg-gray-200 transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Table Feed */}
      <div className="bg-surface rounded-[2rem] border border-border/30 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-border/30 text-[10px] uppercase tracking-wider font-bold text-text-tertiary/90">
                <th className="px-6 py-4 w-10 text-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                    checked={filteredCandidates.length > 0 && selectedIds.length === filteredCandidates.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-6 py-4 font-semibold">Candidate Details</th>
                <th className="px-6 py-4 font-semibold">Passport Number</th>
                <th className="px-6 py-4 font-semibold">Visa Status</th>
                <th className="px-6 py-4 font-semibold">Medical Status</th>
                <th className="px-6 py-4 font-semibold">CV Preview</th>
                <th className="px-6 py-4 font-semibold">Agency</th>
                {role === 'super_admin' ? (
                  <th className="px-6 py-4 hidden lg:table-cell font-semibold">Price</th>
                ) : (
                  <th className="px-6 py-4 hidden lg:table-cell font-semibold">Registered Date</th>
                )}
                <th className="px-6 py-4 font-semibold">Open</th>
                <th className="px-6 py-4 text-right pr-12 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={32} className="text-primary animate-spin" />
                      <p className="text-sm font-medium text-text-tertiary">Syncing portfolio...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedCandidates.length > 0 ? (
                paginatedCandidates.map((candidate) => {
                  const activeTmplId = getNormalizedTemplateId(candidate);
                  return (
                    <tr
                      key={candidate.id}
                      className="hover:bg-gray-50/30 transition-colors group relative"
                    >
                      <td className="px-6 py-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                          checked={selectedIds.includes(candidate.id)}
                          onChange={(e) => handleSelect(candidate.id, e.target.checked)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary font-bold text-sm border border-primary-100 overflow-hidden shrink-0">
                            {candidate.facePhotoUrl ? (
                              <img src={getFileUrl(candidate.facePhotoUrl)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span>{candidate.givenNames.charAt(0)}{candidate.surname.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-text-primary text-sm flex items-center gap-1.5">
                              {candidate.givenNames} {candidate.surname}
                              {candidate.isLocked && (
                                <Lock size={12} className="text-red-500 fill-red-100 shrink-0" />
                              )}
                              {candidate.isFlagged && (
                                <Flag size={12} className="text-red-500 fill-red-500 shrink-0" />
                              )}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Briefcase size={10} className="text-primary/60" />
                              <p className="text-[9px] xl:text-[10px] text-text-tertiary font-bold uppercase tracking-wider">{candidate.job || 'Unassigned'}</p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-text-secondary text-xs xl:text-sm tracking-tight">{candidate.passportNumber}</span>
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (candidate.visaSelected) {
                            setCancelVisaModalId(candidate.id);
                            setCancelVisaNumberInput('');
                          } else {
                            setVisaModalId(candidate.id);
                            setVisaNumberInput('');
                          }
                        }}
                      >
                        {candidate.visaSelected ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-colors">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Visa Selected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Pending Visa
                          </span>
                        )}
                      </td>
                      {/* Inline Medical Status updates */}
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={candidate.medicalStatus || 'Pending'}
                          onChange={(e) => handleUpdateMedicalStatus(candidate.id, e.target.value)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer outline-none transition-all",
                            candidate.medicalStatus === 'Fit' && "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
                            candidate.medicalStatus === 'Unfit' && "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
                            candidate.medicalStatus === 'Pending' && "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100",
                            candidate.medicalStatus === 'New' && "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                          )}
                        >
                          <option value="New">New</option>
                          <option value="Pending">Pending</option>
                          <option value="Fit">Fit</option>
                          <option value="Unfit">Unfit</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {broker?.isLocked ? (
                          <div className="text-red-600 bg-red-50 border border-red-100 px-2.5 py-1.5 rounded-xl flex items-center justify-center gap-1 font-bold inline-flex" title="Broker is locked. CV is in backup.">
                            <Lock size={12} />
                            <span className="text-[10px] uppercase tracking-wider font-semibold">Backup</span>
                          </div>
                        ) : candidate.isLocked ? (
                          <div className="text-red-605 bg-red-50/70 border border-red-200/60 px-2.5 py-1.5 rounded-xl flex items-center justify-center gap-1.5 font-extrabold inline-flex text-xs cursor-not-allowed select-none" title="Candidate is locked. CV is unavailable.">
                            <Lock size={12} className="text-red-500" />
                            <span className="text-[10px] uppercase tracking-wider">Locked</span>
                          </div>
                        ) : candidate.generatedCVs?.[0] ? (
                          <button
                            onClick={() => handleOpenCV(candidate)}
                            className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-1.5 font-bold shadow-sm cursor-pointer"
                            title="Open CV Preview"
                          >
                            <Eye size={14} />
                            <span className="text-[10px] uppercase tracking-wider">Preview</span>
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">No CV</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {activeTmplId ? (() => {
                          const tmpl = TEMPLATES.find(t => t.id === activeTmplId);
                          return (
                            <span
                              className={`rounded-lg px-2.5 py-1 text-[8px] xl:text-[9px] font-bold uppercase tracking-widest shadow-sm border ${tmpl?.textColor || 'text-text-secondary'} ${tmpl?.bgLight || 'bg-gray-50'} ${tmpl?.textColor ? 'border-' + tmpl.textColor.split('-')[1] + '-100' : 'border-gray-200'}`}
                            >
                              {tmpl?.name || activeTmplId.toUpperCase()}
                            </span>
                          );
                        })() : (
                          <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell whitespace-nowrap">
                        {role === 'super_admin' ? (
                          <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
                            <input
                              type="text"
                              value={candidate.price || ''}
                              onChange={(e) => {
                                const newPrice = e.target.value;
                                setCandidates(prev => prev.map(cand => cand.id === candidate.id ? { ...cand, price: newPrice } : cand));
                              }}
                              onBlur={async (e) => {
                                try {
                                  await api(`/api/candidates/${candidate.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ price: e.target.value })
                                  });
                                  showToast('Price updated successfully');
                                } catch (err) {
                                  console.error(err);
                                  showToast('Failed to update price', 'error');
                                }
                              }}
                              placeholder="Set Price"
                              className="w-28 px-2.5 py-1.5 text-xs border border-border rounded-xl bg-surface text-text-primary outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-semibold"
                            />
                          </div>
                        ) : (
                          <span className="text-xs xl:text-sm font-bold text-text-secondary">
                            {new Date(candidate.registeredAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => router.push(`/candidates/${candidate.id}`)}
                          className="px-3 py-1.5 text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white border border-primary/20 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-sm hover:shadow-primary/20"
                        >
                          Open
                          <ArrowRight size={10} />
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right pr-12 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block" data-action-menu>
                          <button
                            ref={(el) => { menuBtnRefs.current[candidate.id] = el; }}
                            onClick={() => {
                              if (openMenuId === candidate.id) {
                                setOpenMenuId(null);
                                setMenuCoords(null);
                              } else {
                                const btn = menuBtnRefs.current[candidate.id];
                                if (btn) {
                                  const rect = btn.getBoundingClientRect();
                                  setMenuCoords({ top: rect.bottom + 4, left: rect.right - 208 });
                                }
                                setOpenMenuId(candidate.id);
                              }
                            }}
                            className="p-1.5 rounded-xl hover:bg-gray-100 text-text-tertiary hover:text-primary transition-colors cursor-pointer"
                            title="Actions"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {openMenuId === candidate.id && menuCoords && createPortal(
                            <div
                              className="w-52 bg-white border border-border rounded-xl shadow-2xl py-1 text-left"
                              style={{ position: 'fixed', top: menuCoords.top, left: menuCoords.left, zIndex: 9999 }}
                              data-action-menu
                            >
                              <button
                                onClick={() => { setOpenMenuId(null); setMenuCoords(null); router.push(`/candidates/${candidate.id}`); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-text-primary font-semibold cursor-pointer"
                              >
                                <ChevronRight size={16} className="text-text-secondary" />
                                <span>View Details</span>
                              </button>

                              <button
                                onClick={() => { setOpenMenuId(null); setMenuCoords(null); setTemplateChangeTarget(candidate); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-text-primary font-semibold cursor-pointer"
                              >
                                <LayoutTemplate size={16} className="text-text-secondary" />
                                <span>Change Template</span>
                              </button>

                              <button
                                onClick={() => handleToggleFlag(candidate.id, candidate.isFlagged || false)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-text-primary font-semibold cursor-pointer"
                              >
                                <Flag size={16} className={cn("text-text-secondary", candidate.isFlagged && "text-red-500 fill-red-500")} />
                                <span>{candidate.isFlagged ? 'Unflag Candidate' : 'Flag Candidate'}</span>
                              </button>

                              {role !== 'genaral' && (
                                <button
                                  onClick={() => handleToggleCandidateLock(candidate.id, candidate.isLocked || false)}
                                  disabled={lockingCandidateId === candidate.id}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-text-primary font-semibold cursor-pointer"
                                >
                                  {lockingCandidateId === candidate.id ? (
                                    <Loader2 size={16} className="animate-spin" />
                                  ) : (
                                    <Lock size={16} className="text-text-secondary" />
                                  )}
                                  <span>{candidate.isLocked ? 'Unlock Candidate' : 'Lock Candidate'}</span>
                                </button>
                              )}


                              <div className="border-t border-border/60 my-1" />

                              <button
                                onClick={() => { setOpenMenuId(null); setMenuCoords(null); handleDeleteCandidate(candidate.id); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors text-red-600 font-semibold cursor-pointer"
                              >
                                <Trash2 size={16} />
                                <span>Delete</span>
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
                  <td colSpan={10} className="px-6 py-12 text-center text-text-tertiary text-sm">
                    <div className="max-w-xs mx-auto py-8">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-gray-200">
                        <Search size={24} className="text-text-tertiary opacity-40" />
                      </div>
                      <h3 className="text-base font-bold text-text-primary mb-1">No Candidates Found</h3>
                      <p className="text-text-tertiary text-xs font-semibold mb-6">No candidates in this portfolio match your current filters.</p>
                      <Button variant="outline" className="rounded-xl h-10 px-6 font-bold uppercase tracking-widest text-[10px] cursor-pointer" onClick={() => { setSearchQuery(''); setReligionFilter(''); setFlaggedFilter('unflagged'); setAgencyFilter('all'); }}>
                        Reset All Filters
                      </Button>
                    </div>
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

      {/* Modals & Overlays */}

      {/* Change Template Modal */}
      {templateChangeTarget && (() => {
        const isBulk = templateChangeTarget === 'bulk';
        const currentTmpl = isBulk ? '' : (getNormalizedTemplateId(templateChangeTarget) || '');

        return (
          <ChangeTemplateModal
            candidate={isBulk ? { givenNames: 'Selected', surname: 'Candidates' } : templateChangeTarget}
            currentTemplateId={currentTmpl}
            onChange={handleConfirmChangeTemplate}
            onClose={() => setTemplateChangeTarget(null)}
            isLoading={isChangingTemplate}
          />
        );
      })()}

      {/* Preview CV Modal */}
      {previewCv && (() => {
        const PrevTemplate = TEMPLATES.find(t => t.id === previewCv.templateId)?.component || ALMTemplate;
        return (
          <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in" onClick={() => setPreviewCv(null)}>
            <div className="relative my-8 bg-white rounded-xl shadow-2xl flex flex-col items-center max-w-full scale-in" onClick={e => e.stopPropagation()}>
              <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                {/* Download option buttons inside preview modal */}
                {previewCv.candidate?.personalInfo?.medicalStatus?.toLowerCase() === 'fit' ? (
                  <div className="flex items-center bg-[#059669] text-white text-xs font-bold px-4 py-2.5 rounded-xl backdrop-blur-md border border-[#a7f3d0]">
                    Medical Status: Fit (Download in Fit Candidates page)
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-black/50 p-1.5 rounded-xl backdrop-blur-md">
                    <button
                      onClick={() => startDownload(previewCv, 'pdf')}
                      disabled={isDownloading}
                      className="text-xs font-semibold text-white flex items-center gap-1 hover:bg-white/20 px-2.5 py-1.5 rounded-lg disabled:opacity-50 cursor-pointer"
                    >
                      <FileDown size={14} className="text-red-400" /> PDF
                    </button>
                    <span className="text-white/30 font-light">|</span>
                    <button
                      onClick={() => startDownload(previewCv, 'jpg')}
                      disabled={isDownloading}
                      className="text-xs font-semibold text-white flex items-center gap-1 hover:bg-white/20 px-2.5 py-1.5 rounded-lg disabled:opacity-50 cursor-pointer"
                    >
                      <ImageIcon size={14} className="text-emerald-400" /> JPG
                    </button>
                    <span className="text-white/30 font-light">|</span>
                    <button
                      onClick={() => startDownload(previewCv, 'doc')}
                      disabled={isDownloading}
                      className="text-xs font-semibold text-white flex items-center gap-1 hover:bg-white/20 px-2.5 py-1.5 rounded-lg disabled:opacity-50 cursor-pointer"
                    >
                      <FileText size={14} className="text-blue-400" /> DOCX
                    </button>
                  </div>
                )}

                <button onClick={() => setPreviewCv(null)} className="w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black transition-colors backdrop-blur-md cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              <div className="w-[800px] max-w-full shrink-0 bg-white shadow-xl relative mt-16 rounded-b-xl overflow-hidden animate-in zoom-in-95 duration-200">
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

      {/* Preview Loading Spinner */}
      {isPreviewLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-3">
            <Loader2 size={32} className="text-primary animate-spin" />
            <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Fetching CV Details...</p>
          </div>
        </div>
      )}

      {/* Move Candidates Modal */}
      {moveModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border/80 rounded-[2rem] w-full max-w-md shadow-2xl p-8 relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => { setMoveModalOpen(false); setSelectedTargetBrokerId(''); setBrokerSearchQuery(''); }}
              className="absolute right-6 top-6 text-text-tertiary hover:text-text-primary hover:bg-border/50 p-2 rounded-xl transition-all cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 shrink-0">
                <ArrowRightLeft size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-primary">Move Candidates</h3>
                <p className="text-sm text-text-tertiary mt-1">
                  Move <span className="font-semibold text-text-primary">{selectedIds.length} selected candidate(s)</span> to another broker.
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <label className="block text-xs uppercase tracking-wider font-bold text-text-tertiary">
                Select Destination Broker:
              </label>

              {/* Search input for brokers */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search destination broker..."
                  value={brokerSearchQuery}
                  onChange={e => setBrokerSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 h-10 bg-surface border border-border/50 rounded-xl text-xs text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                />
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {brokers
                  .filter(b => b.id !== brokerId)
                  .filter(b => b.name.toLowerCase().includes(brokerSearchQuery.toLowerCase()))
                  .map(otherBroker => (
                    <label
                      key={otherBroker.id}
                      className={cn(
                        "flex items-center gap-3 p-4 border rounded-2xl transition-all cursor-pointer",
                        selectedTargetBrokerId === otherBroker.id
                          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                          : "border-border/50 hover:border-primary/30 bg-surface-hover/20"
                      )}
                    >
                      <input
                        type="radio"
                        name="targetBroker"
                        value={otherBroker.id}
                        checked={selectedTargetBrokerId === otherBroker.id}
                        onChange={() => setSelectedTargetBrokerId(otherBroker.id)}
                        className="w-4 h-4 text-primary border-border focus:ring-primary/20 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text-primary truncate">{otherBroker.name}</p>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary text-sm font-black shrink-0">
                        {otherBroker.name.charAt(0).toUpperCase()}
                      </div>
                    </label>
                  ))}
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => { setMoveModalOpen(false); setSelectedTargetBrokerId(''); setBrokerSearchQuery(''); }}
                className="flex-1 h-12 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleMoveSelectedCandidates}
                loading={isMoving}
                disabled={!selectedTargetBrokerId}
                className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/15 cursor-pointer"
              >
                Move Selected
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Visa Selected Modal */}
      {visaModalId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setVisaModalId(null)}>
          <div className="bg-white rounded-[1.5rem] shadow-2xl max-w-md w-full overflow-hidden scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border bg-gray-50">
              <h3 className="font-bold text-text-primary text-lg flex items-center gap-2">
                <CheckCircle className="text-green-600" size={20} /> Insert Visa / Contract Details
              </h3>
              <button onClick={() => setVisaModalId(null)} className="text-text-tertiary hover:text-text-primary p-1 rounded-lg hover:bg-gray-200 transition-colors">✕</button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-semibold text-text-primary mb-2">Insert contract number or visa number</label>
              <Input 
                autoFocus
                placeholder="e.g. VIS-123456 or CON-7890" 
                value={visaNumberInput} 
                onChange={(e) => setVisaNumberInput(e.target.value)} 
                className="w-full"
              />
            </div>
            <div className="p-5 border-t border-border flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setVisaModalId(null)} className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors">
                Cancel
              </button>
              <button 
                disabled={!visaNumberInput.trim()}
                onClick={() => toggleRequested(visaModalId, false, visaNumberInput.trim())}
                className="px-6 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md hover:shadow-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Visa Modal */}
      {cancelVisaModalId && (() => {
        const candidate = candidates.find(c => c.id === cancelVisaModalId);
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
                  Are you sure you want to cancel the visa selection for <strong className="text-text-primary">{candidate ? `${candidate.givenNames} ${candidate.surname}` : 'this candidate'}</strong>?
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
                  onClick={() => toggleRequested(cancelVisaModalId, true)}
                  className="px-6 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md hover:shadow-lg"
                >
                  Confirm Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Toast Alert */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* CV Download Progress Panel */}
      {downloadTask && (
        <div className="fixed bottom-6 right-6 z-[120] w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-100 p-4.5 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-[#464479] flex items-center gap-1.5">
              {downloadTask.status === 'processing' || downloadTask.status === 'pending' || downloadTask.status === 'generating_zip' ? (
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
              ) : downloadTask.status === 'complete' ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : downloadTask.status === 'cancelled' ? (
                <X className="w-3.5 h-3.5 text-slate-505" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
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
                    handleBulkDownload(downloadTask.format);
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
    </div>
  );
}

// ── Change-Template Modal ─────────────────────────────────────────────────────
function ChangeTemplateModal({
  candidate,
  currentTemplateId,
  onChange,
  onClose,
  isLoading,
}: {
  candidate: any;
  currentTemplateId: string;
  onChange: (newTemplateId: string) => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);

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
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Change CV Template</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Select a new design layout for <strong>{candidate.givenNames} {candidate.surname}</strong>
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 transition-colors text-text-tertiary hover:text-text-primary cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TEMPLATES.map(template => {
              const TC = template.component;
              const isSelected = selected === template.id;
              const isCurrent = template.id === currentTemplateId;

              return (
                <button
                  key={template.id}
                  onClick={() => setSelected(template.id)}
                  disabled={isCurrent}
                  className={cn(
                    'relative rounded-2xl border-2 overflow-hidden transition-all text-left flex flex-col cursor-pointer bg-white group',
                    isCurrent && 'opacity-65 cursor-not-allowed border-gray-200 bg-gray-50',
                    isSelected
                      ? 'border-primary shadow-lg shadow-primary/10 scale-[1.02]'
                      : 'border-border/60 hover:border-primary/40'
                  )}
                >
                  <div className="h-44 bg-gray-100 overflow-hidden relative border-b border-border/40 shrink-0">
                    <div className="origin-top-left scale-[0.22] w-[800px] absolute top-0 left-0 pointer-events-none">
                      <TC
                        candidate={candidate.id ? candidate : {
                          passportData: { givenNames: 'FIRSTNAME', surname: 'LASTNAME', passportNumber: 'AB123456', nationality: 'NATIONALITY', gender: 'F', placeOfBirth: 'BIRTHPLACE', dateOfBirth: '1995-01-01', dateOfIssue: '2020-01-01', dateOfExpiry: '2030-01-01', issuingCountry: 'COUNTRY' },
                          personalInfo: { idNumber: '1234567890', job: 'HOUSEMAID', maritalStatus: 'Single', numberOfChildren: 0, religion: 'Christian', phone: '0501234567', languages: ['English', 'Somali'], workExperience: [], skills: [] }
                        }}
                        facePhoto="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                        fullBodyPhoto="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                      />
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow z-10">
                        <Check size={12} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                        <span className="bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">Active</span>
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-2 flex items-center gap-2 mt-auto">
                    <span className={cn('w-2 h-2 rounded-full shrink-0', template.color)} />
                    <span className="text-xs font-bold text-text-primary truncate">{template.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-text-secondary hover:bg-gray-100 transition-colors border border-border cursor-pointer">
            Cancel
          </button>
          <button
            onClick={() => selected && onChange(selected)}
            disabled={!selected || isLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-colors disabled:opacity-50 rounded-xl cursor-pointer shadow-md hover:shadow-lg"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <LayoutTemplate size={16} />
            )}
            {isLoading ? 'Changing…' : 'Change Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Toast Component
function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in fade-in slide-in-from-bottom-3">
      <div className={cn(
        "flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium",
        type === 'success' ? 'bg-gray-900' : 'bg-red-600'
      )}>
        {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
        {msg}
      </div>
    </div>
  );
}
