'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Loader2, ClipboardList, Search, Eye, Calendar, User, ShieldCheck, X, Upload, CheckCircle2, XCircle, ArrowRight, FileText } from 'lucide-react';

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

  // Verify modal state
  const [verifyTarget, setVerifyTarget] = useState<QuickReg | null>(null);
  const [verifyStep, setVerifyStep] = useState<'upload' | 'result'>('upload');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedPassport, setExtractedPassport] = useState<string | null>(null);
  const [passportMatch, setPassportMatch] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);
  const [promoteSuccess, setPromoteSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api('/api/quick-registrations');
        const data = await res.json();
        if (Array.isArray(data)) setRegistrations(data);
      } catch (err) {
        console.error('Failed to fetch quick registrations', err);
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
    setPassportMatch(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api('/api/extract/musaned', { method: 'POST', body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to process PDF');

      const extractedNum = result.data?.passportNumber?.trim()?.toUpperCase() || '';
      setExtractedPassport(extractedNum);

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

  const openVerifyModal = (reg: QuickReg) => {
    setVerifyTarget(reg);
    setVerifyStep('upload');
    setExtractedPassport(null);
    setPassportMatch(false);
    setVerifyError(null);
    setPromoteSuccess(null);
  };

  const closeVerifyModal = () => {
    setVerifyTarget(null);
    setPromoteSuccess(null);
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
                <th className="px-4 sm:px-6 py-3 font-semibold">Candidate</th>
                <th className="px-4 sm:px-6 py-3 font-semibold hidden sm:table-cell">Passport No.</th>
                <th className="px-4 sm:px-6 py-3 font-semibold hidden md:table-cell">Religion</th>
                <th className="px-4 sm:px-6 py-3 font-semibold hidden lg:table-cell">Experience</th>
                <th className="px-4 sm:px-6 py-3 font-semibold hidden sm:table-cell">Status</th>
                <th className="px-4 sm:px-6 py-3 font-semibold hidden sm:table-cell">Date</th>
                <th className="px-4 sm:px-6 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
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
                      <td className="px-4 sm:px-6 py-4 cursor-pointer" onClick={() => router.push(`/quick-registration/preview/${r.id}`)}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-primary font-bold text-xs">
                              {r.givenNames?.charAt(0)}{r.surname?.charAt(0)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-text-primary text-sm truncate">{r.givenNames} {r.surname}</p>
                            <p className="text-[11px] text-text-tertiary sm:hidden">{r.passportNumber}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                        <span className="text-xs font-mono font-bold text-text-secondary bg-gray-100 px-2 py-1 rounded">{r.passportNumber}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-text-secondary hidden md:table-cell">{r.religion || '—'}</td>
                      <td className="px-4 sm:px-6 py-4 hidden lg:table-cell">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                          experienceLabel === 'Experienced'
                            ? 'bg-green-50 text-green-700'
                            : experienceLabel === 'New'
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-text-tertiary'
                        }`}>
                          {experienceLabel}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                        {getStatusBadge(r.verificationStatus || 'pending')}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-xs text-text-tertiary hidden sm:table-cell">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => router.push(`/quick-registration/preview/${r.id}`)}
                            className="p-2 rounded-lg hover:bg-primary/10 text-text-tertiary hover:text-primary transition-colors"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          {r.verificationStatus !== 'promoted' && (
                            <button
                              onClick={() => openVerifyModal(r)}
                              className="p-2 rounded-lg hover:bg-emerald-100 text-text-tertiary hover:text-emerald-700 transition-colors"
                              title="Verify with Musaned CV"
                            >
                              <ShieldCheck size={16} />
                            </button>
                          )}
                          {r.promotedCandidateId && (
                            <button
                              onClick={() => router.push(`/candidates/${r.promotedCandidateId}`)}
                              className="p-2 rounded-lg hover:bg-blue-100 text-text-tertiary hover:text-blue-700 transition-colors"
                              title="View Candidate"
                            >
                              <ArrowRight size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
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
                      <button
                        onClick={handlePromote}
                        disabled={isPromoting}
                        className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 text-sm"
                      >
                        {isPromoting ? (
                          <><Loader2 size={16} className="animate-spin" /> Pushing Documents...</>
                        ) : (
                          <><ShieldCheck size={16} /> Push Documents to Candidate</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
