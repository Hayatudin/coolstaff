'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Candidate } from '@/types';
import {
  ArrowLeft, Edit3, Trash2, Calendar, MapPin, Phone, Mail, User, Briefcase,
  Heart, GraduationCap, Globe, FileText, Eye, Loader2, Clock, Download, ExternalLink,
  Lock
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { getFileUrl, getDownloadUrl } from '@/lib/utils';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth-client';

const InfoItem = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | number | undefined }) => (
  <div className="group flex flex-col py-3 px-4 rounded-2xl hover:bg-primary/5 transition-colors border border-transparent hover:border-primary/10 min-w-0">
    <div className="flex items-center gap-2 mb-1">
      <Icon size={14} className="text-primary/60" />
      <p className="text-[10px] text-text-tertiary uppercase tracking-[0.15em] font-bold">{label}</p>
    </div>
    <p className="text-[15px] text-text-primary font-semibold pl-5 break-all whitespace-normal">{value || '—'}</p>
  </div>
);

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role ?? 'user';
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewDoc, setViewDoc] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<string | null>(null);

  const handleImportFile = async (field: string, file: File) => {
    const limit = 50 * 1024 * 1024;
    if (file.size > limit) {
      alert(`Max file size is ${limit / (1024 * 1024)}MB`);
      return;
    }
    setIsImporting(field);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      if (ev.target?.result) {
        const base64 = ev.target.result as string;
        try {
          const res = await api(`/api/candidates/${params.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [field]: base64 }),
          });
          if (!res.ok) throw new Error('Failed to upload');
          const updatedCandidate = await res.json();
          setCandidate(updatedCandidate);
          alert('Document successfully imported!');
        } catch (err) {
          alert('Failed to import document.');
        } finally {
          setIsImporting(null);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    async function fetchCandidate() {
      try {
        const res = await api(`/api/candidates/${params.id}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setCandidate(data);
      } catch {
        setCandidate(null);
      } finally {
        setIsLoading(false);
      }
    }
    if (params.id) fetchCandidate();
  }, [params.id]);

  const handleDelete = async () => {
    if (!candidate) return;
    if (!confirm('Are you sure you want to delete this candidate? This action cannot be undone.')) return;
    try {
      await api(`/api/candidates/${candidate.id}`, { method: 'DELETE' });
      router.push('/candidates');
    } catch { alert('Failed to delete'); }
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={36} className="text-primary animate-spin" />
          <p className="text-text-tertiary">Loading candidate...</p>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-text-tertiary text-lg">Candidate not found.</p>
        <button onClick={() => router.push('/candidates')} className="text-primary hover:underline font-medium">← Back to Candidates</button>
      </div>
    );
  }

  const c = candidate;
  const pd = c.passportData;
  const pi = c.personalInfo;


  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-10">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors font-bold text-[13px] uppercase tracking-wider">
          <ArrowLeft size={16} /> Back
        </button>
      </div>



      {/* Profile Header Card (Inspiration Design) */}
      <div className="bg-white rounded-[2rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {/* Light Blue Header Section */}
        <div className="bg-[#F0F6FB] px-8 py-10 flex flex-col sm:flex-row items-center sm:items-start gap-8 relative">

          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-40 h-40 rounded-full bg-white shadow-xl shadow-black/5 flex items-center justify-center overflow-hidden border-[6px] border-white ring-1 ring-black/5">
              {c.facePhotoUrl ? (
                <img src={getFileUrl(c.facePhotoUrl)} alt="Face" className="w-full h-full object-cover" crossOrigin="anonymous" />
              ) : (
                <span className="text-primary font-black text-5xl">{pd.givenNames.charAt(0)}{pd.surname.charAt(0)}</span>
              )}
            </div>
            {/* Status Badge Overlapping Avatar */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#A020F0] text-white text-[11px] font-bold px-4 py-1.5 rounded-full border-2 border-white shadow-md whitespace-nowrap">
              {c.status.toUpperCase()}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 flex flex-col justify-center sm:mt-2 text-center sm:text-left w-full">
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-[#1E293B] tracking-tight">{pd.givenNames} {pd.surname}</h1>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2.5">
                  {/* Small Badges */}
                  {c.isRequested && (
                    <span className="text-[#FF7A59] border border-[#FF7A59]/30 bg-white rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Requested</span>
                  )}
                  <span className="text-indigo-600 border border-indigo-200 bg-white rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Candidate</span>
                  {pi.job && (
                    <span className="text-gray-600 border border-gray-200 bg-white rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">{pi.job}</span>
                  )}
                </div>

                <div className="mt-5">
                  <p className="text-gray-800 text-[15px] font-medium">{pi.job || 'Unassigned'}</p>
                  <p className="text-gray-500 text-[13px] font-medium mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                    <MapPin size={14} className="text-gray-400" /> {pd.placeOfBirth ? `${pd.placeOfBirth}, ` : ''}{pd.nationality}
                  </p>
                </div>
              </div>

              {/* Top Right Actions (Like the 'send message' button) */}
              {userRole !== 'calling' && (
                <div className="flex flex-row xl:flex-col items-center xl:items-end justify-center gap-2 mt-4 xl:mt-0">
                  <button
                    onClick={() => router.push(`/registration?edit=${c.id}`)}
                    className="flex items-center justify-center gap-2 px-5 py-2 rounded-md text-xs font-bold shadow-sm transition-all w-full xl:w-auto bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 cursor-pointer"
                  >
                    <Edit3 size={14} /> Edit Profile
                  </button>
                  <button
                    onClick={() => handleDelete()}
                    className="flex items-center justify-center gap-2 px-5 py-2 bg-white text-red-600 border border-red-100 hover:bg-red-50 hover:border-red-200 rounded-md text-xs font-bold shadow-sm transition-all w-full xl:w-auto cursor-pointer"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats / Bottom Section */}
        <div className="bg-white px-8 py-5 flex flex-col sm:flex-row items-center justify-between border-t border-gray-200">
          <div className="flex items-center gap-10">
            <div className="text-center">
              <p className="text-2xl font-black text-gray-900">{pi.languages?.length || 0}</p>
              <p className="text-[11px] text-gray-500 uppercase tracking-wider font-bold mt-0.5">Languages</p>
            </div>
            <div className="w-px h-10 bg-gray-200"></div>
            <div className="text-center">
              <p className="text-2xl font-black text-gray-900">{pi.skills?.length || 0}</p>
              <p className="text-[11px] text-gray-500 uppercase tracking-wider font-bold mt-0.5">Skills</p>
            </div>
            <div className="w-px h-10 bg-gray-200 hidden sm:block"></div>
            <div className="text-center hidden sm:block">
              <p className="text-2xl font-black text-gray-900">{pi.workExperience?.length || 0}</p>
              <p className="text-[11px] text-gray-500 uppercase tracking-wider font-bold mt-0.5">Experience</p>
            </div>
          </div>

          <div className="mt-6 sm:mt-0 w-full sm:w-auto">
            {c.broker?.name === 'Calling' ? (
              <div className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-3 rounded-md font-bold text-sm bg-gray-100 text-gray-400 border border-gray-200/50 cursor-not-allowed select-none" title="CV is not available for Calling candidates.">
                <FileText size={16} /> CV Not Available
              </div>
            ) : c.isLocked ? (
              <div className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-3 rounded-md font-bold text-sm bg-gray-100 text-gray-400 border border-gray-200/50 cursor-not-allowed select-none" title="Candidate is locked. CV generation is unavailable.">
                <Lock size={16} /> CV Locked
              </div>
            ) : (
              <button
                onClick={() => router.push(`/cv-generator?candidateId=${c.id}`)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-3 rounded-md font-bold text-sm shadow-md transition-all transform bg-[#00A4EF] text-white hover:bg-[#0093D6] hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
              >
                <FileText size={16} /> Generate CV
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Candidate Video */}
          {(() => {
            const hasLocalVideo = !!c.quickVideoUrl || (!!c.videoUrl && !c.videoUrl.startsWith('http'));
            const hasYoutubeVideo = !!c.videoUrl && c.videoUrl.startsWith('http');
            
            if (!hasLocalVideo && !hasYoutubeVideo) {
              return (
                <div className="bg-surface rounded-[2rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 text-center py-12">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-text-secondary font-semibold text-sm">Video URL is not inserted</p>
                </div>
              );
            }

            return (
              <div className="space-y-6">
                {hasLocalVideo && (
                  <div className="bg-surface rounded-[2rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
                    <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
                      <svg className="w-5 h-5 text-primary animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Candidate Video Profile
                    </h2>
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-border bg-black shadow-sm group">
                      <video
                        src={getFileUrl(c.quickVideoUrl || c.videoUrl!)}
                        controls
                        className="w-full h-full object-contain"
                        crossOrigin="anonymous"
                      />
                    </div>
                  </div>
                )}

                {hasYoutubeVideo && (
                  <div className="bg-surface rounded-[2rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
                    <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                      YouTube Video Profile
                    </h2>
                    <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-red-50/20 rounded-2xl border border-red-100/50">
                      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
                        <svg className="w-9 h-9 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                      </div>
                      <div className="flex-1 text-center sm:text-left min-w-0">
                        <p className="text-base font-bold text-text-primary">Watch YouTube Video</p>
                        <p className="text-xs text-text-tertiary mt-1 truncate max-w-md">{c.videoUrl}</p>
                      </div>
                      <a
                        href={c.videoUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2.5 px-6 py-2.5 border border-red-200/60 bg-white hover:bg-red-50 text-red-600 rounded-xl text-sm font-black shadow-sm transition-all shrink-0 cursor-pointer"
                      >
                        <svg className="w-4.5 h-4.5 text-red-600 fill-current" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                        Watch on YouTube
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Passport Information */}
          <div className="bg-surface rounded-[2rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
            <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
              <FileText size={20} className="text-primary" /> Passport Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <InfoItem icon={FileText} label="Passport Number" value={pd.passportNumber} />
              <InfoItem icon={Globe} label="Nationality" value={pd.nationality} />
              <InfoItem icon={MapPin} label="Issuing Country" value={pd.issuingCountry} />
              <InfoItem icon={MapPin} label="Place of Birth" value={pd.placeOfBirth} />
              <InfoItem icon={Calendar} label="Date of Birth" value={pd.dateOfBirth ? new Date(pd.dateOfBirth).toLocaleDateString() : ''} />
              <InfoItem icon={User} label="Gender" value={pd.gender} />
              <InfoItem icon={Calendar} label="Date of Issue" value={pd.dateOfIssue ? new Date(pd.dateOfIssue).toLocaleDateString() : ''} />
              <InfoItem icon={Calendar} label="Date of Expiry" value={pd.dateOfExpiry ? new Date(pd.dateOfExpiry).toLocaleDateString() : ''} />
            </div>
          </div>

          {/* Personal Details */}
          <div className="bg-surface rounded-[2rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
            <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
              <User size={20} className="text-primary" /> Personal Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <InfoItem icon={Heart} label="Marital Status" value={pi.maritalStatus} />
              <InfoItem icon={User} label="Children" value={pi.numberOfChildren} />
              <InfoItem icon={Heart} label="Religion" value={pi.religion} />
              <div className="group flex flex-col py-3 px-4 rounded-2xl hover:bg-primary/5 transition-colors border border-transparent hover:border-primary/10">
                <div className="flex items-center gap-2 mb-1">
                  <Phone size={14} className="text-primary/60" />
                  <p className="text-[10px] text-text-tertiary uppercase tracking-[0.15em] font-bold">Phone Numbers</p>
                </div>
                <div className="space-y-1 pl-5">
                  <p className="text-[15px] text-text-primary font-semibold">{pi.phone || '—'}</p>
                  {pi.additionalPhones && pi.additionalPhones.length > 0 && pi.additionalPhones.map((p, i) => (
                    <p key={i} className="text-[15px] text-text-primary font-semibold">{p}</p>
                  ))}
                </div>
              </div>
              <InfoItem icon={Mail} label="Email" value={pi.email} />
              <InfoItem icon={MapPin} label="Address" value={[pi.address, pi.city, pi.state, pi.country].filter(Boolean).join(', ')} />
              <InfoItem icon={GraduationCap} label="Education" value={pi.educationLevel} />
              <InfoItem icon={Briefcase} label="Job" value={pi.job} />
              <InfoItem icon={FileText} label="ID Number" value={pi.idNumber} />
            </div>
          </div>

          {/* Skills & Languages */}
          <div className="bg-surface rounded-[2rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
            <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
              <Briefcase size={20} className="text-primary" /> Skills & Languages
            </h2>
            <div className="space-y-6">
              <div>
                <p className="text-[11px] text-text-tertiary uppercase tracking-[0.1em] font-bold mb-3">Languages</p>
                <div className="flex flex-wrap gap-2">
                  {pi.languages?.length > 0 ? pi.languages.map(l => (
                    <span key={l} className="px-4 py-1.5 bg-primary/5 text-primary text-sm font-bold rounded-xl border border-primary/10">{l}</span>
                  )) : <span className="text-text-tertiary text-sm font-semibold pl-1">—</span>}
                </div>
              </div>
              <div>
                <p className="text-[11px] text-text-tertiary uppercase tracking-[0.1em] font-bold mb-3">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {pi.skills?.length > 0 ? pi.skills.map(s => (
                    <span key={s} className="px-4 py-1.5 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-xl border border-emerald-100">{s}</span>
                  )) : <span className="text-text-tertiary text-sm font-semibold pl-1">—</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-surface rounded-[2rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
            <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
              <Phone size={20} className="text-red-500" /> Emergency Contact
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoItem icon={User} label="Name" value={pi.emergencyContactName} />
              <InfoItem icon={Heart} label="Relation" value={pi.emergencyContactRelation} />
              <InfoItem icon={Phone} label="Phone" value={pi.emergencyContactPhone} />
              <InfoItem icon={MapPin} label="Address" value={pi.emergencyContactAddress} />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Broker Details */}
          <div className="bg-surface rounded-[2rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
            <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
              <User size={20} className="text-primary" /> Broker Details
            </h2>
            {c.broker ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-[1.25rem] border border-primary/10">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                    <User size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] text-primary/70 uppercase tracking-[0.1em] font-bold">Broker Name</p>
                    <span className="text-[15px] font-bold text-primary">{c.broker.name}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-gray-50/80 rounded-[1.25rem] border border-gray-100">
                <p className="text-text-tertiary text-[15px] font-semibold">No broker assigned</p>
              </div>
            )}
          </div>

          {/* Generated CV */}
          {c.broker?.name !== 'Calling' && (
            <div className="bg-surface rounded-[2rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
              <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
                <FileText size={20} className="text-emerald-500" /> Generated CV
              </h2>
              {c.latestCVTemplate ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 p-4 bg-emerald-50/50 rounded-[1.25rem] border border-emerald-100/50">
                    <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
                      <FileText size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-emerald-700/70 uppercase tracking-[0.1em] font-bold">Template Layout</p>
                      <span className="text-[15px] font-bold text-emerald-800 uppercase block truncate">{c.latestCVTemplate}</span>
                    </div>
                    {c.isLocked ? (
                      <span className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-650 border border-red-200/60 rounded-xl text-xs font-black select-none" title="Candidate is locked. CV is unavailable.">
                        <Lock size={12} className="text-red-500" />
                        Locked
                      </span>
                    ) : (
                      <button
                        onClick={() => router.push(`/generated-cvs?folder=${c.latestCVTemplate}&search=${c.passportData.passportNumber}`)}
                        className="shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                      >
                        View
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 p-4 bg-gray-50/80 rounded-[1.25rem] border border-gray-100">
                    <p className="text-text-tertiary text-[15px] font-semibold">No CV generated yet</p>
                  </div>
                  <button onClick={() => router.push(`/cv-generator?candidateId=${c.id}`)} className="w-full py-3 bg-emerald-100 text-emerald-800 rounded-xl text-sm font-bold hover:bg-emerald-200 transition-colors">
                    Generate CV
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Shelf ID */}
          <div className="bg-surface rounded-[2rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
            <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <FileText size={20} className="text-primary" /> Shelf ID
            </h2>
            <div className="px-5 py-3 bg-gray-50/80 text-text-primary rounded-xl text-[15px] font-mono font-bold inline-block border border-gray-200/50 tracking-wider">
              {c.shelfId || 'UNASSIGNED'}
            </div>
          </div>

          {/* Documents */}
          <div className="bg-surface rounded-[2rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
            <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
              <FileText size={20} className="text-primary" /> Documents
            </h2>
            <div className="space-y-3">
              {[
                { label: 'COC Certificate', url: c.cocDocumentUrl, field: 'cocDocumentUrl', color: 'primary', accept: 'image/*,application/pdf' },
                { label: 'Medical Report', url: c.medicalDocumentUrl, field: 'medicalDocumentUrl', color: 'emerald', accept: 'image/*,application/pdf' },
                { label: 'Passport Scan', url: c.passportImageUrl, field: 'passportImageUrl', color: 'primary', accept: 'image/*,application/pdf' },
                { label: 'Candidate ID', url: c.candidateIdImageUrl, field: 'candidateIdImageUrl', color: 'blue', accept: 'image/*,application/pdf' },
                { label: 'Relative ID', url: c.relativeIdImageUrl, field: 'relativeIdImageUrl', color: 'amber', accept: 'image/*,application/pdf' },
                { label: 'Labour ID', url: c.labourIdUrl, field: 'labourIdUrl', color: 'violet', accept: 'image/*,application/pdf' },
                { label: 'Candidate Video', url: c.quickVideoUrl, field: 'quickVideoUrl', color: 'pink', accept: 'video/*' },
              ].map((doc) => (
                <div key={doc.field} className="flex items-center justify-between p-4 bg-gray-50/80 rounded-[1.25rem] border border-transparent hover:border-gray-200/50 transition-colors">
                  <span className="text-[14px] font-bold text-text-primary">{doc.label}</span>
                  {doc.url ? (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setViewDoc(getFileUrl(doc.url!))} className={`text-[11px] uppercase tracking-[0.1em] text-${doc.color}-600 hover:text-${doc.color}-800 font-black px-3 py-1.5 bg-${doc.color}-100 hover:bg-${doc.color}-200 rounded-lg transition-colors flex items-center gap-1.5`}><Eye size={12} /> View</button>
                      <a href={getDownloadUrl(doc.url!)} download rel="noreferrer" className="text-[11px] uppercase tracking-[0.1em] text-gray-600 hover:text-gray-800 font-black px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5"><Download size={12} /> Save</a>
                    </div>
                  ) : (
                    <label className="text-[11px] uppercase tracking-[0.1em] text-emerald-600 hover:text-emerald-800 font-black px-3 py-1.5 bg-emerald-100/70 hover:bg-emerald-200/70 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer">
                      {isImporting === doc.field ? 'Importing...' : 'Import'}
                      <input type="file" accept={doc.accept} className="hidden" disabled={isImporting !== null} onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImportFile(doc.field, file); }} />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Registration Info */}
          <div className="bg-surface rounded-[2rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
            <h2 className="text-lg font-bold text-text-primary mb-3">Registration</h2>
            <p className="text-[15px] font-medium text-text-secondary">
              Registered on <span className="font-bold text-text-primary">{new Date(c.registeredAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {viewDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewDoc(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl max-h-[90vh] w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary">Document Preview</h3>
              <button onClick={() => setViewDoc(null)} className="text-text-tertiary hover:text-text-primary text-xl font-bold px-2">✕</button>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto max-h-[80vh]">
              {viewDoc.startsWith('data:image') || (viewDoc.startsWith('http') && !viewDoc.toLowerCase().endsWith('.pdf')) ? (
                <img src={viewDoc} alt="Document" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
              ) : viewDoc.startsWith('data:application/pdf') ? (
                <iframe src={viewDoc} className="w-full h-[70vh] rounded-lg" />
              ) : viewDoc.startsWith('http') && viewDoc.toLowerCase().endsWith('.pdf') ? (
                <div className="flex flex-col items-center w-full">
                  <img src={viewDoc.replace(/\.pdf$/i, '.jpg')} alt="Document Preview" className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-sm border border-border mb-3" />
                  <a href={viewDoc} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm font-medium flex items-center gap-2 bg-primary-50 px-4 py-2 rounded-lg">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    Open Original PDF
                  </a>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-text-tertiary mb-2">Cannot preview this document type.</p>
                  <a href={viewDoc} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open in new tab</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
