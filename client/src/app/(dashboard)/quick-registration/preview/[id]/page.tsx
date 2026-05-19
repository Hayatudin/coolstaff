'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Copy, Check, ArrowLeft, Loader2, User, Calendar, Globe, Briefcase, GraduationCap, Heart, Baby, Phone, BookOpen, Users, Upload, Image as ImageIcon, FileText, Save, RefreshCw, AlertCircle, Trash2, Video } from 'lucide-react';
import { getFileUrl } from '@/lib/utils';

interface QuickRegistration {
  id: string;
  passportNumber: string;
  surname: string;
  givenNames: string;
  dateOfBirth: string | null;
  gender: string | null;
  nationality: string | null;
  dateOfExpiry: string | null;
  issuingCountry: string | null;
  placeOfBirth: string | null;
  educationLevel: string | null;
  jobExperience: string | null;
  maritalStatus: string | null;
  numberOfChildren: number;
  religion: string | null;
  relativePhones: string[] | null;
  broker: { id: string; name: string } | null;
  cocDocumentUrl: string | null;
  labourIdUrl: string | null;
  candidateIdImageUrl: string | null;
  relativeIdImageUrl: string | null;
  videoUrl: string | null;
  createdAt: string;
}

function CopyField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!value) return null;

  return (
    <div className="flex items-center justify-between gap-3 py-3 px-4 rounded-xl bg-gray-50/80 border border-border/50 hover:bg-gray-100/80 transition-colors group">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {icon && <div className="text-primary/50 shrink-0">{icon}</div>}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-0.5">{label}</p>
          <p className="text-sm font-semibold text-text-primary truncate">{value}</p>
        </div>
      </div>
      <button
        onClick={handleCopy}
        className="shrink-0 p-2 rounded-lg hover:bg-primary/10 text-text-tertiary hover:text-primary transition-all cursor-pointer"
        title={`Copy ${label}`}
      >
        {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
      </button>
    </div>
  );
}

