'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { Loader2, ClipboardList, Search, Eye, Calendar, User, ShieldCheck, X, Upload, CheckCircle2, XCircle, ArrowRight, FileText, Trash2, MoreVertical, Edit2 } from 'lucide-react';

interface QuickReg {
  id: string;
  passportNumber: string;
  surname: string;
  givenNames: string;
  nationality: string | null;
  religion: string | null;
  gender: string | null;
  jobExperience: string | null;
  verificationStatus: string;
  promotedCandidateId: string | null;
  createdAt: string;
  cocDocumentUrl?: string | null;
  labourIdUrl?: string | null;
  candidateIdImageUrl?: string | null;
  relativeIdImageUrl?: string | null;
  videoUrl?: string | null;
  relativePhones?: string[] | null;
  educationLevel?: string | null;
  maritalStatus?: string | null;
  numberOfChildren?: number | null;
  passportImageUrl?: string | null;
  dateOfBirth?: string | null;
  dateOfExpiry?: string | null;
  brokerId?: string | null;
  broker?: { id: string; name: string } | null;
}

function parseExperience(raw: string | null): string {
  if (!raw) return '—';
  try {
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries) || entries.length === 0) return '—';
    const first = entries[0];
    if (first.experienceStatus === 'New') return 'New';
    if (first.experienceStatus === 'Have experience') return 'Experienced';
    return '—';
  } catch {
    return '—';
  }
}

