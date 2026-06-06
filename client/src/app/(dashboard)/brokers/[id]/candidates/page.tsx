'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Users, Loader2, Search, ArrowLeft, Calendar, FileText, User, 
  ChevronRight, Filter, Download, Trash2, Edit3, Briefcase, 
  MapPin, Phone, Mail, Clock, CheckCircle2, AlertCircle,
  MoreVertical, CheckCircle, Eye, CalendarDays, X, Lock, 
  FileDown, ImageIcon, LayoutTemplate, Check, AlertTriangle, PackageOpen, ChevronDown
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Broker, Candidate } from '@/types';
import Badge from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { getFileUrl } from '@/lib/utils';

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

type Interval = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

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
}

export default function BrokerCandidatesPage() {
  const params = useParams();
  const router = useRouter();
  const brokerId = params.id as string;

  const [broker, setBroker] = useState<Broker | null>(null);
  const [candidates, setCandidates] = useState<BrokerCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [interval, setInterval] = useState<Interval>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Custom states
  const [previewCv, setPreviewCv] = useState<any | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [bulkChangeOpen, setBulkChangeOpen] = useState(false);
  const [isChangingTemplate, setIsChangingTemplate] = useState(false);
  const [downloadAllOpen, setDownloadAllOpen] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadingCv, setDownloadingCv] = useState<any | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'jpg' | 'doc' | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const cvRenderRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(candidates.map(c => c.id));
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

  // Open single CV preview modal (fetching details dynamically)
  const handleOpenCV = async (candidate: any) => {
    const cvDetails = candidate.generatedCVs?.[0];
    if (!cvDetails) {
      showToast('No CV generated for this candidate', 'error');
      return;
    }
    
    try {
      setIsPreviewLoading(true);
      const res = await api(`/api/candidates/${candidate.id}`);
      if (!res.ok) throw new Error('Failed to fetch details');
      const fullCandidate = await res.json();
      
      setPreviewCv({
        id: cvDetails.id,
        templateId: cvDetails.templateId,
        facePhotoUrl: cvDetails.facePhotoUrl,
        fullBodyPhotoUrl: cvDetails.fullBodyPhotoUrl,
        candidate: fullCandidate
      });
    } catch (err) {
      console.error(err);
      showToast('Failed to load candidate CV', 'error');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Bulk template change (POST if new, PATCH if existing)
  const handleBulkChangeTemplate = async (newTemplateId: string) => {
    if (selectedIds.length === 0) return;
    setIsChangingTemplate(true);
    setBulkChangeOpen(false);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const candidateId of selectedIds) {
      const candidate = candidates.find(c => c.id === candidateId);
      if (!candidate) continue;
      
      const existingCv = candidate.generatedCVs?.[0];
      try {
        if (existingCv) {
          const res = await api(`/api/generated-cvs/${existingCv.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templateId: newTemplateId }),
          });
          if (res.ok) successCount++; else failCount++;
        } else {
          const res = await api('/api/generated-cvs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              candidateId, 
              templateId: newTemplateId,
              facePhotoUrl: candidate.facePhotoUrl,
              fullBodyPhotoUrl: candidate.fullBodyPhotoUrl
            }),
          });
          if (res.ok) successCount++; else failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }
    
    setIsChangingTemplate(false);
    const newTemplateName = TEMPLATES.find(t => t.id === newTemplateId)?.name;
    showToast(`Template changed to "${newTemplateName}" for ${successCount} candidates${failCount > 0 ? ` (${failCount} failed)` : ''}`, 'success');
    
    fetchBrokerData();
    setSelectedIds([]);
  };

  // Single CV download handler
  const startDownload = (cv: any, format: 'pdf' | 'jpg' | 'doc') => {
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

  // Bulk ZIP CVs download handler
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
        const candidateSummary = candidates.find(c => c.id === candidateId);
        if (!candidateSummary) continue;
        
        const safeName = `${candidateSummary.givenNames || ''}_${candidateSummary.surname || ''}`.replace(/[^a-zA-Z0-9_]/g, '');
        showToast(`Processing ${i + 1}/${selectedIds.length}: ${candidateSummary.givenNames}...`);

        try {
          // Fetch full candidate details
          const detailRes = await api(`/api/candidates/${candidateId}`);
          if (!detailRes.ok) throw new Error('Failed to fetch details');
          const fullCandidate = await detailRes.json();
          
          const templateId = fullCandidate.latestCVTemplate || 'alm';
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
          showToast(`Error processing ${candidateSummary.givenNames}`, 'error');
        }
      }

      document.body.removeChild(container);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Broker_Candidates_CVs_${format.toUpperCase()}.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 2000);
      showToast('Download complete!');
    } catch (err) {
      console.error(err);
      showToast('Failed to download CVs', 'error');
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const fetchBrokerData = async () => {
    try {
      setIsLoading(true);
      let url = `/api/brokers/${brokerId}/candidates?search=${searchQuery}&interval=${interval}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      
      const res = await api(url);
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

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBrokerData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, interval, brokerId, startDate, endDate]);

  const intervals: { label: string, value: Interval }[] = [
    { label: 'All Time', value: 'ALL' },
    { label: 'Today', value: '1D' },
    { label: 'Last Week', value: '1W' },
    { label: 'Last Month', value: '1M' },
    { label: 'Last Year', value: '1Y' },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12 max-w-7xl mx-auto px-4">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push('/brokers')}
            className="w-12 h-12 bg-surface border border-border/50 rounded-2xl flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <nav className="flex items-center gap-2 text-text-tertiary text-xs font-bold uppercase tracking-widest mb-1">
              <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => router.push('/brokers')}>Brokers</span>
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
            <p className="text-[10px] text-primary/60 uppercase font-black tracking-widest leading-none">Total Candidates</p>
            <p className="text-2xl font-black text-primary leading-none mt-1">{candidates.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Users size={20} />
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-surface rounded-3xl border border-border/50 p-6 space-y-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 relative group">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-primary transition-colors" />
            <input 
              type="text"
              placeholder="Search within this portfolio..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 h-14 bg-gray-50/50 border border-border/50 rounded-2xl text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg font-medium"
            />
          </div>
          
          <div className="bg-gray-50/50 border border-border/50 rounded-2xl p-1.5 flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {intervals.map((item) => (
              <button
                key={item.value}
                onClick={() => {
                  setInterval(item.value);
                  setStartDate('');
                  setEndDate('');
                }}
                className={`px-6 py-3 rounded-xl text-xs font-black transition-all whitespace-nowrap uppercase tracking-widest ${
                  interval === item.value && !startDate && !endDate
                    ? 'bg-primary text-white ' 
                    : 'text-text-tertiary hover:bg-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-border/50">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => { setStartDate(e.target.value); setInterval('ALL'); }}
                  className="bg-gray-50/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm font-bold text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer hover:bg-white"
                />
              </div>
              <span className="text-text-tertiary font-black text-[10px] uppercase tracking-widest">to</span>
              <div className="relative">
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => { setEndDate(e.target.value); setInterval('ALL'); }}
                  className="bg-gray-50/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm font-bold text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer hover:bg-white"
                />
              </div>
            </div>
          </div>
          {(startDate || endDate || searchQuery) && (
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); setSearchQuery(''); setInterval('ALL'); }}
              className="px-4 py-2.5 rounded-xl text-[10px] font-black text-danger uppercase tracking-widest hover:bg-danger/5 transition-colors flex items-center gap-2 ml-auto border border-danger/10"
            >
              <Trash2 size={12} /> Clear All Filters
            </button>
          )}
        </div>

        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border/50 animate-in fade-in slide-in-from-top-2">
            <span className="text-xs font-bold text-primary px-3 py-1.5 bg-primary/10 rounded-lg">
              {selectedIds.length} Candidate{selectedIds.length > 1 ? 's' : ''} Selected
            </span>
            
            {/* Change Template Button */}
            <button 
              onClick={() => setBulkChangeOpen(true)}
              disabled={isChangingTemplate}
              className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-dark transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isChangingTemplate ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <LayoutTemplate size={14} />
              )}
              Change Template
            </button>

            {/* Download Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setDownloadAllOpen(prev => !prev)}
                disabled={isDownloadingAll}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
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
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-text-primary hover:bg-surface transition-colors font-semibold"
                  >
                    <FileDown size={14} className="text-red-500" /> As PDF
                  </button>
                  <button 
                    onClick={() => handleBulkDownload('jpg')}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-text-primary hover:bg-surface transition-colors border-t border-border font-semibold"
                  >
                    <ImageIcon size={14} className="text-emerald-500" /> As JPG
                  </button>
                  <button 
                    onClick={() => handleBulkDownload('doc')}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-text-primary hover:bg-surface transition-colors border-t border-border font-semibold"
                  >
                    <FileText size={14} className="text-blue-500" /> As DOCX
                  </button>
                </div>
              )}
            </div>
            
            {/* Cancel Selection button */}
            <button 
              onClick={() => setSelectedIds([])}
              className="px-4 py-2 bg-gray-100 text-text-secondary text-xs font-bold rounded-xl hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Table Feed */}
      <div className="bg-surface rounded-[2.5rem] border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-border/50 text-[10px] uppercase tracking-[0.2em] text-text-tertiary font-black">
                <th className="px-3 xl:px-6 py-3.5 xl:py-6 w-10 text-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary"
                    checked={candidates.length > 0 && selectedIds.length === candidates.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-3 xl:px-6 py-3.5 xl:py-6">Candidate Details</th>
                <th className="px-3 xl:px-6 py-3.5 xl:py-6">Passport Number</th>
                <th className="px-3 xl:px-6 py-3.5 xl:py-6">CV</th>
                <th className="px-3 xl:px-6 py-3.5 xl:py-6">Agency</th>
                <th className="px-3 xl:px-6 py-3.5 xl:py-6 hidden lg:table-cell">Registered Date</th>
                <th className="px-3 xl:px-6 py-3.5 xl:py-6 text-right pr-4 xl:pr-12">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-3 xl:px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 size={40} className="text-primary animate-spin" />
                      <p className="text-text-tertiary font-bold uppercase tracking-widest text-[10px]">Syncing Portfolio...</p>
                    </div>
                  </td>
                </tr>
              ) : candidates.length > 0 ? (
                candidates.map((candidate: any) => (
                  <tr 
                    key={candidate.id} 
                    className="hover:bg-primary/[0.02] transition-all cursor-pointer group relative"
                    onClick={(e) => {
                      if (!(e.target as HTMLElement).closest('button')) {
                        router.push(`/candidates/${candidate.id}`);
                      }
                    }}
                  >
                    <td className="px-3 xl:px-6 py-3.5 xl:py-5 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary"
                        checked={selectedIds.includes(candidate.id)}
                        onChange={(e) => handleSelect(candidate.id, e.target.checked)}
                      />
                    </td>
                    <td className="px-3 xl:px-6 py-3.5 xl:py-5">
                      <div className="flex items-center gap-2 xl:gap-4">
                        <div className="w-8 h-8 xl:w-12 xl:h-12 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-primary font-black text-xs xl:text-sm border border-border group-hover:border-primary/30 group-hover:scale-105 transition-all duration-300 overflow-hidden shrink-0">
                          {candidate.facePhotoUrl ? (
                            <img src={getFileUrl(candidate.facePhotoUrl)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{candidate.givenNames.charAt(0)}{candidate.surname.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-text-primary text-xs xl:text-base group-hover:text-primary transition-colors">{candidate.givenNames} {candidate.surname}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Briefcase size={10} className="text-primary/60" />
                            <p className="text-[9px] xl:text-[10px] text-text-tertiary font-black uppercase tracking-wider">{candidate.job || 'Unassigned'}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 xl:px-6 py-3.5 xl:py-5">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono font-black text-text-secondary text-xs xl:text-sm tracking-tight">{candidate.passportNumber}</span>
                        <span className="text-[8px] xl:text-[9px] font-black text-text-tertiary uppercase tracking-widest hidden xl:block">Primary Document</span>
                      </div>
                    </td>
                    <td className="px-3 xl:px-6 py-3.5 xl:py-5" onClick={(e) => e.stopPropagation()}>
                      {broker?.isLocked ? (
                        <div className="text-red-600 bg-red-50 border border-red-100 px-2 xl:px-3 py-1.5 rounded-xl flex items-center justify-center gap-1 font-bold inline-flex" title="Broker is locked. CV is in backup.">
                          <Lock size={12} />
                          <span className="text-[10px] uppercase tracking-wider">Backup</span>
                        </div>
                      ) : candidate.generatedCVs?.[0] ? (
                        <button
                          onClick={() => handleOpenCV(candidate)}
                          className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-1.5 font-bold shadow-sm"
                          title="Open CV Preview"
                        >
                          <Eye size={14} />
                          <span className="text-[10px] uppercase tracking-wider">Open</span>
                        </button>
                      ) : (
                        <span className="text-[10px] font-black text-text-tertiary uppercase tracking-wider">No CV</span>
                      )}
                    </td>
                    <td className="px-3 xl:px-6 py-3.5 xl:py-5">
                      {candidate.generatedCVs?.[0] ? (() => {
                        const tmpl = TEMPLATES.find(t => t.id === candidate.generatedCVs[0].templateId);
                        return (
                          <Badge 
                            className={`rounded-lg px-2 xl:px-3 py-0.5 xl:py-1 text-[8px] xl:text-[9px] font-black uppercase tracking-widest shadow-sm ${tmpl?.textColor || 'text-text-secondary'} ${tmpl?.bgLight || 'bg-gray-50'}`}
                          >
                            {tmpl?.name || candidate.generatedCVs[0].templateId.toUpperCase()}
                          </Badge>
                        );
                      })() : (
                        <span className="text-[10px] font-black text-text-tertiary uppercase tracking-wider">None</span>
                      )}
                    </td>
                    <td className="px-3 xl:px-6 py-3.5 xl:py-5 hidden lg:table-cell">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs xl:text-sm font-bold text-text-secondary">
                          {new Date(candidate.registeredAt).toLocaleDateString(undefined, { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                        <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Entry Date</span>
                      </div>
                    </td>
                    <td className="px-3 xl:px-6 py-3.5 xl:py-5 text-right pr-4 xl:pr-12">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                        <button 
                          onClick={(e) => { e.stopPropagation(); router.push(`/candidates/${candidate.id}`); }}
                          className="p-1.5 xl:p-2.5 rounded-xl bg-primary text-white hover:bg-primary-600 transition-all "
                          title="View Details"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-3 xl:px-8 py-32 text-center">
                    <div className="max-w-xs mx-auto">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-dashed border-border">
                        <Search size={32} className="text-text-tertiary opacity-20" />
                      </div>
                      <h3 className="text-xl font-bold text-text-primary mb-2">No Candidates Found</h3>
                      <p className="text-text-tertiary text-sm font-medium mb-8">We couldn't find any candidates in this portfolio matching your current search or date filters.</p>
                      <Button variant="outline" className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px]" onClick={() => { setSearchQuery(''); setInterval('ALL'); setStartDate(''); setEndDate(''); }}>
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

      {/* Modals & Overlays */}
      
      {/* Bulk Change Template Modal */}
      {bulkChangeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setBulkChangeOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-text-primary">Bulk Change Template</h2>
                <p className="text-sm text-text-secondary mt-0.5">Move/Generate <strong>{selectedIds.length} selected candidate{selectedIds.length !== 1 ? 's' : ''}</strong> CVs to a new template</p>
              </div>
              <button onClick={() => setBulkChangeOpen(false)} className="p-2 rounded-lg hover:bg-surface transition-colors text-text-tertiary hover:text-text-primary"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {TEMPLATES.map(template => {
                  return (
                    <button
                      key={template.id}
                      onClick={() => handleBulkChangeTemplate(template.id)}
                      disabled={isChangingTemplate}
                      className="relative rounded-xl border border-border overflow-hidden hover:border-primary hover:shadow-md transition-all text-left group cursor-pointer disabled:opacity-50"
                    >
                      <div className="h-36 bg-gray-50 flex items-center justify-center relative">
                        <div className={`p-4 rounded-xl ${template.bgLight}`}>
                          <LayoutTemplate size={32} className={template.textColor} />
                        </div>
                      </div>
                      <div className="px-3 py-2 flex items-center gap-2 bg-white">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${template.color}`} />
                        <span className="text-sm font-semibold text-text-primary truncate">{template.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-gray-50/50">
              <button onClick={() => setBulkChangeOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface transition-colors border border-border">Cancel</button>
              <p className="text-xs text-text-tertiary">Click a template above to apply changes</p>
            </div>
          </div>
        </div>
      )}

      {/* Preview CV Modal */}
      {previewCv && (() => {
        const PrevTemplate = TEMPLATES.find(t => t.id === previewCv.templateId)?.component || ALMTemplate;
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={() => setPreviewCv(null)}>
            <div className="relative my-8 bg-white rounded-xl shadow-2xl flex flex-col items-center max-w-full" onClick={e => e.stopPropagation()}>
              <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                {/* Download option buttons inside preview modal */}
                <div className="flex items-center gap-1 bg-black/50 p-1.5 rounded-xl backdrop-blur-md">
                  <button
                    onClick={() => startDownload(previewCv, 'pdf')}
                    disabled={isDownloading}
                    className="text-xs font-semibold text-white flex items-center gap-1 hover:bg-white/20 px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    <FileDown size={14} className="text-red-400" /> PDF
                  </button>
                  <span className="text-white/30 font-light">|</span>
                  <button
                    onClick={() => startDownload(previewCv, 'jpg')}
                    disabled={isDownloading}
                    className="text-xs font-semibold text-white flex items-center gap-1 hover:bg-white/20 px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    <ImageIcon size={14} className="text-emerald-400" /> JPG
                  </button>
                  <span className="text-white/30 font-light">|</span>
                  <button
                    onClick={() => startDownload(previewCv, 'doc')}
                    disabled={isDownloading}
                    className="text-xs font-semibold text-white flex items-center gap-1 hover:bg-white/20 px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    <FileText size={14} className="text-blue-400" /> DOCX
                  </button>
                </div>

                <button onClick={() => setPreviewCv(null)} className="w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black transition-colors backdrop-blur-md">
                  <X size={20} />
                </button>
              </div>
              
              <div className="w-[800px] max-w-full shrink-0 bg-white shadow-xl relative mt-16 rounded-b-xl overflow-hidden">
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

      {/* Toast Alert */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}

// Toast Component
function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div className="fixed bottom-6 right-6 z-[60] animate-in fade-in slide-in-from-bottom-3">
      <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium ${
        type === 'success' ? 'bg-gray-900' : 'bg-red-600'
      }`}>
        {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
        {msg}
      </div>
    </div>
  );
}
