'use client';

import React, { useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useSearchParams, useRouter } from 'next/navigation';
import { DownloadFormat, Candidate } from '@/types';
import CandidateSelector from '@/components/cv-generator/CandidateSelector';
import { cn, getFileUrl } from '@/lib/utils';
import { FileText, CheckCircle2, User, Download, ChevronDown, FileDown, Image as ImageIcon, Camera, ArrowLeft } from 'lucide-react';
import TemplateGrid from '@/components/cv-generator/TemplateGrid';
import ALMTemplate from '@/components/cv/templates/ALMTemplate';
import KA7Template from '@/components/cv/templates/KA7Template';
import KU2Template from '@/components/cv/templates/KU2Template';
import MATemplate from '@/components/cv/templates/MATemplate';
import RATemplate from '@/components/cv/templates/RATemplate';
import AlShablanTemplate from '@/components/cv/templates/AlShablanTemplate';
import UssusTemplate from '@/components/cv/templates/UssusTemplate';
import VisionTemplate from '@/components/cv/templates/VisionTemplate';
import { generateAlShablanNativeDocx, generateUssusNativeDocx } from '@/lib/docxGenerators';
import Button from '@/components/ui/Button';

const TEMPLATES: any[] = [
  { id: 'ussus', name: 'USSUS', category: 'minimal', description: 'USSUS template layout', thumbnail: '/Ussus.png' },
  { id: 'al-shablan', name: 'AL-Shablan', category: 'elegant', description: 'AL-Shablan template layout', thumbnail: '/Al-shablan.png' },
  { id: 'alm', name: 'ALM Agency', category: 'classic', description: 'Standard ALM CV layout', thumbnail: '/header.png' },
  { id: 'ka7', name: 'KA-7 Layout', category: 'professional', description: 'KA-7 template format', thumbnail: '/KA-7.png' },
  { id: 'ku2', name: 'KU-2 Format', category: 'minimal', description: 'Clean KU-2 design', thumbnail: '/KU2.png' },
  { id: 'ma', name: 'MA Standard', category: 'modern', description: 'Modern MA CV style', thumbnail: '/MA.png' },
  { id: 'ra', name: 'RA Custom', category: 'elegant', description: 'Elegant RA layout', thumbnail: '/RA-1.png' },
  { id: 'vision', name: 'Vision Layout', category: 'elegant', description: 'Premium dual-page layout', thumbnail: '/vision-header.png' },
];

import { useCandidates } from '@/hooks/useCandidates';

function CVGeneratorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlCandidateId = searchParams.get('candidateId');

  const { candidates, isLoading, mutate: setCandidates } = useCandidates();
  const nonCallingCandidates = React.useMemo(() => candidates.filter((c: Candidate) => c.broker?.name !== 'Calling'), [candidates]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(urlCandidateId);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('alm');
  const [toast, setToast] = useState<string | null>(null);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [generatedCvs, setGeneratedCvs] = useState<any[]>([]);
  const [alreadyGeneratedTemplate, setAlreadyGeneratedTemplate] = useState<string | null>(null);
  const [facePhotoB64, setFacePhotoB64] = useState<string | null>(null);
  const [fullBodyPhotoB64, setFullBodyPhotoB64] = useState<string | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);

  React.useEffect(() => {
    api('/api/generated-cvs')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setGeneratedCvs(data);
      })
      .catch(err => console.warn('Background fetch for generated CVs:', err.message || err));
  }, []);

  React.useEffect(() => {
    if (selectedCandidateId && generatedCvs.length > 0) {
      const existingCv = generatedCvs.find(cv => cv.candidateId === selectedCandidateId);
      if (existingCv) {
        const templateName = TEMPLATES.find(t => t.id === existingCv.templateId)?.name || existingCv.templateId;
        setAlreadyGeneratedTemplate(templateName);
        setToast(`This candidate already has a CV generated in the ${templateName} template.`);
      } else {
        setAlreadyGeneratedTemplate(null);
      }
    } else {
      setAlreadyGeneratedTemplate(null);
    }
  }, [selectedCandidateId, generatedCvs]);

  // Ref for the CV container to print or capture
  const cvRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Auto-select if candidateId was passed via URL and exists in data
    // Auto-select if candidateId was passed via URL and exists in data
    if (urlCandidateId && nonCallingCandidates.length > 0 && !selectedCandidateId) {
      if (nonCallingCandidates.some((c: Candidate) => c.id === urlCandidateId)) {
        setSelectedCandidateId(urlCandidateId);
      }
    }
  }, [urlCandidateId, nonCallingCandidates, selectedCandidateId]);

  const selectedCandidate = nonCallingCandidates.find(c => c.id === selectedCandidateId) || null;

  // Pre-load images as Base64 to avoid CORS issues with html-to-image
  React.useEffect(() => {
    if (!selectedCandidate) {
      setFacePhotoB64(null);
      setFullBodyPhotoB64(null);
      return;
    }

    const convertImages = async () => {
      setIsPreloading(true);
      const convert = async (url?: string) => {
        if (!url) return null;
        try {
          const absoluteUrl = getFileUrl(url);
          const res = await fetch(absoluteUrl);
          if (!res.ok) throw new Error('Fetch failed');
          const blob = await res.blob();
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.warn('Failed to convert image to B64:', url, e);
          return getFileUrl(url); // Fallback to raw URL
        }
      };

      const [face, body] = await Promise.all([
        convert(selectedCandidate.facePhotoUrl || selectedCandidate.passportImageUrl),
        convert(selectedCandidate.fullBodyPhotoUrl)
      ]);
      setFacePhotoB64(face);
      setFullBodyPhotoB64(body);
      setIsPreloading(false);
    };

    convertImages();
  }, [selectedCandidate]);

  const facePhoto = getFileUrl(selectedCandidate?.facePhotoUrl || selectedCandidate?.passportImageUrl);
  const fullBodyPhoto = getFileUrl(selectedCandidate?.fullBodyPhotoUrl);
  const passportImageUrl = getFileUrl(selectedCandidate?.passportImageUrl);

  // We should also update the candidate object passed to templates to have full URLs
  const candidateWithFullUrls = selectedCandidate ? {
    ...selectedCandidate,
    passportImageUrl: getFileUrl(selectedCandidate.passportImageUrl),
    facePhotoUrl: getFileUrl(selectedCandidate.facePhotoUrl),
    fullBodyPhotoUrl: getFileUrl(selectedCandidate.fullBodyPhotoUrl),
    cocDocumentUrl: getFileUrl(selectedCandidate.cocDocumentUrl),
    medicalDocumentUrl: getFileUrl(selectedCandidate.medicalDocumentUrl),
  } as Candidate : null;

  const handleSave = async () => {
    if (!selectedCandidate) return;
    if (alreadyGeneratedTemplate) {
      setToast(`Template already saved as ${alreadyGeneratedTemplate}`);
      return;
    }
    
    setIsDownloading(true);

    try {
      const response = await api('/api/generated-cvs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: selectedCandidateId,
          templateId: selectedTemplateId,
          facePhotoUrl: facePhoto,
          fullBodyPhotoUrl: fullBodyPhoto
        })
      });

      if (response.status === 409) {
        const errData = await response.json().catch(() => ({}));
        const existingTemplateId = errData.templateId || 'another';
        const templateName = TEMPLATES.find(t => t.id === existingTemplateId)?.name || existingTemplateId;
        setToast(`Already saved in ${templateName} template.`);
      } else if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Status ${response.status}: ${errText}`);
      } else {
        const data = await response.json();
        setToast(`CV Saved in ${TEMPLATES.find(t => t.id === selectedTemplateId)?.name} template!`);
        // Refresh generated list
        const refreshed = await api('/api/generated-cvs').then(r => r.json());
        if (Array.isArray(refreshed)) setGeneratedCvs(refreshed);
      }
    } catch (err: any) {
      console.warn('Save Error:', err.message || err);
      alert(`Failed to save: ${err.message || 'Please try again.'}`);
    } finally {
      setIsDownloading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const isReady = selectedCandidate !== null;

  return (
    <div className="print:bg-white print:m-0 print:p-0">
      {/* Hide everything except CV when printing */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #cv-print-area, #cv-print-area * {
            visibility: visible !important;
          }
          #cv-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-50">
              <FileText size={22} className="text-primary" />
            </div>
            CV Generator
          </h1>
          <p className="text-text-secondary mt-1 ml-12">Select and save a CV template for the candidate</p>
        </div>
        {isReady && (
          <div className="relative print:hidden">
            <Button
              onClick={handleSave}
              className="flex items-center gap-2"
              disabled={isDownloading || !!alreadyGeneratedTemplate}
              title={alreadyGeneratedTemplate ? `Already saved in ${alreadyGeneratedTemplate}` : ''}
            >
              {isDownloading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle2 size={18} />
              )}
              {isDownloading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left Panel - Controls */}
        <div className="xl:col-span-2 space-y-6 print:hidden">
          {/* Candidate Selection Card */}
          <div className="bg-surface rounded-[1.5rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <User size={16} className="text-primary" />
              <h2 className="font-semibold text-text-primary">Candidate</h2>
            </div>
            <CandidateSelector
              candidates={nonCallingCandidates}
              selectedId={selectedCandidateId}
              onSelect={setSelectedCandidateId}
            />
          </div>

          {/* Template Selection Card */}
          <div className="bg-surface rounded-[1.5rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
            <TemplateGrid
              templates={TEMPLATES}
              selectedId={selectedTemplateId}
              onSelect={setSelectedTemplateId}
            />
          </div>
        </div>

        {/* Right Panel - CV Preview */}
        <div className="xl:col-span-3">
          <div className="bg-surface rounded-[1.5rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sticky top-20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-text-primary">Live CV Layout Preview</h2>
              {isReady && (
                <span className="px-2.5 py-0.5 bg-success-light text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                  <CheckCircle2 size={12} /> Ready
                </span>
              )}
            </div>

            <div className="border border-border rounded-xl overflow-hidden shadow-inner bg-gray-100 p-4">
              <div className="max-w-[800px] mx-auto shadow-2xl overflow-hidden">
                <div id="cv-print-area" ref={cvRef}>
                  {candidateWithFullUrls ? (
                    <>
                      {isPreloading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center bg-white min-h-[700px]">
                           <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                           <p className="text-sm text-text-secondary">Loading high-res photos...</p>
                        </div>
                      ) : (
                        <>
                          {selectedTemplateId === 'ussus' && <UssusTemplate candidate={candidateWithFullUrls as any} facePhoto={facePhotoB64} fullBodyPhoto={fullBodyPhotoB64} />}
                          {selectedTemplateId === 'al-shablan' && <AlShablanTemplate candidate={candidateWithFullUrls as any} facePhoto={facePhotoB64} fullBodyPhoto={fullBodyPhotoB64} />}
                          {selectedTemplateId === 'alm' && <ALMTemplate candidate={candidateWithFullUrls as any} facePhoto={facePhotoB64} fullBodyPhoto={fullBodyPhotoB64} />}
                          {selectedTemplateId === 'ka7' && <KA7Template candidate={candidateWithFullUrls as any} facePhoto={facePhotoB64} fullBodyPhoto={fullBodyPhotoB64} />}
                          {selectedTemplateId === 'ku2' && <KU2Template candidate={candidateWithFullUrls as any} facePhoto={facePhotoB64} fullBodyPhoto={fullBodyPhotoB64} />}
                          {selectedTemplateId === 'ma' && <MATemplate candidate={candidateWithFullUrls as any} facePhoto={facePhotoB64} fullBodyPhoto={fullBodyPhotoB64} />}
                          {selectedTemplateId === 'ra' && <RATemplate candidate={candidateWithFullUrls as any} facePhoto={facePhotoB64} fullBodyPhoto={fullBodyPhotoB64} />}
                          {selectedTemplateId === 'vision' && <VisionTemplate candidate={candidateWithFullUrls as any} facePhoto={facePhotoB64} fullBodyPhoto={fullBodyPhotoB64} />}
                        </>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-white min-h-[700px] print:hidden">
                      <div className="w-20 h-20 rounded-2xl bg-lavender-dark flex items-center justify-center mb-4">
                        <FileText size={32} className="text-primary/40" />
                      </div>
                      <h3 className="text-lg font-medium text-text-primary mb-1">Select a Candidate</h3>
                      <p className="text-sm text-text-tertiary max-w-sm px-10">
                        Choose a candidate from the left to generate their perfect CV template.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-toast print:hidden">
          <div className="flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl">
            <CheckCircle2 size={18} className="text-success" />
            <span className="text-sm font-medium">{toast}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CVGeneratorPage() {
  return (
    <React.Suspense fallback={<div className="p-10 flex justify-center"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
      <CVGeneratorContent />
    </React.Suspense>
  );
}
