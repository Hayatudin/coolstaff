'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  RotateCcw, 
  Download, 
  Eye, 
  Check, 
  X, 
  Calendar, 
  Loader2, 
  Building, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Heart, 
  Globe, 
  FileText, 
  ChevronDown,
  Info,
  Clock,
  Video,
  FileCheck,
  Image as ImageIcon
} from 'lucide-react';
import { api } from '@/lib/api';
import { getFileUrl, getDownloadUrl } from '@/lib/utils';
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

// Simplified candidate data structure from agency endpoint
interface AgencyCandidate {
  id: string;
  givenNames: string;
  surname: string;
  passportNumber: string;
  embassyIssue: string;
  cocStatus: string;
  medicalStatus: string;
  tasheerStatus: string;
  wakalaStatus: string;
  qrCodeStatus: string;
  selectedType: string;
  travelDate: string | null;
  agencyStatus: string;
  latestCVTemplate: string | null;
  broker: { name: string } | null;
  agency?: string | null;
  religion?: string | null;
  job?: string | null;
  dateOfBirth?: string | null;
}

const getCandidateAgencyName = (c: AgencyCandidate) => {
  const rawAgency = c.latestCVTemplate?.replace('tmpl-', '').toLowerCase() || c.agency?.toLowerCase() || '';
  return AGENCY_MAP[rawAgency] || rawAgency.toUpperCase() || '—';
};

const getVisiblePages = (current: number, total: number) => {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, '...', total];
  if (current >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
};

