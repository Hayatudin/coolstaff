'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  RotateCcw, 
  Eye, 
  Check, 
  X, 
  Loader2, 
  Building, 
  User, 
  Video, 
  FileText, 
  ChevronDown,
  Briefcase,
  Heart,
  Globe,
  Calendar,
  GraduationCap
} from 'lucide-react';
import { api } from '@/lib/api';
import { getFileUrl } from '@/lib/utils';
import { Candidate } from '@/types';
import { useSession } from '@/lib/auth-client';

import ALMTemplate from '@/components/cv/templates/ALMTemplate';
import KA7Template from '@/components/cv/templates/KA7Template';
import KU2Template from '@/components/cv/templates/KU2Template';
import MATemplate from '@/components/cv/templates/MATemplate';
import RATemplate from '@/components/cv/templates/RATemplate';
import AlShablanTemplate from '@/components/cv/templates/AlShablanTemplate';
import UssusTemplate from '@/components/cv/templates/UssusTemplate';
import VisionTemplate from '@/components/cv/templates/VisionTemplate';

const TEMPLATES = [
  { id: 'ussus', name: 'USSUS', component: UssusTemplate },
  { id: 'al-shablan', name: 'AL-Shablan', component: AlShablanTemplate },
  { id: 'alm', name: 'ALAALAM', component: ALMTemplate },
  { id: 'ka7', name: 'KAAFAAT', component: KA7Template },
  { id: 'ku2', name: 'KHUZAM', component: KU2Template },
  { id: 'ma', name: 'MA Standard', component: MATemplate },
  { id: 'ra', name: 'RAYAAT', component: RATemplate },
  { id: 'vision', name: 'Vision Layout', component: VisionTemplate },
];

const AGENCIES = [
  { id: 'all', name: 'All Agencies' },
  { id: 'ussus', name: 'USSUS' },
  { id: 'al-shablan', name: 'AL-Shablan' },
  { id: 'alm', name: 'ALAALAM' },
  { id: 'ka7', name: 'KAAFAAT' },
  { id: 'ku2', name: 'KHUZAM' },
  { id: 'ma', name: 'MA Standard' },
  { id: 'ra', name: 'RAYAAT' },
  { id: 'vision', name: 'Vision Layout' },
];

const AGENCY_MAP: Record<string, string> = {
  'ussus': 'USSUS',
  'al-shablan': 'AL-Shablan',
  'alm': 'ALAALAM',
  'ka7': 'KAAFAAT',
  'ku2': 'KHUZAM',
  'ma': 'MA Standard',
  'ra': 'RAYAAT',
  'vision': 'Vision Layout',
};

interface AvailableCandidate {
  id: string;
  givenNames: string;
  surname: string;
  passportNumber: string;
  religion: string | null;
  job: string | null;
  dateOfBirth: string | null;
  videoUrl: string | null;
  latestCVTemplate: string | null;
  broker: { name: string } | null;
  agency?: string | null;
}

const getCandidateAgencyName = (c: AvailableCandidate) => {
  const rawAgency = c.latestCVTemplate?.replace('tmpl-', '').toLowerCase() || c.agency?.toLowerCase() || '';
  return AGENCY_MAP[rawAgency] || rawAgency.toUpperCase() || '—';
};

const getVisiblePages = (current: number, total: number) => {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, '...', total];
  if (current >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
};

const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  if (url.includes('youtube.com/embed/')) return url;
  return url;
};

