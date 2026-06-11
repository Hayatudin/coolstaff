'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardList, Loader2, MoreVertical, CheckCircle, Trash2, Edit3, Eye, UserCheck,
  Download, ChevronDown, FileText, Image as ImageIcon, FileDown, X, AlertCircle,
  Flag, LayoutTemplate, Check, AlertTriangle
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { api } from '@/lib/api';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Candidate } from '@/types';

import { useCandidates, clearCandidatesCache } from '@/hooks/useCandidates';
import { cn, getFileUrl } from '@/lib/utils';

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

export default function FitCandidatesPage() {
  const router = useRouter();
  const { candidates: allCandidates, isLoading, mutate } = useCandidates();
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [flaggedFilter, setFlaggedFilter] = useState('unflagged');
  const [agencyFilter, setAgencyFilter] = useState('all');
  const [visaFilter, setVisaFilter] = useState<'visa-selected' | 'pending'>('pending');
  const [cvStatusFilter, setCvStatusFilter] = useState<'cv-available' | 'cv-downloaded'>('cv-available');

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Mark CV status helpers
  const markAsCvDownloaded = async (id: string) => {
    try {
      const res = await api(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvDownloaded: true }),
      });
      if (!res.ok) throw new Error();
      mutate(prev => prev.map(c => c.id === id ? { ...c, cvDownloaded: true } : c));
    } catch (err) {
      console.error('Failed to mark CV as downloaded:', err);
    }
  };

  const markAsCvAvailable = async (id: string) => {
    try {
      const res = await api(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvDownloaded: false }),
      });
      if (!res.ok) throw new Error();
      mutate(prev => prev.map(c => c.id === id ? { ...c, cvDownloaded: false } : c));
      showToast('Candidate marked as CV Available');
    } catch (err) {
      console.error('Failed to mark CV as available:', err);
      showToast('Failed to mark CV as available', 'error');
    }
  };

  // Selection & Modal states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewCv, setPreviewCv] = useState<any | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [downloadAllOpen, setDownloadAllOpen] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadingCv, setDownloadingCv] = useState<any | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'jpg' | 'doc' | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const cvRenderRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Template Change States
  const [changeTarget, setChangeTarget] = useState<any | null>(null); // Candidate object or 'bulk'
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-action-menu]')) setOpenMenuId(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Filter candidates list
  const fitCandidates = useMemo(() => {
    return allCandidates.filter(c => c.personalInfo.medicalStatus === 'Fit');
  }, [allCandidates]);

  // Helper to extract candidate template ID
  const getNormalizedTemplateId = (c: Candidate) => {
    const cvs = c.generatedCVs || [];
    const firstCV = cvs[0];
    if (!firstCV) return null;
    const templateId = typeof firstCV === 'string' ? firstCV : firstCV.templateId;
    return templateId ? templateId.replace('tmpl-', '').toLowerCase() : null;
  };

  const filtered = useMemo(() => {
    return fitCandidates.filter(c => {
      // 1. Search Query
      const name = `${c.passportData.givenNames} ${c.passportData.surname}`.toLowerCase();
      const passport = c.passportData.passportNumber.toLowerCase();
      const shelfId = (c.shelfId || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch = name.includes(query) || passport.includes(query) || shelfId.includes(query);

      // 2. Language Filter
      const matchesLanguage = !languageFilter
        ? true
        : languageFilter === 'muslim'
          ? (c.personalInfo.religion?.toLowerCase() === 'muslim' || c.personalInfo.religion?.toLowerCase() === 'islam')
          : (c.personalInfo.religion?.toLowerCase() !== 'muslim' && c.personalInfo.religion?.toLowerCase() !== 'islam');

      // 3. Flagged Filter
      const matchesFlagged = flaggedFilter
        ? flaggedFilter === 'flagged' ? c.isFlagged === true : c.isFlagged === false
        : true;

      // 4. Agency (template) Filter
      const matchesAgency = agencyFilter === 'all'
        ? true
        : getNormalizedTemplateId(c) === agencyFilter.toLowerCase();

      // 5. Visa Status Filter
      const matchesVisa = visaFilter === 'visa-selected'
        ? c.visaSelected === true
        : c.visaSelected !== true;

      // 6. CV Status Filter
      const matchesCvStatus = cvStatusFilter === 'cv-downloaded'
        ? c.cvDownloaded === true
        : c.cvDownloaded !== true;

      return matchesSearch && matchesLanguage && matchesFlagged && matchesAgency && matchesVisa && matchesCvStatus;
    });
  }, [fitCandidates, searchQuery, languageFilter, flaggedFilter, agencyFilter, visaFilter, cvStatusFilter]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [searchQuery, languageFilter, flaggedFilter, agencyFilter, visaFilter, cvStatusFilter]);

  const deleteCandidate = async (id: string) => {
    setOpenMenuId(null);
    if (!confirm('Are you sure you want to delete this candidate?')) return;
    try {
      const res = await api(`/api/candidates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      mutate(prev => prev.filter(c => c.id !== id));
      setSelectedIds(prev => prev.filter(v => v !== id));
      showToast('Candidate deleted successfully');
    } catch {
      showToast('Failed to delete candidate', 'error');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filtered.map(c => c.id));
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

  const toggleFlag = async (id: string, current: boolean) => {
    setOpenMenuId(null);
    try {
      const res = await api(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFlagged: !current }),
      });
      if (!res.ok) throw new Error();
      mutate(prev => prev.map(c => c.id === id ? { ...c, isFlagged: !current } : c));
      showToast(!current ? 'Candidate Flagged' : 'Candidate Unflagged');
    } catch {
      showToast('Failed to update flag status', 'error');
    }
  };

  const handleOpenCV = async (candidate: Candidate) => {
    setOpenMenuId(null);
    const templateId = getNormalizedTemplateId(candidate) || 'alm';

    try {
      setIsPreviewLoading(true);
      const res = await api(`/api/candidates/${candidate.id}`);
      if (!res.ok) throw new Error('Failed to fetch details');
      const fullCandidate = await res.json();

      setPreviewCv({
        id: candidate.id,
        templateId,
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

  const startDownload = (cv: any, format: 'pdf' | 'jpg' | 'doc') => {
    setDownloadingCv(cv);
    setDownloadFormat(format);
  };

  // Single CV template changing
  const handleConfirmChange = async (newTemplateId: string) => {
    if (!changeTarget) return;
    setActionLoading(true);
    try {
      const isBulk = changeTarget === 'bulk';
      if (isBulk) {
        let successCount = 0;
        for (const id of selectedIds) {
          const cand = fitCandidates.find(c => c.id === id);
          if (!cand) continue;
          const cv = cand.generatedCVs?.[0];
          const cvId = typeof cv === 'object' ? cv?.id : null;

          try {
            if (cvId) {
              await api(`/api/generated-cvs/${cvId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templateId: newTemplateId }),
              });
            } else {
              await api('/api/generated-cvs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  candidateId: cand.id,
                  templateId: newTemplateId,
                  facePhotoUrl: cand.facePhotoUrl,
                  fullBodyPhotoUrl: cand.fullBodyPhotoUrl,
                }),
              });
            }
            successCount++;
          } catch (err) {
            console.error(err);
          }
        }
        clearCandidatesCache();
        await mutate();
        showToast(`Successfully updated templates for ${successCount} candidates`);
        setSelectedIds([]);
        setChangeTarget(null);
      } else {
        const cv = changeTarget.generatedCVs?.[0];
        const cvId = typeof cv === 'object' ? cv?.id : null;

        if (cvId) {
          const res = await api(`/api/generated-cvs/${cvId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templateId: newTemplateId }),
          });
          if (!res.ok) throw new Error();
        } else {
          const res = await api('/api/generated-cvs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              candidateId: changeTarget.id,
              templateId: newTemplateId,
              facePhotoUrl: changeTarget.facePhotoUrl,
              fullBodyPhotoUrl: changeTarget.fullBodyPhotoUrl,
            }),
          });
          if (!res.ok) throw new Error();
        }
        clearCandidatesCache();
        await mutate();
        showToast('Template updated successfully');
        setChangeTarget(null);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to update template', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Single CV download capturing handler
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

        const candidateId = downloadingCv.candidate?.id || downloadingCv.candidateId || downloadingCv.id;
        if (candidateId) {
          await markAsCvDownloaded(candidateId);
        }
      } catch (e) {
        if (!cancelled) showToast('Download failed', 'error');
      } finally {
        if (!cancelled) { setIsDownloading(false); setDownloadingCv(null); setDownloadFormat(null); }
      }
    })();

    return () => { cancelled = true; };
  }, [downloadingCv, downloadFormat]);

  // Bulk ZIP CV download handler
  const handleBulkDownload = async (format: 'pdf' | 'jpg' | 'doc') => {
    if (selectedIds.length === 0) return;
    setIsDownloadingAll(true);
    setDownloadAllOpen(false);

    try {
      const JSZip = (await import('jszip')).default;
      const htmlToImage = await import('html-to-image');
      const zip = new JSZip();

      // Create hidden container for rendering
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:800px;z-index:-1;';
      document.body.appendChild(container);

      const { createRoot } = await import('react-dom/client');

      for (let i = 0; i < selectedIds.length; i++) {
        const candidateId = selectedIds[i];
        const candidateSummary = allCandidates.find(c => c.id === candidateId);
        if (!candidateSummary) continue;

        const safeName = `${candidateSummary.passportData.givenNames || ''}_${candidateSummary.passportData.surname || ''}`.replace(/[^a-zA-Z0-9_]/g, '');
        showToast(`Processing ${i + 1}/${selectedIds.length}: ${candidateSummary.passportData.givenNames}...`);

        try {
          // Fetch full candidate details
          const detailRes = await api(`/api/candidates/${candidateId}`);
          if (!detailRes.ok) throw new Error('Failed to fetch details');
          const fullCandidate = await detailRes.json();

          const templateId = getNormalizedTemplateId(fullCandidate) || 'alm';
          const FolderTemplate = TEMPLATES.find(t => t.id === templateId)?.component || ALMTemplate;

          const facePhoto = getFileUrl(fullCandidate.facePhotoUrl || fullCandidate.passportImageUrl);
          const fullBodyPhoto = getFileUrl(fullCandidate.fullBodyPhotoUrl);

          if (format === 'doc') {
            const payload = {
              candidateId,
              templateId: `tmpl-${templateId}`,
              format: 'doc',
              deadline: fullCandidate.cvDeadline || new Date().toISOString().split('T')[0],
              facePhoto,
              fullBodyPhoto
            };
            const response = await api('/api/cv/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('DOCX generation failed');
            const blob = await response.blob();
            zip.file(`${safeName}.docx`, blob);
          } else {
            const wrapper = document.createElement('div');
            container.appendChild(wrapper);
            const root = createRoot(wrapper);

            await new Promise<void>((resolve) => {
              root.render(
                React.createElement(FolderTemplate, {
                  candidate: fullCandidate,
                  facePhoto,
                  fullBodyPhoto,
                })
              );
              setTimeout(resolve, 100);
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

            if (format === 'jpg') {
              const imgRes = await fetch(dataUrl);
              const blob = await imgRes.blob();
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
        } catch (err) {
          console.error(err);
          showToast(`Error processing ${candidateSummary.passportData.givenNames}`, 'error');
        }
      }

      document.body.removeChild(container);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Fit_Candidates_CVs_${format.toUpperCase()}.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 2000);
      showToast('Download complete!');

      // Bulk update cvDownloaded status
      try {
        await api('/api/candidates/bulk-cv-downloaded', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateIds: selectedIds, cvDownloaded: true }),
        });
        mutate(prev => prev.map(c => selectedIds.includes(c.id) ? { ...c, cvDownloaded: true } : c));
        setSelectedIds([]);
      } catch (bulkErr) {
        console.error('Failed to bulk mark candidates as downloaded:', bulkErr);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to download CVs', 'error');
    } finally {
      setIsDownloadingAll(false);
    }
  };

  // Pagination Slice
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedCandidates = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50"><UserCheck size={22} className="text-emerald-600" /></div>
            Fit Candidates
          </h1>
          <p className="text-text-secondary mt-1 ml-12">Candidates who are marked as Medically Fit</p>
        </div>

        {/* Counter */}
        {!isLoading && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100 self-start md:self-auto">
            <span className="text-2xl font-black text-emerald-600 leading-none">{filtered.length}</span>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/70 leading-none mb-0.5">Showing</span>
              <span className="text-xs font-semibold text-emerald-600 leading-none">Fit Candidates</span>
            </div>
            {filtered.length !== fitCandidates.length && (
              <div className="ml-3 pl-3 border-l border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-wider">Total Fit</span>
                <p className="text-sm font-black text-emerald-600/80 leading-none">{fitCandidates.length}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters Container */}
      <div className="bg-surface rounded-[2rem] border border-border/30 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:flex-1 md:max-w-md">
            <Input placeholder="Search by name, passport, or ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 w-full md:w-auto">
            {/* CV Status Filter Tabs */}
            <div className="bg-gray-100 p-1.5 rounded-2xl flex items-center gap-1 shadow-inner">
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

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-t border-border pt-4">
          <div className="flex w-full sm:w-auto items-center gap-3">
            <div className="w-full sm:w-44">
              <Select
                placeholder="All Religion"
                value={languageFilter}
                onChange={setLanguageFilter}
                options={[
                  { value: '', label: 'All Religions' },
                  { value: 'muslim', label: 'Muslim' },
                  { value: 'non-muslim', label: 'Non-Muslim' }
                ]}
              />
            </div>
            <div className="w-full sm:w-44">
              <Select
                placeholder="All Candidates"
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

          {(searchQuery || languageFilter || flaggedFilter !== 'unflagged' || agencyFilter !== 'all') && (
            <button
              onClick={() => { setSearchQuery(''); setLanguageFilter(''); setFlaggedFilter('unflagged'); setAgencyFilter('all'); }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-[10px] font-black text-red-500 uppercase tracking-widest hover:bg-red-50 transition-colors flex items-center justify-center gap-2 border border-red-200 cursor-pointer"
            >
              <Trash2 size={12} /> Clear All Filters
            </button>
          )}
        </div>

        {/* Agency Template Filter Tabs Bar */}
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
      </div>

      {/* Main Table Card Container */}
      <div className="bg-surface rounded-[2rem] border border-border/30 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-border/30 text-[10px] uppercase tracking-wider font-bold text-text-tertiary/90">
                <th className="px-6 py-4 w-12 text-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                    checked={filtered.length > 0 && filtered.every(c => selectedIds.includes(c.id))}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-6 py-4 font-semibold">Shelf ID</th>
                <th className="px-6 py-4 font-semibold">Candidate</th>
                <th className="px-6 py-4 font-semibold">Passport No.</th>
                <th className="px-6 py-4 font-semibold">Medical Status</th>
                <th className="px-6 py-4 font-semibold hidden xl:table-cell">Active Template</th>
                <th className="px-6 py-4 font-semibold text-center w-24">Preview</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={32} className="text-primary animate-spin" />
                      <p className="text-sm font-medium text-text-tertiary">Loading candidates...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedCandidates.length > 0 ? (
                paginatedCandidates.map(c => {
                  const activeTmpl = getNormalizedTemplateId(c);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                          checked={selectedIds.includes(c.id)}
                          onChange={(e) => handleSelect(c.id, e.target.checked)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-mono font-bold inline-block border border-gray-200/60 shadow-sm">
                          {c.shelfId || 'UNASSIGNED'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                            <span className="text-emerald-600 font-bold text-sm">
                              {c.passportData.givenNames.charAt(0)}{c.passportData.surname.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-text-primary text-sm">
                                {c.passportData.givenNames} {c.passportData.surname}
                              </span>
                              {c.isFlagged && (
                                <Flag size={14} className="text-red-500 fill-red-500 animate-pulse" />
                              )}
                            </div>
                            <span className="text-xs text-text-tertiary hidden sm:block">{c.personalInfo.phone || 'No Phone'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                        {c.passportData.passportNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Fit
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden xl:table-cell">
                        {activeTmpl ? (
                          <span className="px-2.5 py-1 text-[10px] uppercase font-bold bg-blue-50 text-blue-700 border border-blue-100 rounded-lg">
                            {activeTmpl}
                          </span>
                        ) : (
                          <span className="text-xs text-text-tertiary">No Template</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleOpenCV(c)}
                          className="p-1.5 text-text-tertiary hover:text-primary hover:bg-gray-50 rounded-lg transition-colors border border-border/30 inline-flex items-center justify-center cursor-pointer"
                          title="Preview CV"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative inline-block" data-action-menu>
                          <button
                            onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)}
                            className="text-text-tertiary hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-gray-100"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {openMenuId === c.id && (
                            <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-border rounded-xl shadow-2xl z-50 py-1 animate-fade-in">
                              <button
                                onClick={() => { setOpenMenuId(null); setChangeTarget(c); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left text-text-primary font-semibold"
                              >
                                <LayoutTemplate size={16} className="text-text-secondary" />
                                <span>Change Template</span>
                              </button>

                              <button
                                onClick={() => toggleFlag(c.id, c.isFlagged || false)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left text-text-primary font-semibold"
                              >
                                <Flag size={16} className={cn("text-text-secondary", c.isFlagged && "text-red-500 fill-red-500")} />
                                <span>{c.isFlagged ? 'Unflag Candidate' : 'Flag Candidate'}</span>
                              </button>

                              {c.cvDownloaded && (
                                <button
                                  onClick={() => { setOpenMenuId(null); markAsCvAvailable(c.id); }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left text-emerald-600 font-semibold"
                                >
                                  <CheckCircle size={16} className="text-emerald-600" />
                                  <span>Mark as CV Available</span>
                                </button>
                              )}

                              <div className="border-t border-border/60 my-1" />

                              <button
                                onClick={() => deleteCandidate(c.id)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors text-left text-red-600 font-semibold"
                              >
                                <Trash2 size={16} />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-tertiary text-sm">
                    No fit candidates found matching the filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination component */}
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

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-surface/90 backdrop-blur-md border border-border/80 rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-4 animate-in slide-in-from-bottom-6 duration-300">
          <span className="text-sm font-bold text-text-primary">
            {selectedIds.length} Selected
          </span>
          <div className="h-6 w-px bg-border" />

          {/* Change template bulk */}
          <button
            onClick={() => setChangeTarget('bulk')}
            className="px-4 py-2.5 bg-white border border-border text-text-primary hover:bg-gray-50 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <LayoutTemplate size={14} className="text-primary" />
            Change Template
          </button>

          <div className="relative">
            <button
              onClick={() => setDownloadAllOpen(prev => !prev)}
              disabled={isDownloadingAll}
              className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-dark transition-all flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
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
              <div className="absolute bottom-full right-0 mb-2 w-48 bg-white border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2">
                <button
                  onClick={() => handleBulkDownload('pdf')}
                  className="w-full flex items-center gap-2 px-4 py-3 text-xs text-text-primary hover:bg-surface transition-colors font-semibold cursor-pointer text-left"
                >
                  <FileDown size={14} className="text-red-500" /> As PDF
                </button>
                <button
                  onClick={() => handleBulkDownload('jpg')}
                  className="w-full flex items-center gap-2 px-4 py-3 text-xs text-text-primary hover:bg-surface transition-colors border-t border-border font-semibold cursor-pointer text-left"
                >
                  <ImageIcon size={14} className="text-emerald-500" /> As JPG
                </button>
                <button
                  onClick={() => handleBulkDownload('doc')}
                  className="w-full flex items-center gap-2 px-4 py-3 text-xs text-text-primary hover:bg-surface transition-colors border-t border-border font-semibold cursor-pointer text-left"
                >
                  <FileText size={14} className="text-blue-500" /> As DOCX
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setSelectedIds([])}
            className="px-4 py-2.5 bg-gray-100 text-text-secondary text-xs font-bold rounded-xl hover:bg-gray-200 transition-all cursor-pointer"
          >
            Deselect
          </button>
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

      {/* Preview CV Modal */}
      {previewCv && (() => {
        const PrevTemplate = TEMPLATES.find(t => t.id === previewCv.templateId)?.component || ALMTemplate;
        return (
          <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={() => setPreviewCv(null)}>
            <div className="relative my-8 bg-white rounded-xl shadow-2xl flex flex-col items-center max-w-full" onClick={e => e.stopPropagation()}>
              <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
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

      {/* Change Template Modal */}
      {changeTarget && (() => {
        const isBulk = changeTarget === 'bulk';
        const currentTmpl = isBulk ? 'alm' : (getNormalizedTemplateId(changeTarget) || 'alm');

        return (
          <ChangeTemplateModal
            candidate={isBulk ? { passportData: { givenNames: 'Selected', surname: 'Candidates' } } : changeTarget}
            currentTemplateId={currentTmpl}
            onChange={handleConfirmChange}
            onClose={() => setChangeTarget(null)}
            isLoading={actionLoading}
          />
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

      {/* Toast Alert */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}
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
              Select a new design layout for <strong>{candidate.passportData?.givenNames} {candidate.passportData?.surname}</strong>
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 transition-colors text-text-tertiary hover:text-text-primary">
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
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-text-secondary hover:bg-gray-100 transition-colors border border-border">
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
