'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Check, ArrowLeft, Loader2, User, Calendar, Globe, Briefcase, GraduationCap, Heart, Baby } from 'lucide-react';

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/quick-registrations/${id}`);
        if (!res.ok) throw new Error('Failed to load data');
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

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

  return (
    <div className="max-w-2xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
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
            Registered {new Date(data.createdAt).toLocaleDateString()} — Click the copy icon to copy each field
          </p>
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
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-amber-500/5 to-transparent border-b border-border px-5 py-3">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Additional Information</h2>
        </div>
        <div className="p-3 sm:p-4 space-y-2">
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
    </div>
  );
}