export default function AvailableCandidatesPage() {
  const [candidates, setCandidates] = useState<AvailableCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedAgency, setSelectedAgency] = useState<string>('all');

  const { data: session } = useSession();
  const userRole = ((session?.user as any)?.role ?? 'user') as string;
  const isSuperAdmin = userRole === 'super_admin';

  // Filters
  const [filterReligion, setFilterReligion] = useState<string>('all');
  const [filterJob, setFilterJob] = useState<string>('all');
  const [filterMinAge, setFilterMinAge] = useState<string>('');
  const [filterMaxAge, setFilterMaxAge] = useState<string>('');

  // Selection state
  const [isSelectingId, setIsSelectingId] = useState<string | null>(null);

  // Video modal state
  const [playVideoUrl, setPlayVideoUrl] = useState<string | null>(null);

  // CV Preview States
  const [previewCv, setPreviewCv] = useState<{ candidate: Candidate; templateId: string } | null>(null);
  const [loadingCvId, setLoadingCvId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const cvRenderRef = useRef<HTMLDivElement>(null);

  // Dynamically compute unique jobs and religions from candidates list
  const uniqueJobs = useMemo(() => {
    const jobs = new Set<string>();
    candidates.forEach(c => {
      if (c.job) jobs.add(c.job.trim());
    });
    return Array.from(jobs).sort();
  }, [candidates]);

  const uniqueReligions = useMemo(() => {
    const religions = new Set<string>();
    candidates.forEach(c => {
      if (c.religion) religions.add(c.religion.trim());
    });
    return Array.from(religions).sort();
  }, [candidates]);

  // Helper to calculate candidate age
  const getAge = (dateOfBirthStr: string | null | undefined): number | null => {
    if (!dateOfBirthStr) return null;
    const dob = new Date(dateOfBirthStr);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const handlePreviewCV = async (id: string, templateId: string) => {
    setLoadingCvId(id);
    try {
      const res = await api(`/api/candidates/${id}`);
      if (!res.ok) throw new Error('Failed to fetch candidate details');
      const details = await res.json();
      setPreviewCv({
        candidate: details,
        templateId: templateId.replace('tmpl-', '').toLowerCase()
      });
    } catch (err) {
      console.error(err);
      alert('Failed to load candidate CV information.');
    } finally {
      setLoadingCvId(null);
    }
  };

  const handleDownloadCV = async (format: 'pdf' | 'jpg' | 'doc') => {
    if (!previewCv) return;
    const candidateId = previewCv.candidate.id;
    const safeName = `${previewCv.candidate.passportData?.givenNames || 'candidate'}_${previewCv.candidate.passportData?.surname || 'cv'}`.replace(/\s+/g, '_');
    
    setIsDownloading(true);
    try {
      if (format === 'doc') {
        const response = await api(`/api/candidates/${candidateId}/export/docx`);
        if (!response.ok) throw new Error('DOCX export failed');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${safeName}.docx`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
      } else if (format === 'pdf' || format === 'jpg') {
        const el = cvRenderRef.current;
        if (!el) throw new Error('Target element not rendered');
        
        const htmlToImage = (await import('html-to-image'));
        const { default: jsPDF } = (await import('jspdf'));
        
        const origH = el.style.height;
        const origO = el.style.overflow;
        el.style.height = 'auto';
        el.style.overflow = 'visible';

        const dataUrl = await htmlToImage.toJpeg(el, { 
          quality: 0.95, 
          backgroundColor: '#ffffff', 
          pixelRatio: 1.5,
          fontEmbedCSS: '',
          imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        });
        el.style.height = origH;
        el.style.overflow = origO;

        if (format === 'jpg') {
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `${safeName}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfW = pdf.internal.pageSize.getWidth();
          const props = pdf.getImageProperties(dataUrl);
          const totalH = props.height / (props.width / pdfW);
          pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfW, totalH);
          if (totalH > pdf.internal.pageSize.getHeight() + 10) {
            pdf.addPage();
            pdf.addImage(dataUrl, 'JPEG', 0, -297, pdfW, totalH);
          }
          const blob = pdf.output('blob');
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${safeName}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download CV file.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Fetch candidates from /api/agency/available-candidates
  const fetchCandidates = async () => {
    setIsLoading(true);
    try {
      const url = isSuperAdmin && selectedAgency !== 'all' 
        ? `/api/agency/available-candidates?agency=${selectedAgency}`
        : '/api/agency/available-candidates';
      const res = await api(url);
      if (!res.ok) throw new Error('Failed to fetch candidates');
      const data = await res.json();
      setCandidates(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error occurred while loading candidates');
      setCandidates([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [selectedAgency, isSuperAdmin]);

  // Handle Select Candidate
  const handleSelectCandidate = async (id: string) => {
    if (!confirm('Are you sure you want to select this candidate? This will notify the super admin.')) return;
    setIsSelectingId(id);
    try {
      const res = await api(`/api/agency/candidates/${id}/select`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to select candidate');
      
      // Remove candidate from available list
      setCandidates(prev => prev.filter(c => c.id !== id));
      alert('Candidate successfully selected! The candidate has been moved to the Contracts page.');
    } catch (err: any) {
      alert(err.message || 'Failed to select candidate.');
    } finally {
      setIsSelectingId(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setFilterReligion('all');
    setFilterJob('all');
    setFilterMinAge('');
    setFilterMaxAge('');
    setCurrentPage(1);
  };

  // Memoized filtered candidates list
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      // 1. Text Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName = `${c.givenNames} ${c.surname}`.toLowerCase();
        const matchesName = fullName.includes(query);
        const matchesPassport = c.passportNumber.toLowerCase().includes(query);
        if (!matchesName && !matchesPassport) return false;
      }

      // 2. Religion Filter
      if (filterReligion !== 'all' && c.religion?.toLowerCase() !== filterReligion) {
        return false;
      }

      // 3. Job Filter
      if (filterJob !== 'all' && c.job?.toLowerCase() !== filterJob) {
        return false;
      }

      // 4. Age Range Filters
      if (filterMinAge || filterMaxAge) {
        const age = getAge(c.dateOfBirth);
        if (age === null) return false;
        if (filterMinAge && age < parseInt(filterMinAge)) return false;
        if (filterMaxAge && age > parseInt(filterMaxAge)) return false;
      }

      return true;
    });
  }, [candidates, searchQuery, filterReligion, filterJob, filterMinAge, filterMaxAge]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterReligion, filterJob, filterMinAge, filterMaxAge]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredCandidates.length / ITEMS_PER_PAGE);
  const paginatedCandidates = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCandidates.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredCandidates, currentPage]);

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* Upper header segment */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <User size={22} />
            </div>
            Available Candidates
          </h1>
          <p className="text-text-secondary text-sm font-medium mt-1">Sourced candidates with generated CVs awaiting selection.</p>
        </div>
        {isSuperAdmin && (
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 shadow-sm shrink-0">
            <Building className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-text-secondary">Agency:</span>
            <select
              value={selectedAgency}
              onChange={(e) => setSelectedAgency(e.target.value)}
              className="bg-transparent text-xs font-black text-text-primary focus:outline-none cursor-pointer border-0 p-0 pr-8"
            >
              {AGENCIES.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-3xl text-sm font-semibold animate-fade-in shadow-sm">
          <X className="w-5 h-5 shrink-0 text-red-600" />
          <div>
            <p className="font-extrabold text-red-800">Error Loading Candidates</p>
            <p className="text-xs text-red-600/90 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-white/20 shadow-sm animate-fade-in">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black text-text-secondary">Religion</label>
          <select
            value={filterReligion}
            onChange={(e) => setFilterReligion(e.target.value)}
            className="bg-white px-4 py-2.5 rounded-2xl border border-gray-200/80 text-xs font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            <option value="all">All Religions</option>
            {uniqueReligions.map((r) => (
              <option key={r} value={r.toLowerCase()}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black text-text-secondary">Job Title</label>
          <select
            value={filterJob}
            onChange={(e) => setFilterJob(e.target.value)}
            className="bg-white px-4 py-2.5 rounded-2xl border border-gray-200/80 text-xs font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            <option value="all">All Jobs</option>
            {uniqueJobs.map((j) => (
              <option key={j} value={j.toLowerCase()}>
                {j}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black text-text-secondary">Min Age</label>
          <input
            type="number"
            placeholder="e.g. 21"
            value={filterMinAge}
            onChange={(e) => setFilterMinAge(e.target.value)}
            className="bg-white px-4 py-2.5 rounded-2xl border border-gray-200/80 text-xs font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black text-text-secondary">Max Age</label>
          <input
            type="number"
            placeholder="e.g. 45"
            value={filterMaxAge}
            onChange={(e) => setFilterMaxAge(e.target.value)}
            className="bg-white px-4 py-2.5 rounded-2xl border border-gray-200/80 text-xs font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Search and Toolbars */}
      <div className="flex flex-col xl:flex-row xl:items-center gap-4 bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-white/20 shadow-sm">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search by Name or Passport Number..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200/80 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
            />
          </div>
          <button 
            type="submit"
            className="px-6 py-3 bg-[#00A4EF] hover:bg-[#0089c8] text-white text-sm font-bold rounded-2xl shadow-sm hover:shadow transition-all shrink-0 active:scale-95 cursor-pointer"
          >
            Search
          </button>
        </form>
        
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={handleResetFilters}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filters
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-surface rounded-[2rem] border border-border/30 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-border/30 text-[10px] uppercase tracking-wider font-bold text-text-tertiary/90">
                <th className="px-5 py-4 font-semibold text-center w-12">#</th>
                <th className="px-5 py-4 font-semibold">Candidate</th>
                {isSuperAdmin && <th className="px-5 py-4 font-semibold">Agency</th>}
                <th className="px-5 py-4 font-semibold text-center">Age</th>
                <th className="px-5 py-4 font-semibold text-center">Religion</th>
                <th className="px-5 py-4 font-semibold">Job/Role</th>
                <th className="px-5 py-4 font-semibold">Broker</th>
                <th className="px-5 py-4 font-semibold text-center">Video</th>
                <th className="px-5 py-4 font-semibold text-center">CV</th>
                <th className="px-5 py-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 10 : 9} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={36} className="text-[#464479] animate-spin" />
                      <p className="text-sm font-semibold text-text-tertiary animate-pulse">Loading available candidates...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedCandidates.length > 0 ? (
                paginatedCandidates.map((c, index) => {
                  const rollNo = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/30 transition-colors group">
                      
                      {/* Roll Number */}
                      <td className="px-5 py-4.5 text-center font-bold text-text-tertiary">
                        {rollNo}
                      </td>

                      {/* Candidate Identity */}
                      <td className="px-5 py-4.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-xs text-indigo-600 shrink-0">
                            {c.givenNames.charAt(0)}{c.surname.charAt(0)}
                          </div>
                          <div>
                            <p className="font-extrabold text-[#1E293B] text-sm uppercase leading-tight">
                              {c.givenNames} {c.surname}
                            </p>
                            <p className="text-[11px] text-text-tertiary font-medium mt-0.5 font-mono">{c.passportNumber}</p>
                          </div>
                        </div>
                      </td>

                      {/* Agency Column */}
                      {isSuperAdmin && (
                        <td className="px-5 py-4.5">
                          <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-100">
                            {getCandidateAgencyName(c)}
                          </span>
                        </td>
                      )}

                      {/* Age */}
                      <td className="px-5 py-4.5 text-center font-bold text-gray-700">
                        {getAge(c.dateOfBirth) || '—'}
                      </td>

                      {/* Religion */}
                      <td className="px-5 py-4.5 text-center font-semibold text-gray-750">
                        {c.religion || '—'}
                      </td>

                      {/* Job */}
                      <td className="px-5 py-4.5">
                        <span className="font-semibold text-slate-700">
                          {c.job || '—'}
                        </span>
                      </td>

                      {/* Broker */}
                      <td className="px-5 py-4.5">
                        <span className="font-semibold text-slate-700">
                          {c.broker?.name || '—'}
                        </span>
                      </td>

                      {/* Video */}
                      <td className="px-5 py-4.5 text-center">
                        {c.videoUrl ? (
                          <button
                            onClick={() => setPlayVideoUrl(c.videoUrl)}
                            className="px-3.5 py-1.5 rounded-xl border border-rose-500/35 hover:border-rose-500 text-rose-500 hover:bg-rose-500/5 text-xs font-extrabold shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Video size={12} />
                            View
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-text-tertiary italic">No Video</span>
                        )}
                      </td>

                      {/* CV */}
                      <td className="px-5 py-4.5 text-center">
                        {c.latestCVTemplate ? (
                          <button
                            disabled={loadingCvId === c.id}
                            onClick={() => handlePreviewCV(c.id, c.latestCVTemplate!)}
                            className="px-3.5 py-1.5 rounded-xl border border-[#00A4EF]/35 hover:border-[#00A4EF] text-[#00A4EF] hover:bg-[#00A4EF]/5 text-xs font-extrabold shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {loadingCvId === c.id ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                            View
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-text-tertiary italic">No CV</span>
                        )}
                      </td>

                      {/* Action (Select) */}
                      <td className="px-5 py-4.5 text-center">
                        <button
                          disabled={isSelectingId !== null}
                          onClick={() => handleSelectCandidate(c.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          {isSelectingId === c.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Check size={12} />
                          )}
                          Select
                        </button>
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isSuperAdmin ? 10 : 9} className="px-6 py-32 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center">
                        <User size={24} className="text-gray-300" />
                      </div>
                      <p className="text-sm font-bold text-gray-900">No candidates found</p>
                      <p className="text-xs text-gray-400">
                        {searchQuery || filterReligion !== 'all' || filterJob !== 'all' || filterMinAge || filterMaxAge
                          ? 'Try resetting the filters'
                          : 'There are no available candidates matching your agency at the moment.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info counts */}
        {!isLoading && filteredCandidates.length > 0 && (
          <div className="px-6 py-4 border-t border-border/20 text-xs text-text-tertiary flex items-center justify-between">
            <span>Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredCandidates.length)} of {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''}</span>
          </div>
        )}
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

          {getVisiblePages(currentPage, totalPages).map((page, i) => {
            if (page === '...') {
              return <span key={`dots-${i}`} className="text-text-tertiary px-1 font-bold">…</span>;
            }
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page as number)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all border cursor-pointer ${page === currentPage
                    ? 'bg-primary text-white border-primary shadow-md'
                    : 'border-border text-text-secondary hover:bg-primary/10 hover:border-primary/30'
                  }`}
              >
                {page}
              </button>
            );
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

      {/* CV Preview Modal */}
      {previewCv && (() => {
        const PrevTemplate = TEMPLATES.find(t => t.id === previewCv.templateId)?.component || ALMTemplate;
        return (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setPreviewCv(null)}
          >
            <div 
              className="bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4.5 border-b border-border bg-gray-50/50 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-text-primary text-sm">CV Preview</h3>
                    <p className="text-xs text-text-tertiary">{previewCv.candidate.passportData?.givenNames} {previewCv.candidate.passportData?.surname}</p>
                  </div>
                </div>
                
                {/* Download and Close Actions */}
                <div className="flex items-center gap-2">
                  <button
                    disabled={isDownloading}
                    onClick={() => handleDownloadCV('pdf')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50"
                  >
                    PDF
                  </button>
                  <button
                    disabled={isDownloading}
                    onClick={() => handleDownloadCV('jpg')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50"
                  >
                    JPG
                  </button>
                  <button
                    disabled={isDownloading}
                    onClick={() => handleDownloadCV('doc')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50"
                  >
                    DOCX
                  </button>
                  <button 
                    onClick={() => setPreviewCv(null)}
                    className="text-text-tertiary hover:text-text-primary p-2 rounded-lg hover:bg-gray-100 font-bold transition-all text-sm cursor-pointer ml-1"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Preview Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-100/30 flex justify-center items-start">
                <div className="w-[800px] shrink-0 bg-white shadow-lg relative border border-border" ref={cvRenderRef}>
                  <PrevTemplate
                    candidate={previewCv.candidate}
                    facePhoto={getFileUrl(previewCv.candidate.facePhotoUrl || previewCv.candidate.passportImageUrl)}
                    fullBodyPhoto={getFileUrl(previewCv.candidate.fullBodyPhotoUrl)}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-border bg-gray-50/50 flex justify-end">
                <button 
                  onClick={() => setPreviewCv(null)}
                  className="px-5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-750 transition-colors cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Video Player Modal */}
      {playVideoUrl && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPlayVideoUrl(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4.5 border-b border-border bg-gray-50/50">
              <h3 className="font-extrabold text-text-primary text-sm flex items-center gap-2">
                <Video size={18} className="text-rose-600" />
                Watch Candidate Video
              </h3>
              <button 
                onClick={() => setPlayVideoUrl(null)}
                className="text-text-tertiary hover:text-text-primary p-2 rounded-lg hover:bg-gray-100 font-bold transition-all text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 bg-slate-900 flex items-center justify-center aspect-video relative">
              {(() => {
                const isYouTube = playVideoUrl.includes('youtube.com') || playVideoUrl.includes('youtu.be');
                if (isYouTube) {
                  return (
                    <iframe
                      src={getYouTubeEmbedUrl(playVideoUrl)}
                      className="absolute inset-0 w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  );
                } else {
                  return (
                    <video
                      src={getFileUrl(playVideoUrl)}
                      controls
                      autoPlay
                      className="max-w-full max-h-full rounded-xl"
                    />
                  );
                }
              })()}
            </div>
            
            <div className="p-4 border-t border-border bg-gray-50/50 flex justify-end">
              <button 
                onClick={() => setPlayVideoUrl(null)}
                className="px-5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-750 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
