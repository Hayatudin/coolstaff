'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardList, Loader2, MoreVertical, CheckCircle, Trash2, Edit3, Eye, UserCheck,
  Download, ChevronDown, FileText, Image as ImageIcon, FileDown, X, AlertCircle
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { api } from '@/lib/api';
import Input from '@/components/ui/Input';
import { Candidate } from '@/types';

import { useCandidates } from '@/hooks/useCandidates';
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

export default function FitCandidatesPage() {
  const router = useRouter();
  const { candidates: allCandidates, isLoading, mutate } = useCandidates();
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [viewDoc, setViewDoc] = useState<string | null>(null);

  // Selection & Downloading states
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

  const candidates = allCandidates.filter(c => c.personalInfo.medicalStatus === 'Fit');

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
      alert('Failed to delete candidate'); 
    }
  };

  const filtered = candidates.filter(c => {
    const name = `${c.passportData.givenNames} ${c.passportData.surname}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || c.passportData.passportNumber.toLowerCase().includes(searchQuery.toLowerCase());
  });

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

  const handleOpenCV = async (candidate: Candidate) => {
    setOpenMenuId(null);
    const templateId = candidate.latestCVTemplate || (candidate.generatedCVs?.[0] ? (typeof candidate.generatedCVs[0] === 'string' ? candidate.generatedCVs[0] : candidate.generatedCVs[0]?.templateId) : null) || 'alm';
    
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
          
          const templateId = fullCandidate.latestCVTemplate || (fullCandidate.generatedCVs?.[0] ? (typeof fullCandidate.generatedCVs[0] === 'string' ? fullCandidate.generatedCVs[0] : fullCandidate.generatedCVs[0]?.templateId) : null) || 'alm';
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
    } catch (err) {
      console.error(err);
      showToast('Failed to download CVs', 'error');
    } finally {
      setIsDownloadingAll(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50"><UserCheck size={22} className="text-emerald-600" /></div>
            Fit Candidates
          </h1>
          <p className="text-text-secondary mt-1 ml-12">Candidates who are marked as Medically Fit</p>
        </div>
      </div>

      <div className="w-full md:w-96">
        <Input placeholder="Search by name or passport..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      <div className="bg-surface rounded-[1.5rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-visible">
        <div className="overflow-visible">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fafaff] border-b border-border/50 text-[11px] uppercase tracking-[0.15em] font-bold text-text-tertiary">
                <th className="px-3 xl:px-6 py-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-3 xl:px-6 py-3.5 font-semibold">Shelf ID</th>
                <th className="px-3 xl:px-6 py-3.5 font-semibold">Candidate</th>
                <th className="px-3 xl:px-6 py-3.5 font-semibold">Passport No.</th>
                <th className="px-3 xl:px-6 py-3.5 font-semibold">Medical</th>
                <th className="px-3 xl:px-6 py-3.5 font-semibold hidden xl:table-cell">Generated CVs</th>
                <th className="px-3 xl:px-6 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={7} className="px-3 xl:px-6 py-10 text-center"><div className="flex flex-col items-center gap-3"><Loader2 size={32} className="text-primary animate-spin" /><p className="text-text-tertiary">Loading...</p></div></td></tr>
              ) : filtered.length > 0 ? (
                filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 xl:px-6 py-3.5 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                        checked={selectedIds.includes(c.id)}
                        onChange={(e) => handleSelect(c.id, e.target.checked)}
                      />
                    </td>
                    <td className="px-3 xl:px-6 py-3.5 whitespace-nowrap">
                      <div className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-mono font-bold inline-block border border-gray-200 shadow-sm">{c.shelfId || 'UNASSIGNED'}</div>
                    </td>
                    <td className="px-3 xl:px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2 xl:gap-3">
                        <div className="w-8 h-8 xl:w-10 xl:h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                          <span className="text-emerald-600 font-bold text-xs xl:text-sm">{c.passportData.givenNames.charAt(0)}{c.passportData.surname.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-text-primary text-xs xl:text-sm">{c.passportData.givenNames} {c.passportData.surname}</p>
                          <p className="text-[10px] xl:text-xs text-text-tertiary hidden xl:block">{c.personalInfo.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 xl:px-6 py-3.5 whitespace-nowrap">
                      <p className="text-xs xl:text-sm font-medium text-text-primary">{c.passportData.passportNumber}</p>
                    </td>
                    <td className="px-3 xl:px-6 py-3.5 whitespace-nowrap">
                      <Badge variant="success" className="text-[10px] xl:text-xs px-2 py-0.5 xl:py-1">Fit</Badge>
                    </td>
                    <td className="px-3 xl:px-6 py-3.5 whitespace-nowrap hidden xl:table-cell">
                      <div className="flex gap-2 flex-wrap max-w-[200px]">
                        {c.generatedCVs && c.generatedCVs.length > 0 ? (
                          c.generatedCVs.map((tmpl, idx) => {
                            const templateId = typeof tmpl === 'string' ? tmpl : tmpl?.templateId;
                            if (!templateId) return null;
                            return (
                              <span key={idx} className="px-2 py-0.5 text-[9px] xl:text-[10px] uppercase font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                                {templateId.replace('tmpl-', '').toUpperCase()}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-xs text-text-tertiary">No CVs</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 xl:px-6 py-3.5 whitespace-nowrap text-right text-xs xl:text-sm font-medium">
                      <div className="relative inline-block" data-action-menu>
                        <button onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)} className="text-text-tertiary hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-primary-50">
                          <MoreVertical size={16} />
                        </button>
                        {openMenuId === c.id && (
                          <div className="absolute right-0 top-full mt-1 w-52 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 animate-fade-in">
                            <button onClick={() => handleOpenCV(c)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-primary-50 transition-colors text-left text-primary font-medium">
                              <Eye size={16} /><span>Open CV Preview</span>
                            </button>
                            <div className="border-t border-border" />
                            <button onClick={() => deleteCandidate(c.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors text-left text-red-600">
                              <Trash2 size={16} /><span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} className="px-3 xl:px-6 py-10 text-center text-text-tertiary">No fit candidates found. Mark candidates as &quot;Fit&quot; from the Candidates page.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-surface/90 backdrop-blur-md border border-border/80 rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-6 animate-in slide-in-from-bottom-6 duration-300">
          <span className="text-sm font-bold text-text-primary">
            {selectedIds.length} Candidate{selectedIds.length > 1 ? 's' : ''} Selected
          </span>
          <div className="h-6 w-px bg-border" />
          
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
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={() => setPreviewCv(null)}>
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
