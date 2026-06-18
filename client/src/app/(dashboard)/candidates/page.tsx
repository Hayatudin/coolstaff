'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Users, UserPlus, FileText, CheckCircle, Clock, Search, MoreVertical, Edit3, Trash2, ShieldAlert, Eye, Loader2, Link as LinkIcon, Flag, Filter, Lock, ArrowRight } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Candidate } from '@/types';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { authClient } from '@/lib/auth-client';

import { useCandidates } from '@/hooks/useCandidates';

const TEMPLATES = [
  { id: 'ussus', name: 'USSUS' },
  { id: 'al-shablan', name: 'AL-Shablan' },
  { id: 'alm', name: 'ALAALAM' },
  { id: 'ka7', name: 'KAAFAAT' },
  { id: 'ku2', name: 'KHUZAM' },
  { id: 'ma', name: 'MA Standard' },
  { id: 'ra', name: 'RAYAAT' },
  { id: 'vision', name: 'Vision Layout' },
];

export default function CandidatesPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const isSuperAdmin = (session?.user as any)?.role === 'super_admin';
  const { candidates, isLoading, error, mutate: setCandidates } = useCandidates();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('new_to_old');
  const [customDate, setCustomDate] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [religionFilter, setReligionFilter] = useState('');
  const [missingFileFilter, setMissingFileFilter] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const menuBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [viewDoc, setViewDoc] = useState<string | null>(null);
  const [visaModalId, setVisaModalId] = useState<string | null>(null);
  const [visaNumberInput, setVisaNumberInput] = useState('');
  const [cancelVisaModalId, setCancelVisaModalId] = useState<string | null>(null);
  const [cancelVisaNumberInput, setCancelVisaNumberInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Close menu on outside click, scroll, or resize
  useEffect(() => {
    if (!openMenuId) return;
    function close(e: Event) {
      const target = e.target as HTMLElement;
      if (e.type === 'mousedown' && target.closest('[data-action-menu]')) return;
      setOpenMenuId(null);
      setMenuCoords(null);
    }
    window.addEventListener('mousedown', close, true);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close, true);
    return () => {
      window.removeEventListener('mousedown', close, true);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close, true);
    };
  }, [openMenuId]);

  // Toggle Visa Selected
  const toggleRequested = async (id: string, current: boolean, visaNum?: string) => {
    setOpenMenuId(null);
    setVisaModalId(null);
    setVisaNumberInput('');
    setCancelVisaModalId(null);
    setCancelVisaNumberInput('');

    const cand = candidates.find(c => c.id === id);
    if (!current && cand && (!cand.generatedCVs || cand.generatedCVs.length === 0)) {
      alert("Generate CV first. The candidate must have a Generated CV to be marked as Visa Selected.");
      return;
    }

    try {
      const bodyPayload: any = { 
        isRequested: !current,
        visaSelected: !current,
        status: !current ? 'visa selected' : 'pending'
      };
      if (!current && visaNum) {
        bodyPayload.visaOrContractNumber = visaNum;
      } else if (current) {
        bodyPayload.visaOrContractNumber = null; // Clear if cancelled
      }

      console.log('Sending toggleRequested payload:', bodyPayload);
      const res = await api(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      console.log('toggleRequested response status:', res.status);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update status');
      }
      setCandidates(prev => prev.map(c => c.id === id ? { 
        ...c, 
        isRequested: !current, 
        visaSelected: !current,
        status: !current ? 'visa selected' : 'pending',
        visaOrContractNumber: bodyPayload.visaOrContractNumber 
      } : c));
    } catch (err: any) { 
      console.error(err);
      alert(err.message || 'Failed to update status'); 
    }
  };

  // Update Medical Status
  const updateMedicalStatus = async (id: string, newStatus: string) => {
    try {
      const res = await api(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicalStatus: newStatus }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update medical status');
      }
      setCandidates(prev => prev.map(c => c.id === id ? {
        ...c,
        personalInfo: { ...c.personalInfo, medicalStatus: newStatus as any }
      } : c));
    } catch (err: any) { 
      console.error(err);
      alert(err.message || 'Failed to update medical status'); 
    }
  };

  // Toggle Flag Status
  const toggleFlag = async (id: string, current: boolean) => {
    setOpenMenuId(null);
    try {
      const res = await api(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFlagged: !current }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update flag status');
      }
      setCandidates(prev => prev.map(c => c.id === id ? { ...c, isFlagged: !current } : c));
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to update flag status');
    }
  };

  // Delete candidate
  const deleteCandidate = async (id: string) => {
    setOpenMenuId(null);
    if (!confirm('Are you sure you want to delete this candidate? This action cannot be undone.')) return;
    try {
      const res = await api(`/api/candidates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setCandidates(prev => prev.filter(c => c.id !== id));
    } catch { alert('Failed to delete candidate'); }
  };

  const uniqueJobs = useMemo(() => {
    const jobs = new Set(candidates.map(c => c.personalInfo.job).filter(Boolean));
    return Array.from(jobs).map(j => ({ value: j as string, label: j as string }));
  }, [candidates]);

  // Filter and sort
  const filtered = useMemo(() => {
    let result = candidates.filter((c) => {
      const name = `${c.passportData.givenNames} ${c.passportData.surname}`.toLowerCase();
      const passport = c.passportData.passportNumber.toLowerCase();
      const shelfId = (c.shelfId || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch = name.includes(query) || passport.includes(query) || shelfId.includes(query);
      const matchesStatus = statusFilter ? c.status === statusFilter : true;
      let matchesDate = true;
      if (customDate) matchesDate = c.registeredAt.split('T')[0] === customDate;

      const matchesJob = jobFilter ? c.personalInfo.job === jobFilter : true;
      const matchesGender = genderFilter ? c.passportData.gender?.toLowerCase() === genderFilter.toLowerCase() : true;
      const matchesReligion = religionFilter ? c.personalInfo.religion?.toLowerCase() === religionFilter.toLowerCase() : true;
      const matchesAgency = agencyFilter === 'all' ? true : (c.agency?.toLowerCase() === agencyFilter.toLowerCase());

      let matchesMissingFile = true;
      if (missingFileFilter === 'COC') matchesMissingFile = !c.cocDocumentUrl;
      else if (missingFileFilter === 'Medical') matchesMissingFile = !c.medicalDocumentUrl;
      else if (missingFileFilter === 'Passport') matchesMissingFile = !c.passportImageUrl;
      else if (missingFileFilter === 'FacePhoto') matchesMissingFile = !c.facePhotoUrl;
      else if (missingFileFilter === 'FullBody') matchesMissingFile = !c.fullBodyPhotoUrl;

      return matchesSearch && matchesStatus && matchesDate && matchesJob && matchesGender && matchesReligion && matchesMissingFile && matchesAgency;
    });
    result.sort((a, b) => {
      const dA = new Date(a.registeredAt).getTime(), dB = new Date(b.registeredAt).getTime();
      return sortOrder === 'new_to_old' ? dB - dA : dA - dB;
    });
    return result;
  }, [candidates, searchQuery, statusFilter, sortOrder, customDate, jobFilter, genderFilter, religionFilter, missingFileFilter, agencyFilter]);

  // Reset to page 1 whenever filters change
  React.useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, sortOrder, customDate, jobFilter, genderFilter, religionFilter, missingFileFilter, agencyFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedCandidates = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-50"><Users size={22} className="text-primary" /></div>
            Candidates Directory
          </h1>
          <p className="text-text-secondary mt-1 ml-12">Manage and track all registered candidates</p>
        </div>
        
        {/* Dynamic Counter */}
        {!isLoading && !error && (
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-xl border border-primary/10 self-start md:self-auto">
            <span className="text-2xl font-black text-primary leading-none">{filtered.length}</span>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary/60 leading-none mb-0.5">Showing</span>
              <span className="text-xs font-semibold text-primary leading-none">Candidates</span>
            </div>
            {filtered.length !== candidates.length && (
              <div className="ml-3 pl-3 border-l border-primary/20">
                <span className="text-[10px] font-bold text-primary/60 uppercase tracking-wider">Total</span>
                <p className="text-sm font-black text-primary/80 leading-none">{candidates.length}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Agency filter capsules */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'all', label: 'All Agencies', color: 'border-gray-200 text-gray-700 hover:bg-gray-50', activeColor: 'bg-gray-900 border-gray-900 text-white' },
          { key: 'daera', label: 'Daera', color: 'border-blue-200 text-blue-700 hover:bg-blue-50/55', activeColor: 'bg-blue-600 border-blue-600 text-white' },
          { key: 'coolstaff', label: 'Coolstaff', color: 'border-teal-200 text-teal-700 hover:bg-teal-50/55', activeColor: 'bg-teal-600 border-teal-600 text-white' },
          { key: 'boss', label: 'Boss', color: 'border-purple-200 text-purple-700 hover:bg-purple-50/55', activeColor: 'bg-purple-600 border-purple-600 text-white' },
        ].map((btn) => {
          const isActive = agencyFilter === btn.key;
          const count = candidates.filter(c => btn.key === 'all' ? true : c.agency?.toLowerCase() === btn.key).length;
          return (
            <button
              key={btn.key}
              onClick={() => setAgencyFilter(btn.key)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
                isActive ? btn.activeColor : btn.color
              }`}
            >
              <span>{btn.label}</span>
              <span className={`inline-flex items-center justify-center min-w-5 h-5 px-1 text-[10px] font-black rounded-full ${
                isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-[1.5rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 space-y-4">
        {/* Top Row: Search and Basic Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-96">
            <Input placeholder="Search by Name, Passport, or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="flex w-full md:w-auto items-center gap-3">
            <div className="w-full md:w-40"><Input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} /></div>
            <div className="w-full md:w-40">
              <Select value={statusFilter} onChange={(v) => setStatusFilter(v)} options={[
                { value: '', label: 'All Statuses' }, 
                { value: 'approved', label: 'Approved' }, 
                { value: 'pending', label: 'Pending' }, 
                { value: 'rejected', label: 'Rejected' },
                { value: 'visa selected', label: 'Visa Selected' }
              ]} />
            </div>
            <div className="w-full md:w-40">
              <Select value={sortOrder} onChange={(v) => setSortOrder(v)} options={[{ value: 'new_to_old', label: 'Newest First' }, { value: 'old_to_new', label: 'Oldest First' }]} />
            </div>
          </div>
        </div>

        {/* Bottom Row: Advanced Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-start border-t border-border pt-4">
          <div className="w-full md:w-48">
            <Select placeholder="All Jobs" value={jobFilter} onChange={setJobFilter} options={[{ value: '', label: 'All Jobs' }, ...uniqueJobs]} searchable={true} />
          </div>
          <div className="w-full md:w-40">
            <Select placeholder="All Genders" value={genderFilter} onChange={setGenderFilter} options={[{ value: '', label: 'All Genders' }, { value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }]} />
          </div>
          <div className="w-full md:w-40">
            <Select placeholder="All Religions" value={religionFilter} onChange={setReligionFilter} options={[{ value: '', label: 'All Religions' }, { value: 'muslim', label: 'Muslim' }, { value: 'christian', label: 'Christian' }, { value: 'other', label: 'Other' }]} />
          </div>
          <div className="w-full md:w-48">
            <Select 
              placeholder="Missing Documents" 
              value={missingFileFilter} 
              onChange={setMissingFileFilter} 
              options={[
                { value: '', label: 'All Documents' },
                { value: 'COC', label: 'Missing COC' },
                { value: 'Medical', label: 'Missing Medical' },
                { value: 'Passport', label: 'Missing Passport' },
                { value: 'FacePhoto', label: 'Missing Face Photo' },
                { value: 'FullBody', label: 'Missing Full Body' }
              ]} 
            />
          </div>
          {(jobFilter || genderFilter || religionFilter || statusFilter || customDate || searchQuery || missingFileFilter || agencyFilter !== 'all') && (
            <button onClick={() => { setJobFilter(''); setGenderFilter(''); setReligionFilter(''); setStatusFilter(''); setCustomDate(''); setSearchQuery(''); setMissingFileFilter(''); setAgencyFilter('all'); }} className="text-sm text-text-tertiary hover:text-danger font-medium px-3 transition-colors">
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-[2rem] border border-border/30 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-border/30 text-[10px] uppercase tracking-wider font-bold text-text-tertiary/90">
                <th className="px-6 py-4 font-semibold">Shelf ID</th>
                <th className="px-6 py-4 font-semibold">Candidate</th>
                <th className="px-6 py-4 font-semibold">Passport No.</th>
                <th className="px-6 py-4 font-semibold">CV Agency</th>
                <th className="px-6 py-4 font-semibold">Broker</th>
                <th className="px-6 py-4 font-semibold">Visa Status</th>
                <th className="px-6 py-4 font-semibold hidden xl:table-cell">{isSuperAdmin ? 'Registrar' : 'COC'}</th>
                <th className="px-6 py-4 font-semibold">Medical</th>
                <th className="px-6 py-4 font-semibold">Open</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {isLoading ? (
                <TableSkeleton rows={8} cols={10} />
              ) : error ? (
                <tr><td colSpan={10} className="px-3 xl:px-6 py-10 text-center text-danger">Error: {error}</td></tr>
              ) : filtered.length > 0 ? (
                paginatedCandidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-gray-50/30 transition-colors">
                    {/* Shelf ID */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-mono font-bold inline-block border border-gray-200 shadow-sm">
                        {candidate.shelfId || 'UNASSIGNED'}
                      </div>
                    </td>

                    {/* Candidate */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0 border border-primary-100">
                          <span className="text-primary font-bold text-sm">{candidate.passportData.givenNames.charAt(0)}{candidate.passportData.surname.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-text-primary text-sm flex items-center gap-1.5">
                            {candidate.passportData.givenNames} {candidate.passportData.surname}
                            {candidate.isFlagged && <Flag size={13} className="text-red-500 fill-red-500" />}
                            {candidate.broker?.isLocked && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-50 border border-red-200 rounded-md text-red-500" title={`Broker "${candidate.broker.name}" is locked`}>
                                <Lock size={11} />
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-text-tertiary">{candidate.personalInfo.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Passport */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-text-primary">{candidate.passportData.passportNumber}</p>
                      <p className="text-xs text-text-tertiary">Exp: {new Date(candidate.passportData.dateOfExpiry).toLocaleDateString()}</p>
                    </td>

                    {/* CV Agency */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 text-[10px] uppercase font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg shadow-sm">
                        {(() => {
                          const templateId = candidate.latestCVTemplate?.replace('tmpl-', '').toLowerCase() || 'alm';
                          const templateObj = TEMPLATES.find(t => t.id === templateId);
                          return templateObj ? templateObj.name : 'ALAALAM';
                        })()}
                      </span>
                    </td>

                    {/* Broker */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-secondary">
                      {candidate.broker?.name || '—'}
                    </td>

                    {/* Visa Selected */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {candidate.isRequested ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Visa Selected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-50 text-slate-700 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Pending Visa
                        </span>
                      )}
                      {candidate.isRequested && candidate.visaOrContractNumber && (
                        <p className="text-[10px] text-text-tertiary mt-1 max-w-[100px] truncate" title={candidate.visaOrContractNumber}>No: {candidate.visaOrContractNumber}</p>
                      )}
                    </td>

                    {/* COC / Registrar */}
                    <td className="px-6 py-4 whitespace-nowrap hidden xl:table-cell">
                      {isSuperAdmin ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                            {candidate.registeredBy ? candidate.registeredBy.charAt(0).toUpperCase() : 'A'}
                          </div>
                          <span className="text-sm font-medium text-text-primary">{candidate.registeredBy || 'Admin'}</span>
                        </div>
                      ) : (
                        candidate.cocDocumentUrl ? (
                          <button onClick={() => setViewDoc(candidate.cocDocumentUrl!)} className="text-sm text-primary hover:underline font-medium flex items-center gap-1"><Eye size={13} /> View</button>
                        ) : (
                          <span className="text-xs text-text-tertiary">—</span>
                        )
                      )}
                    </td>

                    {/* Medical */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <select
                          value={candidate.personalInfo.medicalStatus || 'Pending'}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateMedicalStatus(candidate.id, e.target.value)}
                          className={cn(
                            "text-xs font-semibold px-3 py-1.5 rounded-full border appearance-none outline-none cursor-pointer shadow-sm transition-all text-center min-w-[80px]",
                            "bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2210%22%20height%3D%2210%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23999%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:10px] bg-[right_8px_center] bg-no-repeat pr-7 bg-white",
                            candidate.personalInfo.medicalStatus === 'Fit' ? "text-[#34C759] border-[#34C759]/30 bg-emerald-50/30" :
                            candidate.personalInfo.medicalStatus === 'Unfit' ? "text-[#FF3B30] border-[#FF3B30]/30 bg-red-50/30" :
                            candidate.personalInfo.medicalStatus === 'New' ? "text-blue-600 border-blue-200 bg-blue-50/30" :
                            "text-[#8E8E93] border-gray-200"
                          )}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Fit">Fit</option>
                          <option value="Unfit">Unfit</option>
                          <option value="New">New</option>
                        </select>
                        {candidate.medicalDocumentUrl && (
                          <button onClick={(e) => { e.stopPropagation(); setViewDoc(candidate.medicalDocumentUrl!); }} className="text-primary hover:bg-primary-50 p-1.5 rounded-lg transition-colors" title="View Medical Doc">
                            <Eye size={15} />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Open Details Button */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/candidates/${candidate.id}`)}
                        className="px-3 py-1.5 text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white border border-primary/20 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-sm hover:shadow-primary/20"
                      >
                        Open
                        <ArrowRight size={10} />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative inline-block" data-action-menu>
                        <button
                          ref={(el) => { menuBtnRefs.current[candidate.id] = el; }}
                          onClick={() => {
                            if (openMenuId === candidate.id) {
                              setOpenMenuId(null);
                              setMenuCoords(null);
                            } else {
                              const btn = menuBtnRefs.current[candidate.id];
                              if (btn) {
                                const rect = btn.getBoundingClientRect();
                                setMenuCoords({ top: rect.bottom + 4, left: rect.right - 192 });
                              }
                              setOpenMenuId(candidate.id);
                            }
                          }}
                          className="text-text-tertiary hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-gray-100"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openMenuId === candidate.id && menuCoords && createPortal(
                          <div
                            className="w-48 bg-white border border-border rounded-xl shadow-xl py-1 animate-fade-in"
                            style={{ position: 'fixed', top: menuCoords.top, left: menuCoords.left, zIndex: 9999 }}
                            data-action-menu
                          >
                            {candidate.isRequested ? (
                              <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setMenuCoords(null); setCancelVisaModalId(candidate.id); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left">
                                <CheckCircle size={16} className="text-amber-500" />
                                <span>Cancel Visa Selected</span>
                              </button>
                            ) : (
                              <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setMenuCoords(null); setVisaModalId(candidate.id); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left">
                                <CheckCircle size={16} className="text-text-tertiary" />
                                <span>Visa Selected</span>
                              </button>
                            )}
                            <button onClick={() => { setOpenMenuId(null); setMenuCoords(null); router.push(`/registration?edit=${candidate.id}`); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left">
                              <Edit3 size={16} className="text-text-tertiary" />
                              <span>Edit</span>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); toggleFlag(candidate.id, candidate.isFlagged || false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors text-left">
                              <Flag size={16} className={candidate.isFlagged ? "text-red-500 fill-red-500" : "text-text-tertiary"} />
                              <span className={candidate.isFlagged ? "text-red-600 font-medium" : "text-text-primary"}>
                                {candidate.isFlagged ? 'Unflag Candidate' : 'Flag Candidate'}
                              </span>
                            </button>
                            <div className="border-t border-border my-1" />
                            <button onClick={() => { setOpenMenuId(null); setMenuCoords(null); deleteCandidate(candidate.id); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors text-left text-red-600">
                              <Trash2 size={16} />
                              <span>Delete</span>
                            </button>
                          </div>,
                          document.body
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={10} className="px-3 xl:px-6 py-10 text-center text-text-tertiary">No candidates found matching your search or filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!isLoading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          {/* Prev arrow */}
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-text-secondary hover:bg-primary hover:text-white hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold"
          >
            ‹
          </button>

          {/* Page numbers */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
            // Show first, last, current, current±1
            if (page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1) {
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all border ${
                    page === currentPage
                      ? 'bg-primary text-white border-primary shadow-md'
                      : 'border-border text-text-secondary hover:bg-primary/10 hover:border-primary/30'
                  }`}
                >
                  {page}
                </button>
              );
            }
            // Show ellipsis
            if (page === currentPage - 2 || page === currentPage + 2) {
              return <span key={page} className="text-text-tertiary px-1 font-bold">…</span>;
            }
            return null;
          })}

          {/* Next arrow */}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-text-secondary hover:bg-primary hover:text-white hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold"
          >
            ›
          </button>
        </div>
      )}

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

      {/* Visa Selected Modal */}
      {visaModalId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setVisaModalId(null)}>
          <div className="bg-white rounded-[1.5rem] shadow-2xl max-w-md w-full overflow-hidden scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border bg-gray-50">
              <h3 className="font-bold text-text-primary text-lg flex items-center gap-2">
                <CheckCircle className="text-green-600" size={20} /> Insert Visa / Contract Details
              </h3>
              <button onClick={() => setVisaModalId(null)} className="text-text-tertiary hover:text-text-primary p-1 rounded-lg hover:bg-gray-200 transition-colors">✕</button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-semibold text-text-primary mb-2">Insert contract number or visa number</label>
              <Input 
                autoFocus
                placeholder="e.g. VIS-123456 or CON-7890" 
                value={visaNumberInput} 
                onChange={(e) => setVisaNumberInput(e.target.value)} 
                className="w-full"
              />
            </div>
            <div className="p-5 border-t border-border flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setVisaModalId(null)} className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors">
                Cancel
              </button>
              <button 
                disabled={!visaNumberInput.trim()}
                onClick={() => toggleRequested(visaModalId, false, visaNumberInput.trim())}
                className="px-6 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md hover:shadow-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Visa Modal */}
      {cancelVisaModalId && (() => {
        const candidate = candidates.find(c => c.id === cancelVisaModalId);
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setCancelVisaModalId(null)}>
            <div className="bg-white rounded-[1.5rem] shadow-2xl max-w-md w-full overflow-hidden scale-in" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-border bg-gray-50">
                <h3 className="font-bold text-text-primary text-lg flex items-center gap-2">
                  <Flag className="text-red-500" size={20} /> Cancel Visa Selection
                </h3>
                <button onClick={() => setCancelVisaModalId(null)} className="text-text-tertiary hover:text-text-primary p-1 rounded-lg hover:bg-gray-200 transition-colors">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-text-secondary">
                  Are you sure you want to cancel the visa selection for <strong className="text-text-primary">{candidate ? `${candidate.passportData.givenNames} ${candidate.passportData.surname}` : 'this candidate'}</strong>?
                </p>
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">
                    Please provide a reason for cancellation:
                  </label>
                  <Input 
                    autoFocus
                    placeholder="Enter reason for cancellation" 
                    value={cancelVisaNumberInput} 
                    onChange={(e) => setCancelVisaNumberInput(e.target.value)} 
                    className="w-full"
                  />
                </div>
              </div>
              <div className="p-5 border-t border-border flex justify-end gap-3 bg-gray-50">
                <button onClick={() => setCancelVisaModalId(null)} className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors">
                  Cancel
                </button>
                <button 
                  disabled={!cancelVisaNumberInput.trim()}
                  onClick={() => toggleRequested(cancelVisaModalId, true)}
                  className="px-6 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md hover:shadow-lg"
                >
                  Confirm Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