export default function QuickRegistrationPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<QuickRegistration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Document states
  const [cocDoc, setCocDoc] = useState<string | null>(null);
  const [labourId, setLabourId] = useState<string | null>(null);
  const [candidateIdImg, setCandidateIdImg] = useState<string | null>(null);
  const [relativeIdImg, setRelativeIdImg] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<string | null>(null);
  const [isSavingDocs, setIsSavingDocs] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api(`/api/quick-registrations/${id}`);
        if (!res.ok) throw new Error('Failed to load data');
        const json = await res.json();
        setData(json);
        setCocDoc(json.cocDocumentUrl);
        setLabourId(json.labourIdUrl);
        setCandidateIdImg(json.candidateIdImageUrl);
        setRelativeIdImg(json.relativeIdImageUrl);
        setVideoFile(json.videoUrl);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleFileChange = (field: 'coc' | 'labour' | 'candidateId' | 'relativeId' | 'video', file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert('Max file size is 10MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        const base64 = ev.target.result as string;
        if (field === 'coc') setCocDoc(base64);
        if (field === 'labour') setLabourId(base64);
        if (field === 'candidateId') setCandidateIdImg(base64);
        if (field === 'relativeId') setRelativeIdImg(base64);
        if (field === 'video') setVideoFile(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDocs = async () => {
    setIsSavingDocs(true);
    setSaveSuccess(false);
    try {
      const res = await api(`/api/quick-registrations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cocDocumentUrl: cocDoc,
          labourIdUrl: labourId,
          candidateIdImageUrl: candidateIdImg,
          relativeIdImageUrl: relativeIdImg,
          videoUrl: videoFile,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save documents');
      }
      const updated = await res.json();
      setData(updated);
      setCocDoc(updated.cocDocumentUrl);
      setLabourId(updated.labourIdUrl);
      setCandidateIdImg(updated.candidateIdImageUrl);
      setRelativeIdImg(updated.relativeIdImageUrl);
      setVideoFile(updated.videoUrl);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Something went wrong while saving documents');
    } finally {
      setIsSavingDocs(false);
    }
  };

  const hasUnsavedChanges =
    data && (
      cocDoc !== data.cocDocumentUrl ||
      labourId !== data.labourIdUrl ||
      candidateIdImg !== data.candidateIdImageUrl ||
      relativeIdImg !== data.relativeIdImageUrl ||
      videoFile !== data.videoUrl
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <p className="text-red-500 font-semibold mb-4">{error || 'Data not found'}</p>
        <button onClick={() => router.push('/quick-registered')} className="text-primary hover:underline text-sm font-medium">← Back to List</button>
      </div>
    );
  }

  // Parse relative phones (could be JSON array or already an array)
  let phones: string[] = [];
  if (data.relativePhones) {
    if (Array.isArray(data.relativePhones)) {
      phones = data.relativePhones;
    } else {
      try { phones = JSON.parse(data.relativePhones as any); } catch { /* ignore */ }
    }
  }

  return (
    <div className="max-w-2xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/quick-registered')}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-text-secondary" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
              {data.givenNames} {data.surname}
            </h1>
            <p className="text-text-tertiary text-xs mt-0.5">
              Registered {new Date(data.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Passport Info */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm mb-4">
        <div className="bg-gradient-to-r from-primary/5 to-transparent border-b border-border px-5 py-3">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Passport Information</h2>
        </div>
        <div className="p-3 sm:p-4 space-y-2">
          <CopyField label="Passport Number" value={data.passportNumber} icon={<User size={16} />} />
          <CopyField label="Surname" value={data.surname} icon={<User size={16} />} />
          <CopyField label="Given Names" value={data.givenNames} icon={<User size={16} />} />
          <CopyField label="Date of Birth" value={data.dateOfBirth || ''} icon={<Calendar size={16} />} />
          <CopyField label="Gender" value={data.gender || ''} icon={<User size={16} />} />
          <CopyField label="Nationality" value={data.nationality || ''} icon={<Globe size={16} />} />
          <CopyField label="Date of Expiry" value={data.dateOfExpiry || ''} icon={<Calendar size={16} />} />
          <CopyField label="Issuing Country" value={data.issuingCountry || ''} icon={<Globe size={16} />} />
          <CopyField label="Place of Birth" value={data.placeOfBirth || ''} icon={<Globe size={16} />} />
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm mb-4">
        <div className="bg-gradient-to-r from-amber-500/5 to-transparent border-b border-border px-5 py-3">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Additional Information</h2>
        </div>
        <div className="p-3 sm:p-4 space-y-2">
          <CopyField label="Religion" value={data.religion || ''} icon={<BookOpen size={16} />} />
          <CopyField label="Broker" value={data.broker?.name || ''} icon={<Users size={16} />} />
          <CopyField label="Education Level" value={data.educationLevel || ''} icon={<GraduationCap size={16} />} />
          {(() => {
            let parsedExperiences: any[] = [];
            try { parsedExperiences = JSON.parse(data.jobExperience || '[]'); } catch { /* ignore */ }
            const expString = Array.isArray(parsedExperiences) && parsedExperiences.length > 0 
              ? parsedExperiences.map(e => e.experienceStatus === 'New' ? 'New' : `${e.country} (${e.yearsOfExperience} Years)`).join(', ')
              : data.jobExperience || '';
            return <CopyField label="Job / Experience" value={expString} icon={<Briefcase size={16} />} />;
          })()}
          <CopyField label="Marital Status" value={data.maritalStatus || ''} icon={<Heart size={16} />} />
          {data.numberOfChildren > 0 && (
            <CopyField label="Number of Children" value={String(data.numberOfChildren)} icon={<Baby size={16} />} />
          )}
        </div>
      </div>

      {/* Relative Phone Numbers */}
      {phones.length > 0 && (
        <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-green-500/5 to-transparent border-b border-border px-5 py-3">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Relative Phone Numbers</h2>
          </div>
          <div className="p-3 sm:p-4 space-y-2">
            {phones.map((phone, i) => (
              <CopyField key={i} label={`Phone ${i + 1}`} value={phone} icon={<Phone size={16} />} />
            ))}
          </div>
        </div>
      )}
      {/* Uploaded Documents */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm mt-6">
        <div className="bg-gradient-to-r from-violet-500/5 to-transparent border-b border-border px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Uploaded Documents</h2>
          {hasUnsavedChanges && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full animate-pulse">
              Unsaved changes
            </span>
          )}
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* COC Document */}
          <div className="border border-border rounded-xl p-4 bg-gray-50/50 flex flex-col justify-between group transition-all hover:border-primary/20 hover:bg-gray-100/50">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">COC Document</p>
                {cocDoc && (
                  <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check size={10} /> Uploaded
                  </span>
                )}
              </div>
              <div className="h-32 bg-slate-100/80 rounded-xl overflow-hidden relative border border-dashed border-border/80 flex items-center justify-center">
                {cocDoc ? (
                  cocDoc.startsWith('data:image') || cocDoc.startsWith('http') || cocDoc.startsWith('/uploads') ? (
                    <img src={cocDoc} alt="COC Document" className="w-full h-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 text-xs text-text-secondary p-2 text-center">
                      <FileText className="text-primary/40" size={24} />
                      <span>Document (PDF/Binary)</span>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1.5 text-center p-4">
                    <AlertCircle className="text-amber-500/80" size={20} />
                    <span className="text-xs font-semibold text-text-tertiary">Not uploaded</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3">
              <label className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-bold rounded-lg bg-white border border-border text-text-secondary hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer shadow-sm">
                <Upload size={14} />
                {cocDoc ? 'Change File' : 'Upload Document'}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChange('coc', file);
                  }}
                />
              </label>
            </div>
          </div>

          {/* Labour ID Image */}
          <div className="border border-border rounded-xl p-4 bg-gray-50/50 flex flex-col justify-between group transition-all hover:border-primary/20 hover:bg-gray-100/50">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Labour ID Image</p>
                {labourId && (
                  <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check size={10} /> Uploaded
                  </span>
                )}
              </div>
              <div className="h-32 bg-slate-100/80 rounded-xl overflow-hidden relative border border-dashed border-border/80 flex items-center justify-center">
                {labourId ? (
                  labourId.startsWith('data:image') || labourId.startsWith('http') || labourId.startsWith('/uploads') ? (
                    <img src={labourId} alt="Labour ID" className="w-full h-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 text-xs text-text-secondary p-2 text-center">
                      <FileText className="text-primary/40" size={24} />
                      <span>Document (PDF/Binary)</span>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1.5 text-center p-4">
                    <AlertCircle className="text-amber-500/80" size={20} />
                    <span className="text-xs font-semibold text-text-tertiary">Not uploaded</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3">
              <label className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-bold rounded-lg bg-white border border-border text-text-secondary hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer shadow-sm">
                <Upload size={14} />
                {labourId ? 'Change File' : 'Upload Document'}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChange('labour', file);
                  }}
                />
              </label>
            </div>
          </div>

          {/* Candidate ID Image */}
          <div className="border border-border rounded-xl p-4 bg-gray-50/50 flex flex-col justify-between group transition-all hover:border-primary/20 hover:bg-gray-100/50">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Candidate ID Image</p>
                {candidateIdImg && (
                  <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check size={10} /> Uploaded
                  </span>
                )}
              </div>
              <div className="h-32 bg-slate-100/80 rounded-xl overflow-hidden relative border border-dashed border-border/80 flex items-center justify-center">
                {candidateIdImg ? (
                  candidateIdImg.startsWith('data:image') || candidateIdImg.startsWith('http') || candidateIdImg.startsWith('/uploads') ? (
                    <img src={candidateIdImg} alt="Candidate ID" className="w-full h-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 text-xs text-text-secondary p-2 text-center">
                      <FileText className="text-primary/40" size={24} />
                      <span>Document (PDF/Binary)</span>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1.5 text-center p-4">
                    <AlertCircle className="text-amber-500/80" size={20} />
                    <span className="text-xs font-semibold text-text-tertiary">Not uploaded</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3">
              <label className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-bold rounded-lg bg-white border border-border text-text-secondary hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer shadow-sm">
                <Upload size={14} />
                {candidateIdImg ? 'Change File' : 'Upload Document'}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChange('candidateId', file);
                  }}
                />
              </label>
            </div>
          </div>

          {/* Relative ID Image */}
          <div className="border border-border rounded-xl p-4 bg-gray-50/50 flex flex-col justify-between group transition-all hover:border-primary/20 hover:bg-gray-100/50">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Relative ID Image</p>
                {relativeIdImg && (
                  <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check size={10} /> Uploaded
                  </span>
                )}
              </div>
              <div className="h-32 bg-slate-100/80 rounded-xl overflow-hidden relative border border-dashed border-border/80 flex items-center justify-center">
                {relativeIdImg ? (
                  relativeIdImg.startsWith('data:image') || relativeIdImg.startsWith('http') || relativeIdImg.startsWith('/uploads') ? (
                    <img src={relativeIdImg} alt="Relative ID" className="w-full h-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 text-xs text-text-secondary p-2 text-center">
                      <FileText className="text-primary/40" size={24} />
                      <span>Document (PDF/Binary)</span>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1.5 text-center p-4">
                    <AlertCircle className="text-amber-500/80" size={20} />
                    <span className="text-xs font-semibold text-text-tertiary">Not uploaded</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3">
              <label className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-bold rounded-lg bg-white border border-border text-text-secondary hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer shadow-sm">
                <Upload size={14} />
                {relativeIdImg ? 'Change File' : 'Upload Document'}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChange('relativeId', file);
                  }}
                />
              </label>
            </div>
          </div>

          {/* Candidate Video */}
          <div className="border border-border rounded-xl p-4 bg-gray-50/50 flex flex-col justify-between group transition-all hover:border-primary/20 hover:bg-gray-100/50 sm:col-span-2">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary flex items-center gap-1.5"><Video size={12} /> Candidate Video</p>
                {videoFile && (
                  <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check size={10} /> Uploaded
                  </span>
                )}
              </div>
              <div className="h-48 bg-slate-100/80 rounded-xl overflow-hidden relative border border-dashed border-border/80 flex items-center justify-center">
                {videoFile ? (
                  videoFile.startsWith('data:video/') || videoFile.match(/\.(mp4|webm|mov|avi|ogg)/i) || videoFile.includes('/videos/') ? (
                    <video src={videoFile.startsWith('/uploads') ? getFileUrl(videoFile) : videoFile} controls className="w-full h-full object-contain" />
                  ) : videoFile.startsWith('data:image') || videoFile.startsWith('http') || videoFile.startsWith('/uploads') ? (
                    <img src={videoFile} alt="Video thumbnail" className="w-full h-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 text-xs text-text-secondary p-2 text-center">
                      <Video className="text-primary/40" size={24} />
                      <span>Video file</span>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1.5 text-center p-4">
                    <AlertCircle className="text-amber-500/80" size={20} />
                    <span className="text-xs font-semibold text-text-tertiary">Not uploaded</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3">
              <label className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-bold rounded-lg bg-white border border-border text-text-secondary hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer shadow-sm">
                <Upload size={14} />
                {videoFile ? 'Change Video' : 'Upload Video'}
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChange('video', file);
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        {hasUnsavedChanges && (
          <div className="bg-amber-50/50 border-t border-border px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700 font-medium">You have uploaded new documents. Save changes to store them permanently.</p>
            </div>
            <button
              onClick={handleSaveDocs}
              disabled={isSavingDocs}
              className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
            >
              {isSavingDocs ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save size={12} /> Save Documents
                </>
              )}
            </button>
          </div>
        )}

        {saveSuccess && (
          <div className="bg-green-50 border-t border-border px-5 py-4 flex items-center gap-2 text-green-700 animate-fadeIn">
            <Check size={16} className="shrink-0" />
            <p className="text-xs font-bold">Documents successfully saved to candidate record!</p>
          </div>
        )}
      </div>
    </div>
  );
}
