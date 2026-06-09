'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Copy, Check, ArrowLeft, Loader2, User, Calendar, Globe, Briefcase, GraduationCap, Heart, Baby, Phone, BookOpen, Users, Upload, Image as ImageIcon, FileText, Save, RefreshCw, AlertCircle, Trash2, Video, Edit2, Plus, X, CheckCircle2 } from 'lucide-react';
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
  passportImageUrl?: string | null;
  createdAt: string;
  agency?: string | null;
  passportType?: string | null;
  languages?: string[] | null;
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

  // Edit target and form states
  const [brokers, setBrokers] = useState<{ id: string; name: string }[]>([]);
  const [editTarget, setEditTarget] = useState<QuickRegistration | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    passportNumber: '',
    givenNames: '',
    surname: '',
    nationality: '',
    religion: '',
    gender: '',
    dateOfBirth: '',
    dateOfExpiry: '',
    brokerId: '',
    issuingCountry: '',
    placeOfBirth: '',
    educationLevel: '',
    maritalStatus: '',
    numberOfChildren: 0,
    relativePhones: [] as string[],
    jobExperience: [] as { experienceStatus: string; country: string; yearsOfExperience: string }[],
    passportImageUrl: undefined as string | undefined,
    cocDocumentUrl: undefined as string | undefined,
    labourIdUrl: undefined as string | undefined,
    candidateIdImageUrl: undefined as string | undefined,
    relativeIdImageUrl: undefined as string | undefined,
    videoUrl: undefined as string | undefined,
    agency: '',
    passportType: 'scan',
    languages: [] as string[],
  });

  const [customLanguage, setCustomLanguage] = useState('');
  const [selectedLang, setSelectedLang] = useState('');

  const addLanguage = (lang: string) => {
    const trimmed = lang.trim();
    if (!trimmed) return;
    if (editForm.languages && !editForm.languages.includes(trimmed)) {
      setEditForm(prev => ({
        ...prev,
        languages: [...(prev.languages || []), trimmed]
      }));
    } else if (!editForm.languages) {
      setEditForm(prev => ({
        ...prev,
        languages: [trimmed]
      }));
    }
  };

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

    const fetchBrokers = async () => {
      try {
        const res = await api('/api/brokers');
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json)) setBrokers(json);
        }
      } catch (err) {
        console.error('Failed to fetch brokers', err);
      }
    };

    fetchData();
    fetchBrokers();
  }, [id]);

  const handleEditFileChange = (field: string, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setEditForm(prev => ({
        ...prev,
        [field]: base64String,
      }));
    };
    reader.readAsDataURL(file);
  };

  const openEditModal = (reg: QuickRegistration) => {
    setEditTarget(reg);

    const formatDate = (dateStr: string | null | undefined): string => {
      if (!dateStr) return '';
      return dateStr.split('T')[0];
    };

    const mapReligionForForm = (r?: string | null): string => {
      if (!r) return '';
      const upper = r.toUpperCase();
      if (upper.includes('MUSLIM') || upper.includes('ISLAM')) return 'Muslim';
      return 'Non-Muslim';
    };

    let parsedPhones: string[] = [''];
    if (reg.relativePhones) {
      try {
        parsedPhones = Array.isArray(reg.relativePhones) ? reg.relativePhones : JSON.parse(reg.relativePhones as any);
        if (parsedPhones.length === 0) parsedPhones = [''];
      } catch {
        parsedPhones = [''];
      }
    }

    let parsedExperience = [{ experienceStatus: 'New', country: '', yearsOfExperience: '' }];
    if (reg.jobExperience) {
      try {
        parsedExperience = Array.isArray(reg.jobExperience) ? reg.jobExperience : JSON.parse(reg.jobExperience as any);
        if (parsedExperience.length === 0) parsedExperience = [{ experienceStatus: 'New', country: '', yearsOfExperience: '' }];
      } catch {
        try {
          parsedExperience = JSON.parse(reg.jobExperience);
        } catch {
          parsedExperience = [{ experienceStatus: 'New', country: '', yearsOfExperience: '' }];
        }
      }
    }

    setEditForm({
      passportNumber: reg.passportNumber || '',
      givenNames: reg.givenNames || '',
      surname: reg.surname || '',
      nationality: reg.nationality || '',
      religion: mapReligionForForm(reg.religion),
      gender: reg.gender || '',
      dateOfBirth: formatDate(reg.dateOfBirth),
      dateOfExpiry: formatDate(reg.dateOfExpiry),
      brokerId: reg.broker?.id || '',
      issuingCountry: reg.issuingCountry || '',
      placeOfBirth: reg.placeOfBirth || '',
      educationLevel: reg.educationLevel || '',
      maritalStatus: reg.maritalStatus || '',
      numberOfChildren: reg.numberOfChildren || 0,
      relativePhones: parsedPhones,
      jobExperience: parsedExperience,
      passportImageUrl: undefined,
      cocDocumentUrl: undefined,
      labourIdUrl: undefined,
      candidateIdImageUrl: undefined,
      relativeIdImageUrl: undefined,
      videoUrl: undefined,
      agency: reg.agency || 'daera',
      passportType: reg.passportType || 'scan',
      languages: Array.isArray(reg.languages) ? reg.languages : [],
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    setIsSaving(true);
    try {
      const payload: any = {
        passportNumber: editForm.passportNumber,
        givenNames: editForm.givenNames,
        surname: editForm.surname,
        nationality: editForm.nationality || null,
        religion: editForm.religion || null,
        gender: editForm.gender || null,
        dateOfBirth: editForm.dateOfBirth ? new Date(editForm.dateOfBirth).toISOString() : null,
        dateOfExpiry: editForm.dateOfExpiry ? new Date(editForm.dateOfExpiry).toISOString() : null,
        brokerId: editForm.brokerId || null,
        issuingCountry: editForm.issuingCountry || null,
        placeOfBirth: editForm.placeOfBirth || null,
        educationLevel: editForm.educationLevel || null,
        maritalStatus: editForm.maritalStatus || null,
        numberOfChildren: editForm.numberOfChildren,
        relativePhones: editForm.relativePhones.filter(p => p.trim() !== ''),
        jobExperience: JSON.stringify(editForm.jobExperience),
        agency: editForm.agency || 'daera',
        passportType: editForm.passportType || 'scan',
        languages: editForm.languages,
      };

      if (editForm.passportImageUrl !== undefined) payload.passportImageUrl = editForm.passportImageUrl;
      if (editForm.cocDocumentUrl !== undefined) payload.cocDocumentUrl = editForm.cocDocumentUrl;
      if (editForm.labourIdUrl !== undefined) payload.labourIdUrl = editForm.labourIdUrl;
      if (editForm.candidateIdImageUrl !== undefined) payload.candidateIdImageUrl = editForm.candidateIdImageUrl;
      if (editForm.relativeIdImageUrl !== undefined) payload.relativeIdImageUrl = editForm.relativeIdImageUrl;
      if (editForm.videoUrl !== undefined) payload.videoUrl = editForm.videoUrl;

      const res = await api(`/api/quick-registrations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || 'Failed to update quick registration');

      setData(updated);
      setCocDoc(updated.cocDocumentUrl);
      setLabourId(updated.labourIdUrl);
      setCandidateIdImg(updated.candidateIdImageUrl);
      setRelativeIdImg(updated.relativeIdImageUrl);
      setVideoFile(updated.videoUrl);
      setEditTarget(null);
    } catch (err: any) {
      alert(err.message || 'Something went wrong while saving edit');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (field: 'coc' | 'labour' | 'candidateId' | 'relativeId' | 'video', file: File) => {
    const limit = 50 * 1024 * 1024;
    if (file.size > limit) {
      alert(`Max file size is ${limit / (1024 * 1024)}MB`);
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

        <button
          onClick={() => openEditModal(data)}
          className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-xl transition-all flex items-center gap-2 border border-blue-200/50 text-sm shadow-sm shrink-0 cursor-pointer"
        >
          <Edit2 size={16} /> Edit Details
        </button>
      </div>

      {/* Passport Info */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm mb-4">
        <div className="bg-gradient-to-r from-primary/5 to-transparent border-b border-border px-5 py-3">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Passport Information</h2>
        </div>
        <div className="p-3 sm:p-4 space-y-2">
          <CopyField label="Passport Number" value={data.passportNumber} icon={<User size={16} />} />
          <CopyField label="Passport Type" value={data.passportType ? data.passportType.charAt(0).toUpperCase() + data.passportType.slice(1) : 'Scan'} icon={<FileText size={16} />} />
          <CopyField label="Surname" value={data.surname} icon={<User size={16} />} />
          <CopyField label="Given Names" value={data.givenNames} icon={<User size={16} />} />
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
          <CopyField label="Agency" value={data.agency ? data.agency.charAt(0).toUpperCase() + data.agency.slice(1) : 'Daera'} icon={<BookOpen size={16} />} />
          <CopyField label="Marital Status" value={data.maritalStatus || ''} icon={<Heart size={16} />} />
          {data.numberOfChildren > 0 && (
            <CopyField label="Number of Children" value={String(data.numberOfChildren)} icon={<Baby size={16} />} />
          )}
          {data.languages && Array.isArray(data.languages) && data.languages.length > 0 && (
            <div className="py-3 px-4 rounded-xl bg-gray-50/80 border border-border/50 flex items-center gap-3">
              <div className="text-primary/50 shrink-0"><BookOpen size={16} /></div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-0.5">Languages</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {data.languages.map(lang => (
                    <span key={lang} className="px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-lg border border-primary/20">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
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
                    <img src={getFileUrl(cocDoc)} alt="COC Document" className="w-full h-full object-contain" />
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
                    <img src={getFileUrl(labourId)} alt="Labour ID" className="w-full h-full object-contain" />
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
                    <img src={getFileUrl(candidateIdImg)} alt="Candidate ID" className="w-full h-full object-contain" />
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
                    <img src={getFileUrl(relativeIdImg)} alt="Relative ID" className="w-full h-full object-contain" />
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
                    <video src={getFileUrl(videoFile)} controls className="w-full h-full object-contain" />
                  ) : videoFile.startsWith('data:image') || videoFile.startsWith('http') || videoFile.startsWith('/uploads') ? (
                    <img src={getFileUrl(videoFile)} alt="Video thumbnail" className="w-full h-full object-contain" />
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

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-3xl border border-border shadow-2xl w-full max-w-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Edit2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary text-lg">Edit Quick Registration</h3>
                  <p className="text-xs text-text-secondary mt-0.5">Modify candidate information & broker connection</p>
                </div>
              </div>
              <button
                onClick={() => setEditTarget(null)}
                className="p-1.5 rounded-xl hover:bg-gray-100 text-text-tertiary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="flex flex-col max-h-[90vh]">
              <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[68vh]">

                {/* Section 1: Passport & Personal Details */}
                <div>
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-border pb-1.5">
                    <User size={14} /> Passport & Personal Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Given Names */}
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                        Given Names <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editForm.givenNames}
                        onChange={e => setEditForm(prev => ({ ...prev, givenNames: e.target.value.toUpperCase() }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-text-primary placeholder:text-text-tertiary/40"
                      />
                    </div>

                    {/* Surname */}
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                        Surname <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editForm.surname}
                        onChange={e => setEditForm(prev => ({ ...prev, surname: e.target.value.toUpperCase() }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-text-primary placeholder:text-text-tertiary/40"
                      />
                    </div>

                    {/* Passport Number */}
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                        Passport Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editForm.passportNumber}
                        onChange={e => setEditForm(prev => ({ ...prev, passportNumber: e.target.value.toUpperCase() }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-text-primary placeholder:text-text-tertiary/40"
                      />
                    </div>

                    {/* Religion */}
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                        Religion
                      </label>
                      <select
                        value={editForm.religion}
                        onChange={e => setEditForm(prev => ({ ...prev, religion: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 bg-white text-text-primary"
                      >
                        <option value="">Select Religion</option>
                        <option value="Muslim">Muslim</option>
                        <option value="Non-Muslim">Non-Muslim</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Additional Info */}
                <div>
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-border pb-1.5">
                    <Globe size={14} /> Additional Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Marital Status */}
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                        Marital Status
                      </label>
                      <select
                        value={editForm.maritalStatus}
                        onChange={e => setEditForm(prev => ({ ...prev, maritalStatus: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 bg-white text-text-primary"
                      >
                        <option value="">Select...</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                      </select>
                    </div>

                    {/* Number of Children */}
                    {editForm.maritalStatus === 'Married' && (
                      <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                          Number of Children
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={editForm.numberOfChildren}
                          onChange={e => setEditForm(prev => ({ ...prev, numberOfChildren: parseInt(e.target.value) || 0 }))}
                          className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-text-primary"
                        />
                      </div>
                    )}

                    {/* Agency Select Dropdown */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                        Agency
                      </label>
                      <select
                        value={editForm.agency}
                        onChange={e => setEditForm(prev => ({ ...prev, agency: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 bg-white text-text-primary transition-all cursor-pointer"
                      >
                        <option value="daera">Daera</option>
                        <option value="coolstaff">Coolstaff</option>
                        <option value="boss">Boss</option>
                      </select>
                    </div>

                    {/* Broker Connection */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                        Broker Connection
                      </label>
                      <select
                        value={editForm.brokerId}
                        onChange={e => setEditForm(prev => ({ ...prev, brokerId: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 bg-white text-text-primary"
                      >
                        <option value="">Direct / No Broker</option>
                        {brokers.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Languages Section */}
                    <div className="md:col-span-2 pt-4 border-t border-border/60">
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Languages</label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {(editForm.languages || []).map(lang => (
                          <span key={lang} className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                            {lang}
                            <button
                              type="button"
                              onClick={() => setEditForm(prev => ({ ...prev, languages: (prev.languages || []).filter(l => l !== lang) }))}
                              className="hover:text-primary-dark ml-1 font-bold text-sm"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                        {(editForm.languages || []).length === 0 && (
                          <span className="text-xs text-text-tertiary italic">No languages added yet.</span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <select
                          value={selectedLang}
                          onChange={e => {
                            const val = e.target.value;
                            setSelectedLang(val);
                            if (val) {
                              addLanguage(val);
                              setSelectedLang('');
                            }
                          }}
                          className="flex-1 h-11 px-4 py-2 text-sm rounded-xl border border-border bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
                        >
                          <option value="">Choose a language...</option>
                          {["Arabic", "English", "Amharic", "Afaan Oromo", "Sidamu", "Somali", "Tigrinya"]
                            .filter(l => !(editForm.languages || []).includes(l))
                            .map(l => (
                              <option key={l} value={l}>{l}</option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Documents & Video Uploads */}
                <div className="pt-4 border-t border-border mt-6">
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FileText size={14} className="text-primary" /> Uploaded Documents & Video
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      { label: 'Passport Image', field: 'passportImageUrl', current: editTarget?.passportImageUrl, accept: 'image/*' },
                      { label: 'COC Document', field: 'cocDocumentUrl', current: editTarget?.cocDocumentUrl, accept: 'application/pdf,image/*' },
                      { label: 'Labour ID', field: 'labourIdUrl', current: editTarget?.labourIdUrl, accept: 'application/pdf,image/*' },
                      { label: 'Candidate ID Image', field: 'candidateIdImageUrl', current: editTarget?.candidateIdImageUrl, accept: 'image/*' },
                      { label: 'Relative ID Image', field: 'relativeIdImageUrl', current: editTarget?.relativeIdImageUrl, accept: 'image/*' },
                      { label: 'Candidate Video', field: 'videoUrl', current: editTarget?.videoUrl, accept: 'video/*' },
                    ].map(doc => {
                      const isStaged = (editForm as any)[doc.field] !== undefined;
                      return (
                        <div key={doc.field} className="p-3 bg-gray-50 rounded-xl border border-border flex flex-col justify-between gap-2.5">
                          <div>
                            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider truncate" title={doc.label}>
                              {doc.label}
                            </p>
                            {doc.current && !isStaged && (
                              <a
                                href={getFileUrl(doc.current)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-primary hover:underline font-semibold block mt-1 truncate"
                              >
                                View Current File
                              </a>
                            )}
                            {!doc.current && !isStaged && (
                              <p className="text-[10px] text-text-tertiary font-medium block mt-1">Not Provided</p>
                            )}
                            {isStaged && (
                              <p className="text-[10px] text-green-600 font-bold block mt-1 flex items-center gap-1">
                                <CheckCircle2 size={12} className="shrink-0" /> New File Staged
                              </p>
                            )}
                          </div>
                          <label className="w-full text-center py-1.5 bg-white border border-border rounded-lg text-[10px] font-bold text-text-secondary hover:bg-gray-50 cursor-pointer block transition-colors">
                            <input
                              type="file"
                              accept={doc.accept}
                              className="hidden"
                              onChange={e => handleEditFileChange(doc.field, e.target.files?.[0] || null)}
                            />
                            Replace File
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-gray-50/50">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  disabled={isSaving}
                  className="px-4 py-2.5 text-sm font-semibold text-text-secondary border border-border rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 text-sm"
                >
                  {isSaving ? (
                    <><Loader2 size={16} className="animate-spin" /> Saving...</>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