export default function AgencyContractsPage() {
  const [candidates, setCandidates] = useState<AgencyCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeTab, setActiveTab] = useState<string>('All');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const { data: session } = useSession();
  const userRole = ((session?.user as any)?.role ?? 'user') as string;
  const isSuperAdmin = userRole === 'super_admin';
  const [selectedAgency, setSelectedAgency] = useState<string>('all');

  // Agency Filter States
  const [filterReligion, setFilterReligion] = useState<string>('all');
  const [filterJob, setFilterJob] = useState<string>('all');
  const [filterMinAge, setFilterMinAge] = useState<string>('');
  const [filterMaxAge, setFilterMaxAge] = useState<string>('');

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

  // Detail Modal States
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [candidateDetails, setCandidateDetails] = useState<Candidate | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'profile' | 'passport' | 'documents'>('profile');
  const [viewDocUrl, setViewDocUrl] = useState<string | null>(null);

  // Updating tracking states
  const [updatingField, setUpdatingField] = useState<{ candidateId: string; fieldName: string } | null>(null);

  // References for dropdowns and click-outside tracking
  const dropdownRef = useRef<HTMLDivElement>(null);

  // CV Preview States
  const [previewCv, setPreviewCv] = useState<{ candidate: Candidate; templateId: string } | null>(null);
  const [loadingCvId, setLoadingCvId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const cvRenderRef = useRef<HTMLDivElement>(null);

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
      alert('Failed to retrieve candidate details for CV preview.');
    } finally {
      setLoadingCvId(null);
    }
  };

  const handleDownloadCV = async (format: 'pdf' | 'jpg' | 'doc') => {
    if (!previewCv || !cvRenderRef.current) return;
    const el = cvRenderRef.current;
    setIsDownloading(true);
    try {
      const htmlToImage = await import('html-to-image');
      const pNo = previewCv.candidate.passportData?.passportNumber || 'CV';
      const givenNames = previewCv.candidate.passportData?.givenNames || '';
      const surname = previewCv.candidate.passportData?.surname || '';
      const namePart = `${givenNames}_${surname}`.trim().replace(/\s+/g, '_');
      const safeName = `${namePart}_${previewCv.templateId.toUpperCase()}_${pNo}`.replace(/[^a-zA-Z0-9_]/g, '');

      const downloadBlob = (blob: Blob, name: string) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 2000);
      };

      if (format === 'doc') {
        const payload = {
          candidateId: previewCv.candidate.id,
          templateId: `tmpl-${previewCv.templateId}`,
          format: 'doc',
          deadline: previewCv.candidate.cvDeadline || new Date().toISOString().split('T')[0],
          facePhoto: getFileUrl(previewCv.candidate.facePhotoUrl || previewCv.candidate.passportImageUrl),
          fullBodyPhoto: getFileUrl(previewCv.candidate.fullBodyPhotoUrl)
        };

        const response = await api('/api/cv/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to generate DOCX');
        const blob = await response.blob();
        downloadBlob(blob, `${safeName}.docx`);
      } else if (format === 'jpg') {
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

        const res = await fetch(dataUrl);
        downloadBlob(await res.blob(), `${safeName}.jpg`);
      } else {
        const { jsPDF } = await import('jspdf');
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

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfW = pdf.internal.pageSize.getWidth();
        const props = pdf.getImageProperties(dataUrl);
        const totalH = props.height / (props.width / pdfW);
        pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfW, totalH);
        if (totalH > pdf.internal.pageSize.getHeight() + 10) {
          pdf.addPage();
          pdf.addImage(dataUrl, 'JPEG', 0, -297, pdfW, totalH);
        }
        downloadBlob(pdf.output('blob'), `${safeName}.pdf`);
      }
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download CV file.');
    } finally {
      setIsDownloading(false);
    }
  };


  // Fetch candidates from /api/agency/candidates
  const fetchCandidates = async (agencyFilter?: string) => {
    setIsLoading(true);
    try {
      let url = '/api/agency/candidates';
      if (agencyFilter && agencyFilter !== 'all') {
        url += `?agency=${encodeURIComponent(agencyFilter)}`;
      }
      const res = await api(url);
      if (!res.ok) throw new Error('Failed to load agency candidates');
      const data = await res.json();
      setCandidates(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong while fetching data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates(selectedAgency);
  }, [selectedAgency]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, filterReligion, filterJob, filterMinAge, filterMaxAge, selectedAgency]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Update a candidate's status via PATCH /api/agency/candidates/:id
  const handleUpdateCandidate = async (id: string, updates: Partial<AgencyCandidate>) => {
    const fieldName = Object.keys(updates)[0];
    setUpdatingField({ candidateId: id, fieldName });
    
    // Optimistic update local state
    const originalCandidates = [...candidates];
    setCandidates(prev => 
      prev.map(c => c.id === id ? { ...c, ...updates } : c)
    );
    if (candidateDetails && candidateDetails.id === id) {
      // also update details modal if open
      setCandidateDetails((prev: any) => {
        if (!prev) return null;
        if (fieldName === 'medicalStatus') {
          return {
            ...prev,
            personalInfo: { ...prev.personalInfo, medicalStatus: updates.medicalStatus }
          };
        }
        return { ...prev, ...updates };
      });
    }

    try {
      const res = await api(`/api/agency/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error('Failed to update candidate state');
      
      // Update success - get fresh values
      const updatedData = await res.json();
      
      // Sync local state with exact DB response
      setCandidates(prev => 
        prev.map(c => c.id === id ? { 
          ...c, 
          embassyIssue: updatedData.embassyIssue ?? c.embassyIssue,
          cocStatus: updatedData.cocStatus ?? c.cocStatus,
          medicalStatus: updatedData.medicalStatus ?? c.medicalStatus,
          tasheerStatus: updatedData.tasheerStatus ?? c.tasheerStatus,
          wakalaStatus: updatedData.wakalaStatus ?? c.wakalaStatus,
          qrCodeStatus: updatedData.qrCodeStatus ?? c.qrCodeStatus,
          selectedType: updatedData.selectedType ?? c.selectedType,
          travelDate: updatedData.travelDate ? new Date(updatedData.travelDate).toISOString() : null,
          agencyStatus: updatedData.agencyStatus ?? c.agencyStatus
        } : c)
      );
    } catch (err) {
      console.error('[UPDATE ERROR]', err);
      alert('Failed to update candidate status. Reverting changes...');
      // Revert to original on error
      setCandidates(originalCandidates);
    } finally {
      setUpdatingField(null);
      setOpenDropdownId(null);
    }
  };

  // Helper to determine if date is within next 7 days
  const isTravelNext7Days = (dateStr: string | null | undefined) => {
    if (!dateStr) return false;
    const travel = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setDate(today.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return travel >= today && travel <= end;
  };

  // Compute counts for tabs dynamically
  const tabCounts = useMemo(() => {
    return {
      all: candidates.length,
      inProcess: candidates.filter(c => c.agencyStatus === 'Under Process').length,
      arrived: candidates.filter(c => c.agencyStatus === 'Arrived').length,
      returned: candidates.filter(c => c.agencyStatus === 'Returned').length,
      wakalaUnpaid: candidates.filter(c => c.wakalaStatus === 'Unpaid').length,
      company: candidates.filter(c => c.selectedType === 'Company').length,
      private: candidates.filter(c => c.selectedType === 'Private').length,
      travelNext7: candidates.filter(c => isTravelNext7Days(c.travelDate)).length,
      unfit: candidates.filter(c => c.medicalStatus?.toLowerCase() === 'unfit').length,
    };
  }, [candidates]);

  // Search logic on Search button or query change
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setActiveTab('All');
    setFilterReligion('all');
    setFilterJob('all');
    setFilterMinAge('');
    setFilterMaxAge('');
  };

  // Filter candidates based on Search + Active Tab + Agency Filters
  const filteredCandidates = useMemo(() => {
    let list = candidates;

    // Apply search filter (Name, Passport, Visa Number)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c => {
        const fullName = `${c.givenNames} ${c.surname}`.toLowerCase();
        const passport = (c.passportNumber || '').toLowerCase();
        return fullName.includes(q) || passport.includes(q);
      });
    }

    // Apply active KPI tab filter
    switch (activeTab) {
      case 'In Process':
        list = list.filter(c => c.agencyStatus === 'Under Process');
        break;
      case 'Arrived':
        list = list.filter(c => c.agencyStatus === 'Arrived');
        break;
      case 'Returned':
        list = list.filter(c => c.agencyStatus === 'Returned');
        break;
      case 'Wakala Unpaid':
        list = list.filter(c => c.wakalaStatus === 'Unpaid');
        break;
      case 'Company':
        list = list.filter(c => c.selectedType === 'Company');
        break;
      case 'Private':
        list = list.filter(c => c.selectedType === 'Private');
        break;
      case 'Travel Next 7 Days':
        list = list.filter(c => isTravelNext7Days(c.travelDate));
        break;
      case 'Unfit':
        list = list.filter(c => c.medicalStatus?.toLowerCase() === 'unfit');
        break;
      default:
        break;
    }

    // Apply Agency-specific filters if user is NOT a super_admin
    if (!isSuperAdmin) {
      if (filterReligion && filterReligion !== 'all') {
        list = list.filter(c => c.religion?.toLowerCase() === filterReligion.toLowerCase());
      }
      if (filterJob && filterJob !== 'all') {
        list = list.filter(c => c.job?.toLowerCase() === filterJob.toLowerCase());
      }
      if (filterMinAge.trim() !== '') {
        const minAgeVal = parseInt(filterMinAge, 10);
        if (!isNaN(minAgeVal)) {
          list = list.filter(c => {
            const age = getAge(c.dateOfBirth);
            return age !== null && age >= minAgeVal;
          });
        }
      }
      if (filterMaxAge.trim() !== '') {
        const maxAgeVal = parseInt(filterMaxAge, 10);
        if (!isNaN(maxAgeVal)) {
          list = list.filter(c => {
            const age = getAge(c.dateOfBirth);
            return age !== null && age <= maxAgeVal;
          });
        }
      }
    }

    return list;
  }, [candidates, searchQuery, activeTab, filterReligion, filterJob, filterMinAge, filterMaxAge, isSuperAdmin]);

  const totalPages = Math.ceil(filteredCandidates.length / ITEMS_PER_PAGE) || 1;
  const paginatedCandidates = useMemo(() => {
    return filteredCandidates.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredCandidates, currentPage]);

  // Fetch full details of the candidate for modal view
  const handleViewDetails = async (id: string) => {
    setSelectedCandidateId(id);
    setLoadingDetails(true);
    setCandidateDetails(null);
    setActiveDetailTab('profile');
    try {
      const res = await api(`/api/candidates/${id}`);
      if (!res.ok) throw new Error('Failed to load candidate details');
      const details = await res.json();
      setCandidateDetails(details);
    } catch (err: any) {
      console.error(err);
      alert('Failed to retrieve full candidate profile.');
      setSelectedCandidateId(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  // CSV Exporter (Excel Compatible)
  const handleExportCSV = () => {
    const headers = [
      'Roll No', 'Given Names', 'Surname', 'Passport Number', 'Embassy Issue', 
      'COC Status', 'Medical Status', 'Tasheer Status', 'Wakala Status', 
      'QR Code Status', 'Selected Type', 'Travel Date', 'Status', 'Broker', 'Latest CV Template'
    ];

    const rows = filteredCandidates.map((c, i) => [
      String(i + 1),
      c.givenNames,
      c.surname,
      c.passportNumber,
      c.embassyIssue,
      c.cocStatus,
      c.medicalStatus,
      c.tasheerStatus,
      c.wakalaStatus,
      c.qrCodeStatus,
      c.selectedType,
      c.travelDate ? c.travelDate.substring(0, 10) : '—',
      c.agencyStatus,
      c.broker?.name || '—',
      c.latestCVTemplate || '—'
    ]);

    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `coolstaff-contracts-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Title & Control Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">Contracts</h1>
          <p className="text-text-secondary text-sm font-medium mt-1">Manage and track candidate workflows, status metrics and travel dates.</p>
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
          <svg className="w-5 h-5 shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-extrabold text-red-800">Error Loading Candidates</p>
            <p className="text-xs text-red-600/90 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Agency-Only Filters */}
      {!isSuperAdmin && (
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
      )}

      {/* Search and Toolbars */}
      <div className="flex flex-col xl:flex-row xl:items-center gap-4 bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-white/20 shadow-sm">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search by Name, Passport No, Visa No, National ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200/80 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
            />
          </div>
          <button 
            type="submit"
            className="px-6 py-3 bg-[#00A4EF] hover:bg-[#0089c8] text-white text-sm font-bold rounded-2xl shadow-sm hover:shadow transition-all shrink-0 active:scale-95"
          >
            Search
          </button>
        </form>
        
        {/* Right side buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={handleResetFilters}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filters
          </button>
          
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            Export XLSX (CSV)
          </button>
        </div>
      </div>

      {/* KPI filter capsules */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'All', count: tabCounts.all, color: 'border-gray-200 text-gray-700 hover:bg-gray-50', activeColor: 'bg-gray-900 border-gray-900 text-white' },
          { key: 'In Process', count: tabCounts.inProcess, color: 'border-amber-200 text-amber-700 hover:bg-amber-50/50', activeColor: 'bg-amber-500 border-amber-500 text-white' },
          { key: 'Arrived', count: tabCounts.arrived, color: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50/50', activeColor: 'bg-emerald-600 border-emerald-600 text-white' },
          { key: 'Returned', count: tabCounts.returned, color: 'border-rose-200 text-rose-700 hover:bg-rose-50/50', activeColor: 'bg-rose-700 border-rose-700 text-white' },
          { key: 'Wakala Unpaid', count: tabCounts.wakalaUnpaid, color: 'border-orange-200 text-orange-700 hover:bg-orange-50/50', activeColor: 'bg-orange-500 border-orange-500 text-white' },
          { key: 'Company', count: tabCounts.company, color: 'border-blue-200 text-blue-700 hover:bg-blue-50/50', activeColor: 'bg-blue-600 border-blue-600 text-white' },
          { key: 'Private', count: tabCounts.private, color: 'border-indigo-200 text-indigo-700 hover:bg-indigo-50/50', activeColor: 'bg-indigo-600 border-indigo-600 text-white' },
          { key: 'Travel Next 7 Days', count: tabCounts.travelNext7, color: 'border-teal-200 text-teal-700 hover:bg-teal-50/50', activeColor: 'bg-teal-600 border-teal-600 text-white' },
          { key: 'Unfit', count: tabCounts.unfit, countColor: 'bg-red-100 text-red-700', color: 'border-red-200 text-red-700 hover:bg-red-50/50', activeColor: 'bg-red-600 border-red-600 text-white' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4.5 py-2 rounded-full border text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
                isActive ? tab.activeColor : tab.color
              }`}
            >
              <span>{tab.key}</span>
              <span className={`inline-flex items-center justify-center min-w-5 h-5 px-1 text-[10px] font-black rounded-full ${
                isActive ? 'bg-white/20 text-white' : (tab.countColor || 'bg-gray-100 text-gray-600')
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
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
                <th className="px-5 py-4 font-semibold text-center">Embassy Issue</th>
                <th className="px-5 py-4 font-semibold text-center">COC</th>
                <th className="px-5 py-4 font-semibold text-center">Medical</th>
                <th className="px-5 py-4 font-semibold text-center">Tasheer</th>
                <th className="px-5 py-4 font-semibold text-center">Wakala</th>
                <th className="px-5 py-4 font-semibold text-center">QR Code</th>
                <th className="px-5 py-4 font-semibold text-center">Selected</th>
                <th className="px-5 py-4 font-semibold">Travel Date</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold text-center">CV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 13 : 12} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={36} className="text-[#464479] animate-spin" />
                      <p className="text-sm font-semibold text-text-tertiary animate-pulse">Loading contracts database...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedCandidates.length > 0 ? (
                paginatedCandidates.map((c, index) => {
                  const rollNo = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                  const isUpdating = (fieldName: string) => 
                    updatingField?.candidateId === c.id && updatingField.fieldName === fieldName;

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

                      {/* Embassy Issue */}
                      <td className="px-5 py-4.5 text-center">
                        <button
                          disabled={updatingField !== null}
                          onClick={() => handleUpdateCandidate(c.id, { embassyIssue: c.embassyIssue === 'Yes' ? 'No' : 'Yes' })}
                          className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-black border transition-all cursor-pointer select-none disabled:opacity-50 ${
                            c.embassyIssue === 'Yes' 
                              ? 'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0] hover:bg-emerald-100/60' 
                              : 'bg-[#fef2f2] text-[#dc2626] border-[#fca5a5] hover:bg-red-100/60'
                          }`}
                        >
                          {isUpdating('embassyIssue') ? <Loader2 size={12} className="animate-spin" /> : c.embassyIssue}
                        </button>
                      </td>

                      {/* COC Status */}
                      <td className="px-5 py-4.5 text-center">
                        <button
                          disabled={updatingField !== null}
                          onClick={() => handleUpdateCandidate(c.id, { cocStatus: c.cocStatus === 'Completed' ? 'No' : 'Completed' })}
                          className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-black border transition-all cursor-pointer select-none disabled:opacity-50 ${
                            c.cocStatus === 'Completed' 
                              ? 'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0] hover:bg-emerald-100/60' 
                              : 'bg-[#fef2f2] text-[#dc2626] border-[#fca5a5] hover:bg-red-100/60'
                          }`}
                        >
                          {isUpdating('cocStatus') ? <Loader2 size={12} className="animate-spin" /> : c.cocStatus}
                        </button>
                      </td>

                      {/* Medical Status (Read-only Badge) */}
                      <td className="px-5 py-4.5 text-center">
                        <span
                          className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-black border select-none ${
                            c.medicalStatus === 'Fit' ? 'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]' :
                            c.medicalStatus === 'Unfit' ? 'bg-[#fef2f2] text-[#dc2626] border-[#fca5a5]' :
                            c.medicalStatus === 'New' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {c.medicalStatus || 'Pending'}
                        </span>
                      </td>

                      {/* Tasheer Status */}
                      <td className="px-5 py-4.5 text-center">
                        <button
                          disabled={updatingField !== null}
                          onClick={() => handleUpdateCandidate(c.id, { tasheerStatus: c.tasheerStatus === 'Yes' ? 'No' : 'Yes' })}
                          className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-black border transition-all cursor-pointer select-none disabled:opacity-50 ${
                            c.tasheerStatus === 'Yes' 
                              ? 'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0] hover:bg-emerald-100/60' 
                              : 'bg-[#fef2f2] text-[#dc2626] border-[#fca5a5] hover:bg-red-100/60'
                          }`}
                        >
                          {isUpdating('tasheerStatus') ? <Loader2 size={12} className="animate-spin" /> : c.tasheerStatus}
                        </button>
                      </td>

                      {/* Wakala Status */}
                      <td className="px-5 py-4.5 text-center">
                        <button
                          disabled={updatingField !== null}
                          onClick={() => handleUpdateCandidate(c.id, { wakalaStatus: c.wakalaStatus === 'Paid' ? 'Unpaid' : 'Paid' })}
                          className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-black border transition-all cursor-pointer select-none disabled:opacity-50 ${
                            c.wakalaStatus === 'Paid' 
                              ? 'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0] hover:bg-emerald-100/60' 
                              : 'bg-[#fff7ed] text-[#ea580c] border-[#ffedd5] hover:bg-orange-100/50'
                          }`}
                        >
                          {isUpdating('wakalaStatus') ? <Loader2 size={12} className="animate-spin" /> : c.wakalaStatus}
                        </button>
                      </td>

                      {/* QR Code Status (Read-only Badge) */}
                      <td className="px-5 py-4.5 text-center">
                        <span
                          className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-black border select-none ${
                            c.qrCodeStatus === 'Yes' 
                              ? 'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]' 
                              : 'bg-[#fef2f2] text-[#dc2626] border-[#fca5a5]'
                          }`}
                        >
                          {c.qrCodeStatus || 'No'}
                        </span>
                      </td>

                      {/* Selected Type */}
                      <td className="px-5 py-4.5 text-center">
                        <button
                          disabled={updatingField !== null}
                          onClick={() => handleUpdateCandidate(c.id, { selectedType: c.selectedType === 'Company' ? 'Private' : 'Company' })}
                          className={`inline-flex items-center justify-center px-3.5 py-1 rounded-full text-xs font-black border transition-all cursor-pointer select-none disabled:opacity-50 ${
                            c.selectedType === 'Company' 
                              ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/60' 
                              : 'bg-[#f8fafc] text-[#475569] border-[#e2e8f0] hover:bg-slate-100/60'
                          }`}
                        >
                          {isUpdating('selectedType') ? <Loader2 size={12} className="animate-spin" /> : c.selectedType}
                        </button>
                      </td>

                      {/* Travel Date (Read-only Text) */}
                      <td className="px-5 py-4.5">
                        <span className="font-bold text-gray-700 text-xs">
                          {c.travelDate ? c.travelDate.substring(0, 10) : '—'}
                        </span>
                      </td>

                      {/* Agency Status Dropdown */}
                      <td className="px-5 py-4.5">
                        <div className="relative inline-block" ref={openDropdownId === `status-${c.id}` ? dropdownRef : null}>
                          <button
                            disabled={updatingField !== null}
                            onClick={() => setOpenDropdownId(openDropdownId === `status-${c.id}` ? null : `status-${c.id}`)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border transition-all cursor-pointer select-none disabled:opacity-50 ${
                              c.agencyStatus === 'Arrived' && 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            } ${
                              c.agencyStatus === 'Returned' && 'bg-[#fdf4e7] text-[#854d0e] border-[#fef08a]'
                            } ${
                              (!c.agencyStatus || c.agencyStatus === 'Under Process') && 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {isUpdating('agencyStatus') ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <>
                                <span>{c.agencyStatus || 'Under Process'}</span>
                                <ChevronDown size={10} className="opacity-60" />
                              </>
                            )}
                          </button>

                          {openDropdownId === `status-${c.id}` && (
                            <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden font-bold">
                              {['Under Process', 'Arrived', 'Returned'].map((status) => (
                                <button
                                  key={status}
                                  onClick={() => handleUpdateCandidate(c.id, { agencyStatus: status })}
                                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                                >
                                  <span>{status}</span>
                                  {c.agencyStatus === status && <Check size={12} className="text-primary" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
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

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isSuperAdmin ? 13 : 12} className="px-6 py-20 text-center text-text-tertiary text-sm font-semibold">
                    No candidates found matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-4 border-t border-border/10 bg-gray-50/30">
            {/* Prev arrow */}
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-text-secondary hover:bg-[#00A4EF] hover:text-white hover:border-[#00A4EF] disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold"
            >
              ‹
            </button>

            {/* Page numbers */}
            {getVisiblePages(currentPage, totalPages).map((page, i) => (
              <button
                key={i}
                onClick={() => typeof page === 'number' && setCurrentPage(page)}
                disabled={page === '...'}
                className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all border ${
                  page === '...'
                    ? 'bg-transparent text-text-tertiary border-transparent cursor-default'
                    : page === currentPage
                    ? 'bg-[#00A4EF] text-white border-[#00A4EF] shadow-md'
                    : 'border-border text-text-secondary hover:bg-[#00A4EF]/10 hover:border-[#00A4EF]/30'
                }`}
              >
                {page}
              </button>
            ))}

            {/* Next arrow */}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-text-secondary hover:bg-[#00A4EF] hover:text-white hover:border-[#00A4EF] disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* Candidate Profile Details Overlay Modal */}
      {selectedCandidateId && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedCandidateId(null)}
        >
          <div 
            className="bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-text-primary text-lg">Candidate Profile Details</h3>
                  <p className="text-xs text-text-tertiary">Scoped view of documents and personal attributes</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCandidateId(null)}
                className="text-text-tertiary hover:text-text-primary p-2 rounded-lg hover:bg-gray-100 font-bold transition-all text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingDetails ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 size={32} className="text-primary animate-spin" />
                  <p className="text-sm font-bold text-text-tertiary">Retrieving candidate profile details...</p>
                </div>
              ) : candidateDetails ? (
                (() => {
                  const cd = candidateDetails;
                  const pd = cd.passportData;
                  const pi = cd.personalInfo;

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Left Block: Image & Basic Identifiers */}
                      <div className="lg:col-span-1 space-y-6 text-center lg:text-left">
                        <div className="bg-gray-50/50 border border-border/40 rounded-3xl p-5 flex flex-col items-center">
                          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md bg-white flex items-center justify-center shrink-0">
                            {cd.facePhotoUrl ? (
                              <img 
                                src={getFileUrl(cd.facePhotoUrl)} 
                                alt="Face" 
                                className="w-full h-full object-cover"
                                crossOrigin="anonymous"
                              />
                            ) : (
                              <span className="text-[#464479] font-black text-3xl">{pd.givenNames.charAt(0)}{pd.surname.charAt(0)}</span>
                            )}
                          </div>
                          <h4 className="text-lg font-black text-text-primary uppercase mt-4">{pd.givenNames} {pd.surname}</h4>
                          <p className="text-xs font-mono font-bold text-text-tertiary mt-1">{pd.passportNumber}</p>
                          <span className="mt-3 px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase rounded-full border border-indigo-200">
                            {pi.job || 'Unassigned Job'}
                          </span>
                        </div>

                        {/* Broker Details */}
                        <div className="bg-gray-50/50 border border-border/40 rounded-3xl p-5">
                          <h5 className="text-xs font-black uppercase tracking-wider text-text-tertiary mb-3">Broker Details</h5>
                          <div className="flex items-center gap-2 text-sm text-text-primary font-bold">
                            <Building className="w-4 h-4 text-indigo-500" />
                            <span>{cd.broker?.name || 'No broker assigned'}</span>
                          </div>
                        </div>

                        {/* CV Template Details */}
                        <div className="bg-gray-50/50 border border-border/40 rounded-3xl p-5">
                          <h5 className="text-xs font-black uppercase tracking-wider text-text-tertiary mb-3">CV Template ID</h5>
                          <div className="flex items-center gap-2 text-sm text-text-primary font-bold">
                            <FileText className="w-4 h-4 text-emerald-500" />
                            <span className="uppercase">{cd.latestCVTemplate || 'No CV Generated'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Block: Structured Tabs Details */}
                      <div className="lg:col-span-2 space-y-4">
                        
                        {/* Tab buttons */}
                        <div className="flex border-b border-border">
                          {[
                            { key: 'profile', label: 'Candidate Details' },
                            { key: 'passport', label: 'Passport Info' },
                            { key: 'documents', label: 'Verification Docs' },
                          ].map(t => (
                            <button
                              key={t.key}
                              onClick={() => setActiveDetailTab(t.key as any)}
                              className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px ${
                                activeDetailTab === t.key 
                                  ? 'border-[#464479] text-[#464479]' 
                                  : 'border-transparent text-text-tertiary hover:text-text-primary'
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>

                        {/* Tab Contents */}
                        <div className="py-2">
                          
                          {activeDetailTab === 'profile' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <DetailItem icon={Heart} label="Marital Status" value={pi.maritalStatus} />
                              <DetailItem icon={User} label="Children" value={pi.numberOfChildren} />
                              <DetailItem icon={Heart} label="Religion" value={pi.religion} />
                              <DetailItem icon={Mail} label="Email Address" value={pi.email} />
                              <DetailItem icon={Phone} label="Phone Line" value={pi.phone} />
                              <DetailItem icon={GraduationCap} label="Education Level" value={pi.educationLevel} />
                              <DetailItem icon={MapPin} label="Full Address" value={[pi.address, pi.city, pi.state, pi.country].filter(Boolean).join(', ')} />
                              
                              {/* Emergency contact info */}
                              <div className="col-span-2 mt-2 border-t border-border/50 pt-4">
                                <h6 className="text-xs font-black uppercase tracking-wider text-text-tertiary mb-3">Emergency Contact</h6>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <DetailItem icon={User} label="Name" value={pi.emergencyContactName} />
                                  <DetailItem icon={Heart} label="Relationship" value={pi.emergencyContactRelation} />
                                  <DetailItem icon={Phone} label="Phone Number" value={pi.emergencyContactPhone} />
                                  <DetailItem icon={MapPin} label="Address" value={pi.emergencyContactAddress} />
                                </div>
                              </div>
                            </div>
                          )}

                          {activeDetailTab === 'passport' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <DetailItem icon={FileText} label="Passport Number" value={pd.passportNumber} />
                              <DetailItem icon={Globe} label="Nationality" value={pd.nationality} />
                              <DetailItem icon={MapPin} label="Issuing Country" value={pd.issuingCountry} />
                              <DetailItem icon={MapPin} label="Place of Birth" value={pd.placeOfBirth} />
                              <DetailItem icon={Calendar} label="Date of Birth" value={pd.dateOfBirth} />
                              <DetailItem icon={User} label="Gender" value={pd.gender} />
                              <DetailItem icon={Calendar} label="Date of Issue" value={pd.dateOfIssue} />
                              <DetailItem icon={Calendar} label="Date of Expiry" value={pd.dateOfExpiry} />
                            </div>
                          )}

                          {activeDetailTab === 'documents' && (
                            <div className="space-y-3">
                              {[
                                { label: 'COC Document Scan', url: cd.cocDocumentUrl, color: 'indigo' },
                                { label: 'Medical Clearance Report', url: cd.medicalDocumentUrl, color: 'emerald' },
                                { label: 'Passport Document Scan', url: cd.passportImageUrl, color: 'blue' },
                                { label: 'Candidate National ID Scan', url: cd.candidateIdImageUrl, color: 'indigo' },
                                { label: 'Relative National ID Scan', url: cd.relativeIdImageUrl, color: 'amber' },
                                { label: 'Labour ID Scan', url: cd.labourIdUrl, color: 'violet' },
                                { label: 'Pre-registered video presentation', url: cd.quickVideoUrl || cd.videoUrl, color: 'pink', isVideo: true },
                              ].map((doc, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-transparent hover:border-gray-200/40 transition-colors">
                                  <span className="text-xs font-bold text-text-primary">{doc.label}</span>
                                  {doc.url ? (
                                    <div className="flex items-center gap-1.5">
                                      <button 
                                        onClick={() => setViewDocUrl(getFileUrl(doc.url!))}
                                        className="px-3 py-1.5 text-[10px] font-black uppercase bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-lg flex items-center gap-1 transition-all"
                                      >
                                        <Eye size={12} />
                                        View
                                      </button>
                                      <a 
                                        href={getDownloadUrl(doc.url!)}
                                        download
                                        className="px-3 py-1.5 text-[10px] font-black uppercase bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1 transition-all shadow-sm"
                                      >
                                        <Download size={12} />
                                        Save
                                      </a>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] font-bold text-text-tertiary italic">Not Uploaded</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                        </div>
                      </div>

                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-12 text-text-tertiary">Could not retrieve details.</div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-border bg-gray-50/50 flex justify-end">
              <button 
                onClick={() => setSelectedCandidateId(null)}
                className="px-6 py-2.5 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal Overlay */}
      {viewDocUrl && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setViewDocUrl(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4.5 border-b border-border bg-gray-50">
              <span className="text-xs font-extrabold text-text-primary flex items-center gap-2">
                <FileCheck className="text-emerald-500 w-4 h-4" />
                Document File Preview
              </span>
              <button 
                onClick={() => setViewDocUrl(null)}
                className="text-text-tertiary hover:text-text-primary p-1 rounded-lg hover:bg-gray-200 transition-all text-sm font-bold"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 p-6 flex items-center justify-center overflow-auto bg-slate-900/5 max-h-[70vh]">
              {viewDocUrl.startsWith('data:image') || viewDocUrl.includes('/uploads/') || (viewDocUrl.startsWith('http') && !viewDocUrl.toLowerCase().endsWith('.pdf')) ? (
                viewDocUrl.toLowerCase().includes('.mp4') || viewDocUrl.toLowerCase().includes('.webm') ? (
                  <video src={viewDocUrl} controls className="max-w-full max-h-[60vh] rounded-lg shadow-sm" crossOrigin="anonymous" />
                ) : (
                  <img src={viewDocUrl} alt="Document" className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm" crossOrigin="anonymous" />
                )
              ) : viewDocUrl.startsWith('data:application/pdf') || viewDocUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe src={viewDocUrl} className="w-full h-[60vh] rounded-lg border border-border bg-white" />
              ) : (
                <div className="text-center py-10 space-y-3">
                  <p className="text-text-secondary font-bold text-sm">Preview not supported natively inside browser browser.</p>
                  <a 
                    href={viewDocUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-1.5 text-indigo-600 hover:underline font-bold text-xs"
                  >
                    Open link in new tab
                  </a>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-border bg-gray-50 flex justify-end">
              <button 
                onClick={() => setViewDocUrl(null)}
                className="px-5 py-2 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors bg-white border border-gray-200 rounded-xl"
              >
                Close Preview
              </button>
            </div>
          </div>
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
                    {isDownloading ? <Loader2 size={12} className="animate-spin" /> : <FileCheck size={12} />}
                    PDF
                  </button>
                  <button
                    disabled={isDownloading}
                    onClick={() => handleDownloadCV('jpg')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isDownloading ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                    JPG
                  </button>
                  <button
                    disabled={isDownloading}
                    onClick={() => handleDownloadCV('doc')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isDownloading ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
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

    </div>
  );
}

// Simple Helper detail list item components
function DetailItem({ icon: Icon, label, value }: { icon: any; label: string; value: string | number | undefined }) {
  return (
    <div className="flex flex-col py-2.5 px-3.5 bg-white border border-gray-100 rounded-2xl">
      <div className="flex items-center gap-1.5 mb-0.5 text-text-tertiary">
        <Icon size={12} className="opacity-75" />
        <span className="text-[9px] uppercase tracking-wider font-extrabold">{label}</span>
      </div>
      <span className="text-sm font-bold text-text-primary truncate">{value || '—'}</span>
    </div>
  );
}
