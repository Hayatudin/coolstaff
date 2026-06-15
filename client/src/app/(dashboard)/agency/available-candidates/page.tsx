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
  Image as ImageIcon
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
  registeredAt?: string | null;
  facePhotoUrl?: string | null;
  fullBodyPhotoUrl?: string | null;
  passportImageUrl?: string | null;
  nationality?: string | null;
  educationLevel?: string | null;
  maritalStatus?: string | null;
  workExperience?: any;
  skills?: any;
}

const SKILL_TAGS = ['WASH & IRON', 'BABY SITTING', 'COOKING', 'CLEANING', 'DRIVING'];

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

// Safe skills array parser
const getSkillsArray = (skills: any): string[] => {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills.map(String);
  if (typeof skills === 'string') {
    try {
      const parsed = JSON.parse(skills);
      if (Array.isArray(parsed)) return parsed.map(String);
      return [skills];
    } catch {
      return skills.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
};

// Skills matcher helper
const matchesSkill = (candidateSkills: string[], skillName: string): boolean => {
  const normalized = skillName.toLowerCase();
  if (normalized === 'wash & iron') {
    return candidateSkills.some(s => {
      const l = s.toLowerCase();
      return l.includes('wash') || l.includes('iron') || l.includes('laundry');
    });
  }
  if (normalized === 'baby sitting') {
    return candidateSkills.some(s => {
      const l = s.toLowerCase();
      return l.includes('baby') || l.includes('sitting') || l.includes('child') || l.includes('kid');
    });
  }
  if (normalized === 'cooking') {
    return candidateSkills.some(s => {
      const l = s.toLowerCase();
      return l.includes('cook');
    });
  }
  if (normalized === 'cleaning') {
    return candidateSkills.some(s => {
      const l = s.toLowerCase();
      return l.includes('clean');
    });
  }
  if (normalized === 'driving') {
    return candidateSkills.some(s => {
      const l = s.toLowerCase();
      return l.includes('driv');
    });
  }
  return candidateSkills.some(s => s.toLowerCase().includes(normalized));
};

const getExperienceDisplay = (workExperience: any): string => {
  const exps = Array.isArray(workExperience) ? workExperience : [];
  if (exps.length === 0) {
    return 'First-Timer (جديد)';
  }
  return 'Experienced';
};

export default function AvailableCandidatesPage() {
  const [candidates, setCandidates] = useState<AvailableCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  // Search and Filter States
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgency, setSelectedAgency] = useState<string>('all');

  const { data: session } = useSession();
  const userRole = ((session?.user as any)?.role ?? 'user') as string;
  const isSuperAdmin = userRole === 'super_admin';

  // Input states for filters
  const [inputMinAge, setInputMinAge] = useState('');
  const [inputMaxAge, setInputMaxAge] = useState('');
  const [inputReligion, setInputReligion] = useState('all');
  const [inputExperience, setInputExperience] = useState('all');
  const [inputEducation, setInputEducation] = useState('all');
  const [inputMaritalStatus, setInputMaritalStatus] = useState('all');
  const [inputSkills, setInputSkills] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Applied filter states
  const [appliedFilters, setAppliedFilters] = useState({
    minAge: '',
    maxAge: '',
    religion: 'all',
    experience: 'all',
    education: 'all',
    maritalStatus: 'all',
    skills: [] as string[],
  });

  // Selection state
  const [isSelectingId, setIsSelectingId] = useState<string | null>(null);
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<Set<string>>(new Set());

  // Video modal state
  const [playVideoUrl, setPlayVideoUrl] = useState<string | null>(null);

  // Full Image Modal State
  const [previewFullImageUrl, setPreviewFullImageUrl] = useState<string | null>(null);

  // CV Preview States
  const [previewCv, setPreviewCv] = useState<{ candidate: Candidate; templateId: string } | null>(null);
  const [loadingCvId, setLoadingCvId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const cvRenderRef = useRef<HTMLDivElement>(null);

  // Dynamically compute unique filters from candidates list
  const uniqueReligions = useMemo(() => {
    const religions = new Set<string>();
    candidates.forEach(c => {
      if (c.religion) religions.add(c.religion.trim());
    });
    return Array.from(religions).sort();
  }, [candidates]);

  const uniqueEducationLevels = useMemo(() => {
    const edu = new Set<string>();
    candidates.forEach(c => {
      if (c.educationLevel) edu.add(c.educationLevel.trim());
    });
    return Array.from(edu).sort();
  }, [candidates]);

  const uniqueMaritalStatuses = useMemo(() => {
    const status = new Set<string>();
    candidates.forEach(c => {
      if (c.maritalStatus) status.add(c.maritalStatus.trim());
    });
    return Array.from(status).sort();
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
      setSelectedCheckboxes(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
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

  const toggleSkillTag = (skill: string) => {
    setInputSkills(prev => {
      if (prev.includes(skill)) {
        return prev.filter(s => s !== skill);
      } else {
        return [...prev, skill];
      }
    });
  };

  const handleApplyFilters = () => {
    setAppliedFilters({
      minAge: inputMinAge,
      maxAge: inputMaxAge,
      religion: inputReligion,
      experience: inputExperience,
      education: inputEducation,
      maritalStatus: inputMaritalStatus,
      skills: inputSkills,
    });
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setInputMinAge('');
    setInputMaxAge('');
    setInputReligion('all');
    setInputExperience('all');
    setInputEducation('all');
    setInputMaritalStatus('all');
    setInputSkills([]);
    setAppliedFilters({
      minAge: '',
      maxAge: '',
      religion: 'all',
      experience: 'all',
      education: 'all',
      maritalStatus: 'all',
      skills: [],
    });
    setSearchInput('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Toggle single checkbox
  const handleToggleCheckbox = (id: string) => {
    setSelectedCheckboxes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all visible candidates
  const handleSelectAll = () => {
    const allIds = filteredCandidates.map(c => c.id);
    setSelectedCheckboxes(new Set(allIds));
  };

  // Unselect all
  const handleUnselectAll = () => {
    setSelectedCheckboxes(new Set());
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

      // 2. Age Range Filters
      if (appliedFilters.minAge || appliedFilters.maxAge) {
        const age = getAge(c.dateOfBirth);
        if (age === null) return false;
        if (appliedFilters.minAge && age < parseInt(appliedFilters.minAge)) return false;
        if (appliedFilters.maxAge && age > parseInt(appliedFilters.maxAge)) return false;
      }

      // 3. Religion Filter
      if (appliedFilters.religion !== 'all') {
        if (!c.religion || c.religion.toLowerCase() !== appliedFilters.religion.toLowerCase()) {
          return false;
        }
      }

      // 4. Experience Filter
      if (appliedFilters.experience !== 'all') {
        const exps = Array.isArray(c.workExperience) ? c.workExperience : [];
        if (appliedFilters.experience === 'first-timer' && exps.length > 0) {
          return false;
        }
        if (appliedFilters.experience === 'experienced' && exps.length === 0) {
          return false;
        }
      }

      // 5. Education Filter
      if (appliedFilters.education !== 'all') {
        if (!c.educationLevel || c.educationLevel.toLowerCase() !== appliedFilters.education.toLowerCase()) {
          return false;
        }
      }

      // 6. Marital Status Filter
      if (appliedFilters.maritalStatus !== 'all') {
        if (!c.maritalStatus || c.maritalStatus.toLowerCase() !== appliedFilters.maritalStatus.toLowerCase()) {
          return false;
        }
      }

      // 7. Skills Tag Filter
      if (appliedFilters.skills.length > 0) {
        const candidateSkills = getSkillsArray(c.skills);
        const matchesAllSkills = appliedFilters.skills.every(skill => matchesSkill(candidateSkills, skill));
        if (!matchesAllSkills) return false;
      }

      return true;
    }).sort((a, b) => {
      const dateA = a.registeredAt ? new Date(a.registeredAt).getTime() : 0;
      const dateB = b.registeredAt ? new Date(b.registeredAt).getTime() : 0;
      if (sortOrder === 'newest') {
        return dateB - dateA;
      } else {
        return dateA - dateB;
      }
    });
  }, [candidates, searchQuery, appliedFilters, sortOrder]);

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

      {/* Search Input and Sort Control */}
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
        
        <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-gray-200">
            <span className="text-xs font-black text-text-secondary">Sort:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="bg-transparent text-xs font-bold text-text-primary focus:outline-none cursor-pointer border-0 p-0 pr-6"
            >
              <option value="newest">New to Old</option>
              <option value="oldest">Old to New</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="flex flex-col gap-3 bg-white/80 backdrop-blur-md p-5 rounded-3xl border border-white/20 shadow-sm">
        {/* Line 1: Age interval and Dropdowns */}
        <div className="flex flex-wrap items-center gap-3.5">
          {/* Age Bounds */}
          <div className="flex items-center gap-2 text-xs font-black text-slate-650">
            <span>Age:</span>
            <input
              type="number"
              placeholder="Min"
              value={inputMinAge}
              onChange={(e) => setInputMinAge(e.target.value)}
              className="w-16 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#00A4EF]/20 text-center"
            />
            <span className="text-slate-400 font-medium">to</span>
            <input
              type="number"
              placeholder="Max"
              value={inputMaxAge}
              onChange={(e) => setInputMaxAge(e.target.value)}
              className="w-16 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#00A4EF]/20 text-center"
            />
          </div>

          {/* Religion Select */}
          <select
            value={inputReligion}
            onChange={(e) => setInputReligion(e.target.value)}
            className="bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00A4EF]/20 cursor-pointer"
          >
            <option value="all">All religions</option>
            {uniqueReligions.map((r) => (
              <option key={r} value={r.toLowerCase()}>
                {r}
              </option>
            ))}
          </select>

          {/* Experience Select */}
          <select
            value={inputExperience}
            onChange={(e) => setInputExperience(e.target.value)}
            className="bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00A4EF]/20 cursor-pointer"
          >
            <option value="all">All experience</option>
            <option value="first-timer">First-Timer</option>
            <option value="experienced">Experienced</option>
          </select>

          {/* Education Select */}
          <select
            value={inputEducation}
            onChange={(e) => setInputEducation(e.target.value)}
            className="bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00A4EF]/20 cursor-pointer"
          >
            <option value="all">All education</option>
            {uniqueEducationLevels.map((e) => (
              <option key={e} value={e.toLowerCase()}>
                {e}
              </option>
            ))}
          </select>

          {/* Marital Status Select */}
          <select
            value={inputMaritalStatus}
            onChange={(e) => setInputMaritalStatus(e.target.value)}
            className="bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00A4EF]/20 cursor-pointer"
          >
            <option value="all">All marital status</option>
            {uniqueMaritalStatuses.map((s) => (
              <option key={s} value={s.toLowerCase()}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Line 2: Skills and Action buttons */}
        <div className="flex flex-wrap items-center gap-3.5 mt-2 pt-3 border-t border-dashed border-gray-150/80">
          <span className="text-xs font-black text-slate-650">Skills:</span>
          <div className="flex flex-wrap gap-2">
            {SKILL_TAGS.map((skill) => {
              const active = inputSkills.includes(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkillTag(skill)}
                  className={`px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                    active
                      ? 'bg-[#e2315a] text-white border border-[#e2315a] shadow-sm shadow-pink-100'
                      : 'bg-[#e2315a]/10 text-[#e2315a] border border-transparent hover:bg-[#e2315a]/20'
                  }`}
                >
                  {skill}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleApplyFilters}
              className="bg-[#00A4EF] hover:bg-[#008bcb] text-white px-5 py-1.5 rounded-full text-xs font-black transition-all shadow-sm cursor-pointer"
            >
              Filter
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              className="bg-[#e2315a] hover:bg-[#c9244c] text-white px-5 py-1.5 rounded-full text-xs font-black transition-all shadow-sm cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Stats and Selection Counter Status Bar */}
      <div className="bg-white p-5 rounded-[20px] border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          {/* Available Count */}
          <div className="flex items-center gap-2">
            <div className="bg-[#e2315a] text-white rounded-full w-8 h-8 flex items-center justify-center font-extrabold text-sm shadow-sm shadow-pink-200">
              {filteredCandidates.length}
            </div>
            <span className="text-sm font-black text-slate-700">Available</span>
          </div>

          {/* Selected Count */}
          <div className="flex items-center gap-2">
            <div className="bg-[#00A4EF] text-white rounded-full w-8 h-8 flex items-center justify-center font-extrabold text-sm shadow-sm shadow-blue-200">
              {selectedCheckboxes.size}
            </div>
            <span className="text-sm font-black text-slate-700">Selected</span>
          </div>
        </div>

        {/* Links */}
        <div className="flex items-center gap-4 text-xs font-black text-[#00A4EF]">
          <button
            type="button"
            onClick={handleSelectAll}
            className="hover:underline cursor-pointer transition-all active:scale-95"
          >
            Select All
          </button>
          <span className="text-slate-300 font-normal">|</span>
          <button
            type="button"
            onClick={handleUnselectAll}
            className="hover:underline cursor-pointer transition-all active:scale-95"
          >
            Unselect All
          </button>
        </div>
      </div>

      {/* Main Grid of Candidate Cards */}
      {isLoading ? (
        <div className="bg-white rounded-[2rem] border border-gray-100 p-24 text-center shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={36} className="text-primary animate-spin" />
            <p className="text-sm font-semibold text-text-tertiary animate-pulse">Loading available candidates...</p>
          </div>
        </div>
      ) : paginatedCandidates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedCandidates.map((c) => {
            const hasVideo = !!c.videoUrl;
            return (
              <div 
                key={c.id} 
                className="bg-white border-2 border-[#e2315a] rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col"
              >
                {/* Selection Checkbox */}
                <div className="absolute top-4 left-4">
                  <input
                    type="checkbox"
                    checked={selectedCheckboxes.has(c.id)}
                    onChange={() => handleToggleCheckbox(c.id)}
                    className="w-5 h-5 border-2 border-slate-350 rounded accent-[#e2315a] cursor-pointer"
                  />
                </div>

                {/* Age Badge */}
                <div className="absolute top-4 right-4 bg-white border border-[#e2315a] text-[#e2315a] text-[11px] font-black px-2.5 py-1 rounded-lg shadow-sm">
                  {getAge(c.dateOfBirth) ? `${getAge(c.dateOfBirth)} Years` : '—'}
                </div>

                {/* Avatar and Full Image Button */}
                <div className="flex items-center gap-4 mt-6">
                  <div className="w-20 h-20 rounded-full border-4 border-[#e2315a] overflow-hidden shrink-0 shadow-sm">
                    <img
                      src={getFileUrl(c.facePhotoUrl || c.passportImageUrl || '')}
                      alt={c.givenNames}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/150x150/f472b6/ffffff?text=' + c.givenNames.charAt(0);
                      }}
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => setPreviewFullImageUrl(getFileUrl(c.fullBodyPhotoUrl || c.facePhotoUrl || c.passportImageUrl || ''))}
                      className="flex items-center gap-1.5 bg-[#e2315a] hover:bg-[#c9244c] text-white text-[11px] font-black px-3.5 py-1.5 rounded-full transition-all active:scale-95 shadow-sm shadow-pink-200 cursor-pointer"
                    >
                      <ImageIcon size={12} className="shrink-0" />
                      Full image
                    </button>
                  </div>
                </div>

                {/* Candidate Name */}
                <h3 className="font-black text-[#1e293b] text-[15px] uppercase leading-snug mt-4 font-sans tracking-wide">
                  {c.givenNames} {c.surname}
                </h3>

                {/* Details list (two columns grid) */}
                <div className="mt-4 pt-4 border-t border-dashed border-pink-100 flex flex-col gap-2.5 text-[12px] text-slate-700">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 truncate">
                      <span className="text-slate-400 font-medium">Passport No : </span>
                      <span className="font-extrabold text-slate-800">{c.passportNumber}</span>
                    </div>
                    <div className="flex-1 truncate">
                      <span className="text-slate-400 font-medium">Job : </span>
                      <span className="font-extrabold text-slate-800">{c.job || '—'}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 truncate">
                      <span className="text-slate-400 font-medium">Nationality : </span>
                      <span className="font-extrabold text-slate-800">{c.nationality || '—'}</span>
                    </div>
                    <div className="flex-1 truncate">
                      <span className="text-slate-400 font-medium">Experience : </span>
                      <span className="font-extrabold text-slate-800">
                        {getExperienceDisplay(c.workExperience)}
                      </span>
                    </div>
                  </div>
                  <div className="truncate">
                    <span className="text-slate-400 font-medium">Religion : </span>
                    <span className="font-extrabold text-slate-800">{c.religion || '—'}</span>
                  </div>
                </div>

                {/* Conditional View CV and Watch Video Buttons */}
                {hasVideo ? (
                  <div className="flex items-center gap-2 mt-5">
                    <button
                      type="button"
                      disabled={loadingCvId === c.id}
                      onClick={() => handlePreviewCV(c.id, c.latestCVTemplate!)}
                      className="flex-1 bg-[#00A4EF] hover:bg-[#008bcb] disabled:opacity-50 text-white text-[12px] font-black py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {loadingCvId === c.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <FileText size={14} />
                      )}
                      View CV
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlayVideoUrl(c.videoUrl)}
                      className="flex-1 bg-[#e2315a] hover:bg-[#c9244c] text-white text-[12px] font-black py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Video size={14} />
                      Watch Video
                    </button>
                  </div>
                ) : (
                  <div className="mt-5">
                    <button
                      type="button"
                      disabled={loadingCvId === c.id}
                      onClick={() => handlePreviewCV(c.id, c.latestCVTemplate!)}
                      className="w-full bg-[#00A4EF] hover:bg-[#008bcb] disabled:opacity-50 text-white text-[12px] font-black py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {loadingCvId === c.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <FileText size={14} />
                      )}
                      View CV
                    </button>
                  </div>
                )}

                {/* Green Select Button at the bottom of the card */}
                <button
                  type="button"
                  disabled={isSelectingId !== null}
                  onClick={() => handleSelectCandidate(c.id)}
                  className="w-full mt-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[12px] font-black py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                >
                  {isSelectingId === c.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  Select
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-gray-100 p-32 text-center shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center">
              <User size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-bold text-gray-900">No candidates found</p>
            <p className="text-xs text-gray-400">
              {searchQuery || appliedFilters.minAge || appliedFilters.maxAge || appliedFilters.religion !== 'all' || appliedFilters.experience !== 'all' || appliedFilters.skills.length > 0
                ? 'Try resetting the filters'
                : 'There are no available candidates matching your agency at the moment.'}
            </p>
          </div>
        </div>
      )}

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

      {/* Full Body Image Overlay Modal */}
      {previewFullImageUrl && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewFullImageUrl(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4.5 border-b border-border bg-gray-50/50">
              <h3 className="font-extrabold text-text-primary text-sm flex items-center gap-2">
                <ImageIcon size={18} className="text-[#e2315a]" />
                Candidate Full Image
              </h3>
              <button 
                onClick={() => setPreviewFullImageUrl(null)}
                className="text-text-tertiary hover:text-text-primary p-2 rounded-lg hover:bg-gray-100 font-bold transition-all text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 bg-slate-50 flex items-center justify-center max-h-[70vh] overflow-y-auto relative">
              <img
                src={previewFullImageUrl}
                alt="Full Candidate"
                className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/300x450/f472b6/ffffff?text=Full+Photo+Unavailable';
                }}
              />
            </div>
            
            <div className="p-4 border-t border-border bg-gray-50/50 flex justify-end">
              <button 
                onClick={() => setPreviewFullImageUrl(null)}
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