export default function QuickRegisteredPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<QuickReg[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role ?? 'user';
  const canVerify = ['super_admin', 'processor'].includes(userRole);

  // Verify modal state
  const [verifyTarget, setVerifyTarget] = useState<QuickReg | null>(null);
  const [verifyStep, setVerifyStep] = useState<'upload' | 'result'>('upload');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedPassport, setExtractedPassport] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [passportMatch, setPassportMatch] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);
  const [promoteSuccess, setPromoteSuccess] = useState<string | null>(null);

  // Edit and dropdown state
  const [brokers, setBrokers] = useState<{ id: string; name: string }[]>([]);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<QuickReg | null>(null);
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
    passportImageUrl: undefined as string | undefined,
    cocDocumentUrl: undefined as string | undefined,
    labourIdUrl: undefined as string | undefined,
    candidateIdImageUrl: undefined as string | undefined,
    relativeIdImageUrl: undefined as string | undefined,
    videoUrl: undefined as string | undefined,
  });

  const handleFileChange = (field: string, file: File | null) => {
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [regRes, brokerRes] = await Promise.all([
          api('/api/quick-registrations'),
          api('/api/brokers')
        ]);
        const regData = await regRes.json();
        const brokerData = await brokerRes.json();
        if (Array.isArray(regData)) setRegistrations(regData);
        if (Array.isArray(brokerData)) setBrokers(brokerData);
      } catch (err) {
        console.error('Failed to fetch quick registrations or brokers', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = registrations.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.givenNames?.toLowerCase().includes(q) ||
      r.surname?.toLowerCase().includes(q) ||
      r.passportNumber?.toLowerCase().includes(q)
    );
  });

  // Handle Musaned PDF upload for verification
  const handleMusanedUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setVerifyError('Please upload a valid PDF document.');
      return;
    }
    setIsExtracting(true);
    setVerifyError(null);
    setExtractedPassport(null);
    setExtractedData(null);
    setPassportMatch(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api('/api/extract/musaned', { method: 'POST', body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to process PDF');

      const extractedNum = result.data?.passportNumber?.trim()?.toUpperCase() || '';
      setExtractedPassport(extractedNum);
      setExtractedData(result.data);

      const targetNum = verifyTarget?.passportNumber?.trim()?.toUpperCase() || '';

      if (extractedNum && targetNum && extractedNum === targetNum) {
        setPassportMatch(true);
      } else {
        setPassportMatch(false);
        setVerifyError(`Passport number does not match. Extracted: "${extractedNum}", Expected: "${targetNum}"`);
      }
      setVerifyStep('result');
    } catch (err: any) {
      setVerifyError(err.message || 'An error occurred while extracting data.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Navigate to /registration and promote candidate via sessionStorage
  const handleValidateAndContinue = () => {
    if (!verifyTarget || !extractedData) return;
    const promoData = {
      extractedData,
      quickRegistration: verifyTarget,
    };
    sessionStorage.setItem('pending_registration_promotion', JSON.stringify(promoData));
    closeVerifyModal();
    router.push('/registration');
  };

  // Promote: push documents from QR to Candidate
  const handlePromote = async () => {
    if (!verifyTarget) return;
    setIsPromoting(true);
    setVerifyError(null);
    try {
      const res = await api('/api/candidates/promote-from-quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quickRegistrationId: verifyTarget.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to promote');

      setPromoteSuccess(data.candidateId);
      // Update local list to reflect promoted status
      setRegistrations(prev => prev.map(r =>
        r.id === verifyTarget.id
          ? { ...r, verificationStatus: 'promoted', promotedCandidateId: data.candidateId }
          : r
      ));
    } catch (err: any) {
      setVerifyError(err.message || 'Failed to push documents to candidate.');
    } finally {
      setIsPromoting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the quick registration for ${name}? This action cannot be undone.`)) return;
    try {
      const res = await api(`/api/quick-registrations/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete');
      }
      setRegistrations(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      alert(err.message || 'Something went wrong while deleting');
    }
  };

  const openVerifyModal = (reg: QuickReg) => {
    setVerifyTarget(reg);
    setVerifyStep('upload');
    setExtractedPassport(null);
    setExtractedData(null);
    setPassportMatch(false);
    setVerifyError(null);
    setPromoteSuccess(null);
  };

  const closeVerifyModal = () => {
    setVerifyTarget(null);
    setExtractedData(null);
    setPromoteSuccess(null);
  };

  const openEditModal = (reg: QuickReg) => {
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

    setEditForm({
      passportNumber: reg.passportNumber || '',
      givenNames: reg.givenNames || '',
      surname: reg.surname || '',
      nationality: reg.nationality || '',
      religion: mapReligionForForm(reg.religion),
      gender: reg.gender || '',
      dateOfBirth: formatDate(reg.dateOfBirth),
      dateOfExpiry: formatDate(reg.dateOfExpiry),
      brokerId: reg.brokerId || reg.broker?.id || '',
      passportImageUrl: undefined,
      cocDocumentUrl: undefined,
      labourIdUrl: undefined,
      candidateIdImageUrl: undefined,
      relativeIdImageUrl: undefined,
      videoUrl: undefined,
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
      };

      if (editForm.passportImageUrl !== undefined) payload.passportImageUrl = editForm.passportImageUrl;
      if (editForm.cocDocumentUrl !== undefined) payload.cocDocumentUrl = editForm.cocDocumentUrl;
      if (editForm.labourIdUrl !== undefined) payload.labourIdUrl = editForm.labourIdUrl;
      if (editForm.candidateIdImageUrl !== undefined) payload.candidateIdImageUrl = editForm.candidateIdImageUrl;
      if (editForm.relativeIdImageUrl !== undefined) payload.relativeIdImageUrl = editForm.relativeIdImageUrl;
      if (editForm.videoUrl !== undefined) payload.videoUrl = editForm.videoUrl;

      const res = await api(`/api/quick-registrations/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || 'Failed to update quick registration');

      // Update local state to reflect edited changes
      setRegistrations(prev => prev.map(r => r.id === editTarget.id ? updated : r));
      setEditTarget(null);
    } catch (err: any) {
      alert(err.message || 'An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'promoted') {
      return <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">Promoted</span>;
    }
    if (status === 'verified') {
      return <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Verified</span>;
    }
    return <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Pending</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-50"><ClipboardList size={22} className="text-primary" /></div>
            Quick Registered
          </h1>
          <p className="text-text-secondary text-sm mt-1 sm:ml-12">Walk-in candidates registered for Musaned entry</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-xl border border-primary/10">
          <span className="text-2xl font-black text-primary leading-none">{filtered.length}</span>
          <span className="text-xs font-semibold text-primary">Registered</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or passport..."
          className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-border bg-white text-text-primary placeholder:text-text-tertiary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
        />
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-border/50 text-[11px] uppercase tracking-widest font-bold text-text-tertiary">
                <th className="px-3 xl:px-6 py-3.5 font-semibold">Candidate</th>
                <th className="px-3 xl:px-6 py-3.5 font-semibold hidden sm:table-cell">Passport No.</th>
                <th className="px-3 xl:px-6 py-3.5 font-semibold hidden md:table-cell">Religion</th>
                <th className="px-3 xl:px-6 py-3.5 font-semibold hidden lg:table-cell">Experience</th>
                <th className="px-3 xl:px-6 py-3.5 font-semibold hidden sm:table-cell">Status</th>
                <th className="px-3 xl:px-6 py-3.5 font-semibold hidden sm:table-cell">Date</th>
                <th className="px-3 xl:px-6 py-3.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 xl:px-6 py-12 text-center">
                    <Loader2 size={28} className="animate-spin text-primary mx-auto mb-2" />
                    <p className="text-text-tertiary text-sm">Loading...</p>
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map(r => {
                  const experienceLabel = parseExperience(r.jobExperience);
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-gray-50/70 transition-colors"
                    >
                      <td className="px-3 xl:px-6 py-3.5 cursor-pointer" onClick={() => router.push(`/quick-registration/preview/${r.id}`)}>
                        <div className="flex items-center gap-2 xl:gap-3">
                          <div className="w-8 h-8 xl:w-9 xl:h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-primary font-bold text-xs">
                              {r.givenNames?.charAt(0)}{r.surname?.charAt(0)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-text-primary text-xs xl:text-sm truncate">{r.givenNames} {r.surname}</p>
                            <p className="text-[10px] text-text-tertiary sm:hidden">{r.passportNumber}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 xl:px-6 py-3.5 hidden sm:table-cell">
                        <span className="text-xs font-mono font-bold text-text-secondary bg-gray-100 px-2 py-0.5 rounded">{r.passportNumber}</span>
                      </td>
                      <td className="px-3 xl:px-6 py-3.5 text-xs xl:text-sm text-text-secondary hidden md:table-cell">{r.religion || '—'}</td>
                      <td className="px-3 xl:px-6 py-3.5 hidden lg:table-cell">
                        <span className={`text-[10px] xl:text-xs font-semibold px-2 py-0.5 xl:py-1 rounded-lg ${
                          experienceLabel === 'Experienced'
                            ? 'bg-green-50 text-green-700'
                            : experienceLabel === 'New'
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-text-tertiary'
                        }`}>
                          {experienceLabel}
                        </span>
                      </td>
                      <td className="px-3 xl:px-6 py-3.5 hidden sm:table-cell">
                        {getStatusBadge(r.verificationStatus || 'pending')}
                      </td>
                      <td className="px-3 xl:px-6 py-3.5 text-[11px] xl:text-xs text-text-tertiary hidden sm:table-cell">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 xl:px-6 py-3.5 text-right relative">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(activeDropdownId === r.id ? null : r.id);
                            }}
                            className="p-1.5 xl:p-2 rounded-xl hover:bg-gray-100 text-text-tertiary hover:text-text-primary transition-all duration-200"
                            title="Actions"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {activeDropdownId === r.id && (
                            <>
                              {/* Overlay for closing click */}
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setActiveDropdownId(null)}
                              />
                              
                              {/* Dropdown Menu */}
                              <div className="absolute right-3 xl:right-6 mt-2 w-48 bg-white border border-border rounded-xl shadow-lg py-1.5 z-20 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                                <button
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    router.push(`/quick-registration/preview/${r.id}`);
                                  }}
                                  className="w-full px-4 py-2 text-xs xl:text-sm text-text-secondary hover:text-text-primary hover:bg-gray-50 transition-colors flex items-center gap-2"
                                >
                                  <Eye size={14} className="text-text-tertiary" /> Preview Details
                                </button>

                                {r.verificationStatus !== 'promoted' && canVerify && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        openVerifyModal(r);
                                      }}
                                      className="w-full px-4 py-2 text-xs xl:text-sm text-text-secondary hover:text-text-primary hover:bg-gray-50 transition-colors flex items-center gap-2"
                                    >
                                      <ShieldCheck size={14} className="text-emerald-600" /> Verify with CV
                                    </button>
                                    
                                    <button
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        openEditModal(r);
                                      }}
                                      className="w-full px-4 py-2 text-xs xl:text-sm text-text-secondary hover:text-text-primary hover:bg-gray-50 transition-colors flex items-center gap-2"
                                    >
                                      <Edit2 size={14} className="text-blue-600" /> Edit Registration
                                    </button>
                                  </>
                                )}

                                {r.promotedCandidateId && userRole !== 'registrar' && (
                                  <button
                                    onClick={() => {
                                      setActiveDropdownId(null);
                                      router.push(`/candidates/${r.promotedCandidateId}`);
                                    }}
                                    className="w-full px-4 py-2 text-xs xl:text-sm text-text-secondary hover:text-text-primary hover:bg-gray-50 transition-colors flex items-center gap-2"
                                  >
                                    <ArrowRight size={14} className="text-blue-600" /> View Candidate
                                  </button>
                                )}

                                <div className="border-t border-border/50 my-1" />

                                <button
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handleDelete(r.id, `${r.givenNames} ${r.surname}`);
                                  }}
                                  className="w-full px-4 py-2 text-xs xl:text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                                >
                                  <Trash2 size={14} /> Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-3 xl:px-6 py-12 text-center">
                    <ClipboardList size={32} className="mx-auto text-text-tertiary/20 mb-3" />
                    <p className="font-bold text-text-primary text-sm">No registrations yet</p>
                    <p className="text-xs text-text-tertiary mt-1">Quick registrations will appear here</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ VERIFY MODAL ══ */}
      {verifyTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeVerifyModal}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scale-pop" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gray-50/50">
              <div>
                <h3 className="font-bold text-text-primary flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-600" />
                  Verify Candidate
                </h3>
                <p className="text-xs text-text-tertiary mt-0.5">
                  {verifyTarget.givenNames} {verifyTarget.surname} — <span className="font-mono font-bold">{verifyTarget.passportNumber}</span>
                </p>
              </div>
              <button onClick={closeVerifyModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-text-tertiary">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* SUCCESS STATE */}
              {promoteSuccess ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} className="text-green-600" />
                  </div>
                  <h4 className="text-lg font-bold text-text-primary mb-2">Documents Pushed Successfully!</h4>
                  <p className="text-sm text-text-secondary mb-6">
                    All documents (COC, Labour ID, Candidate ID, Relative ID, and Video) have been transferred to the candidate record.
                  </p>
                  <button
                    onClick={() => {
                      closeVerifyModal();
                      router.push(`/candidates/${promoteSuccess}`);
                    }}
                    className="px-6 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors shadow-sm flex items-center gap-2 mx-auto"
                  >
                    <Eye size={16} /> View Candidate
                  </button>
                </div>
              ) : verifyStep === 'upload' ? (
                /* UPLOAD STEP */
                <div>
                  <p className="text-sm text-text-secondary mb-4">
                    Upload the <strong>Musaned CV (PDF)</strong> to verify this candidate. The system will extract the passport number and compare it.
                  </p>

                  {/* Upload zone */}
                  <label className={`flex flex-col items-center justify-center gap-4 p-10 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                    isExtracting ? 'pointer-events-none border-primary/30 bg-primary/5' : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50/50'
                  }`}>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleMusanedUpload(file);
                      }}
                    />
                    {isExtracting ? (
                      <>
                        <Loader2 size={32} className="text-primary animate-spin" />
                        <p className="text-sm font-bold text-text-primary">Extracting passport data...</p>
                      </>
                    ) : (
                      <>
                        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                          <FileText size={28} className="text-gray-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-text-primary mb-1">Drop Musaned CV PDF here</p>
                          <p className="text-xs text-primary font-semibold">or click to browse</p>
                        </div>
                      </>
                    )}
                  </label>

                  {verifyError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 font-medium flex items-start gap-2">
                      <XCircle size={16} className="shrink-0 mt-0.5" />
                      <span>{verifyError}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* RESULT STEP */
                <div>
                  {/* Comparison display */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-gray-50 rounded-xl border border-border text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-1">Quick Registration</p>
                      <p className="text-base font-mono font-black text-text-primary">{verifyTarget.passportNumber}</p>
                    </div>
                    <div className={`p-4 rounded-xl border text-center ${
                      passportMatch ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-1">Musaned CV</p>
                      <p className={`text-base font-mono font-black ${passportMatch ? 'text-green-700' : 'text-red-700'}`}>
                        {extractedPassport || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Match indicator */}
                  <div className={`flex items-center justify-center gap-2 p-3 rounded-xl mb-6 ${
                    passportMatch ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    {passportMatch ? (
                      <>
                        <CheckCircle2 size={18} className="text-green-600" />
                        <span className="text-sm font-bold text-green-700">Passport numbers match! Verification successful.</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={18} className="text-red-600" />
                        <span className="text-sm font-bold text-red-700">Passport number does not match.</span>
                      </>
                    )}
                  </div>

                  {verifyError && !passportMatch && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 font-medium">
                      {verifyError}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={() => { setVerifyStep('upload'); setVerifyError(null); setExtractedPassport(null); setPassportMatch(false); }}
                      className="px-4 py-2.5 text-sm font-semibold text-text-secondary border border-border rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Try Another PDF
                    </button>

                    {passportMatch && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handlePromote}
                          disabled={isPromoting}
                          className="px-4 py-2.5 text-emerald-700 bg-emerald-50 border border-emerald-200 font-semibold rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-50 flex items-center gap-1.5 text-xs sm:text-sm"
                          title="Push documents directly without editing"
                        >
                          {isPromoting ? (
                            <><Loader2 size={14} className="animate-spin" /> Pushing...</>
                          ) : (
                            <><ShieldCheck size={14} /> Direct Push</>
                          )}
                        </button>
                        <button
                          onClick={handleValidateAndContinue}
                          className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors shadow-sm flex items-center gap-2 text-xs sm:text-sm"
                        >
                          Verify & Continue <ArrowRight size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-3xl border border-border shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-up">
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
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
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
                    onChange={e => setEditForm(prev => ({ ...prev, givenNames: e.target.value }))}
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
                    onChange={e => setEditForm(prev => ({ ...prev, surname: e.target.value }))}
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
                    onChange={e => setEditForm(prev => ({ ...prev, passportNumber: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-text-primary placeholder:text-text-tertiary/40"
                  />
                </div>

                {/* Nationality */}
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Nationality
                  </label>
                  <input
                    type="text"
                    value={editForm.nationality}
                    onChange={e => setEditForm(prev => ({ ...prev, nationality: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-text-primary placeholder:text-text-tertiary/40"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Gender
                  </label>
                  <select
                    value={editForm.gender}
                    onChange={e => setEditForm(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 bg-white text-text-primary"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
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

                {/* Date of Birth */}
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={editForm.dateOfBirth}
                    onChange={e => setEditForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-text-primary"
                  />
                </div>

                {/* Date of Expiry */}
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Date of Expiry
                  </label>
                  <input
                    type="date"
                    value={editForm.dateOfExpiry}
                    onChange={e => setEditForm(prev => ({ ...prev, dateOfExpiry: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-text-primary"
                  />
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
              </div>

              {/* Documents & Video Uploads */}
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
                              href={doc.current}
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
                            onChange={e => handleFileChange(doc.field, e.target.files?.[0] || null)}
                          />
                          Replace File
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
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
