'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';
import { Users, UserPlus, ExternalLink, Loader2, MoreVertical, CheckCircle, Trash2, Edit3, Eye, ClipboardList, Flag } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import { Candidate } from '@/types';
import { useSession } from '@/lib/auth-client';
import { ROUTE_ACCESS, type Role } from '@/lib/role-config';

import { useCandidates } from '@/hooks/useCandidates';

const MUSANED_URL = 'https://accounts.wahid.sa/auth/realms/wahid/protocol/openid-connect/auth?client_id=etawtheeq-fe&redirect_uri=https%3A%2F%2Ftawtheeq.musaned.com.sa%2Flogin&state=1afbc6a5-ab04-454a-864e-2139d00d05a5&response_mode=fragment&response_type=code&scope=openid&nonce=c08d47d0-27af-41b3-8812-5ea7548fd14e&code_challenge=mlx9pnpSqR2PmNC1onUouVnZeV3FM3T2f8ELMWSHvds&code_challenge_method=S256';

export default function DashboardPage() {
  const router = useRouter();
  const { candidates: allCandidates, isLoading, mutate: setAllCandidates } = useCandidates();
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [viewDoc, setViewDoc] = React.useState<string | null>(null);
  const [visaModalId, setVisaModalId] = React.useState<string | null>(null);
  const [visaNumberInput, setVisaNumberInput] = React.useState('');
  const [cancelVisaModalId, setCancelVisaModalId] = React.useState<string | null>(null);
  const [cancelVisaNumberInput, setCancelVisaNumberInput] = React.useState('');
  const { data: session } = useSession();
  const userRole = ((session?.user as any)?.role ?? 'user') as string;

  const [quickRegistrations, setQuickRegistrations] = React.useState<any[]>([]);
  const [quickLoading, setQuickLoading] = React.useState(false);

  React.useEffect(() => {
    if (userRole === 'registrar' || userRole === 'super_admin' || userRole === 'processor' || userRole === 'coordinator' || userRole === 'accountant') {
      setQuickLoading(true);
      api('/api/quick-registrations')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setQuickRegistrations(data);
        })
        .catch(err => console.error('Failed to fetch quick registrations on dashboard', err))
        .finally(() => setQuickLoading(false));
    }
  }, [userRole]);

  // Role-based access helpers
  const canSee = (route: string) => {
    const roles = ROUTE_ACCESS[route];
    return roles ? roles.includes(userRole as Role) : false;
  };

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-action-menu]')) setOpenMenuId(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleRequested = async (id: string, current: boolean, visaNum?: string) => {
    const cand = allCandidates.find(c => c.id === id);
    setOpenMenuId(null);
    setVisaModalId(null);
    setVisaNumberInput('');
    setCancelVisaModalId(null);
    setCancelVisaNumberInput('');

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
        bodyPayload.visaOrContractNumber = null;
      }

      const res = await api(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      if (!res.ok) throw new Error();
      setAllCandidates(prev => prev.map(c => c.id === id ? { 
        ...c, 
        isRequested: !current, 
        visaSelected: !current,
        status: !current ? 'visa selected' : 'pending',
        visaOrContractNumber: bodyPayload.visaOrContractNumber 
      } : c));
    } catch { alert('Failed to update status'); }
  };

  const deleteCandidate = async (id: string) => {
    setOpenMenuId(null);
    if (!confirm('Are you sure you want to delete this candidate? This action cannot be undone.')) return;
    try {
      const res = await api(`/api/candidates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setAllCandidates(prev => prev.filter(c => c.id !== id));
    } catch { alert('Failed to delete candidate'); }
  };

  const requestedCount = allCandidates.filter(c => c.isRequested).length;
  const recentCandidates = allCandidates.slice(0, 10);
  const recentRequested = allCandidates.filter(c => c.isRequested).slice(0, 10);

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary text-sm sm:text-base mt-1">Overview of candidate registrations and quick actions</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {canSee('/registration') && (
            <Link href="/registration" className="hidden sm:block">
              <Button variant="primary" icon={<UserPlus size={16} />}>ADD CANDIDATE</Button>
            </Link>
          )}
          {canSee('/quick-registration') && (
            <Link href="/quick-registration" className="sm:hidden w-full">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/30 transition-all active:scale-[0.98]">
                <ClipboardList size={18} /> QUICK REGISTER
              </button>
            </Link>
          )}
          <a href={MUSANED_URL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-[#2a9d8f] to-[#238b80] hover:from-[#238b80] hover:to-[#1d7a71] text-white rounded-xl font-semibold text-xs sm:text-sm shadow-lg shadow-[#2a9d8f]/25 transition-all duration-200 hover:shadow-xl hover:shadow-[#2a9d8f]/30 hover:-translate-y-0.5 flex-1 sm:flex-none">
            <ExternalLink size={16} /> <span className="hidden sm:inline">Go to</span> Musaned
          </a>
        </div>
      </div>

      {/* Stats Cards - filtered by role */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {userRole === 'registrar' && (
          <>
            <div className="bg-surface rounded-[2rem] border border-border/30 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all p-6 flex items-center gap-5">
              <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-500"><ClipboardList size={24} /></div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{quickRegistrations.length}</p>
                <p className="text-sm text-text-tertiary">Quick Registered Candidates</p>
              </div>
            </div>
            <div className="bg-surface rounded-[2rem] border border-border/30 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all p-6 flex items-center gap-5">
              <div className="p-4 rounded-2xl bg-green-500/10 text-green-500"><CheckCircle size={24} /></div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{quickRegistrations.filter(r => r.verificationStatus === 'promoted').length}</p>
                <p className="text-sm text-text-tertiary">Promoted to Musaned</p>
              </div>
            </div>
            <div className="bg-surface rounded-[2rem] border border-border/30 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all p-6 flex items-center gap-5">
              <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-500"><Users size={24} /></div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{quickRegistrations.filter(r => r.verificationStatus !== 'promoted').length}</p>
                <p className="text-sm text-text-tertiary">Pending Verification</p>
              </div>
            </div>
          </>
        )}
        {canSee('/candidates') && (
          <div className="bg-surface rounded-[2rem] border border-border/30 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all p-6 flex items-center gap-5">
            <div className="p-4 rounded-2xl bg-primary-50"><Users size={24} className="text-primary" /></div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{allCandidates.length}</p>
              <p className="text-sm text-text-tertiary">Total Candidates</p>
            </div>
          </div>
        )}
        {canSee('/requested') && (
          <div className="bg-surface rounded-[2rem] border border-border/30 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all p-6 flex items-center gap-5">
            <div className="p-4 rounded-2xl bg-success/10"><ClipboardList size={24} className="text-success" /></div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{requestedCount}</p>
              <p className="text-sm text-text-tertiary">Visa Selected</p>
            </div>
          </div>
        )}
        {canSee('/candidates') && (
          <div className="bg-surface rounded-[2rem] border border-border/30 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all p-6 flex items-center gap-5">
            <div className="p-4 rounded-2xl bg-warning/10 text-warning"><ClipboardList size={24} /></div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{quickRegistrations.length}</p>
              <p className="text-sm text-text-tertiary">Total Records</p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Candidates Table - visible for roles with /candidates access */}
      {canSee('/candidates') && (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2"><Users className="text-primary" size={20} /> Recent Candidates</h2>
          <Link href="/candidates" className="text-sm text-primary hover:underline font-medium">View All →</Link>
        </div>

        <div className="bg-surface rounded-[2rem] border border-border/30 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-border/30 text-[10px] uppercase tracking-wider font-bold text-text-tertiary/90">
                  <th className="px-6 py-4 font-semibold">Shelf ID</th>
                  <th className="px-6 py-4 font-semibold">Candidate</th>
                  <th className="px-6 py-4 font-semibold">Passport No.</th>
                  <th className="px-6 py-4 font-semibold">Job / Skills</th>
                  <th className="px-6 py-4 font-semibold">Visa Status</th>
                  <th className="px-6 py-4 font-semibold">CV Generated</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {isLoading ? (
                  <tr><td colSpan={7} className="px-6 py-10 text-center"><div className="flex flex-col items-center gap-3"><Loader2 size={32} className="text-primary animate-spin" /><p className="text-text-tertiary">Loading candidates...</p></div></td></tr>
                ) : recentCandidates.length > 0 ? (
                  recentCandidates.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-gray-50/30 transition-colors cursor-pointer" onClick={(e) => { if (!(e.target as HTMLElement).closest('[data-action-menu]') && !(e.target as HTMLElement).closest('button')) router.push(`/candidates/${candidate.id}`); }}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-mono font-bold inline-block border border-gray-200 shadow-sm">{candidate.shelfId || 'UNASSIGNED'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0 border border-primary-100">
                            <span className="text-primary font-bold text-sm">{candidate.passportData.givenNames.charAt(0)}{candidate.passportData.surname.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-text-primary flex items-center gap-2 text-sm">
                              {candidate.passportData.givenNames} {candidate.passportData.surname}
                              {candidate.isFlagged && <Flag size={14} className="text-red-500 fill-red-500" />}
                            </p>
                            <p className="text-xs text-text-tertiary">{candidate.personalInfo.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-text-primary">{candidate.passportData.passportNumber}</p>
                        <p className="text-xs text-text-tertiary">Exp: {new Date(candidate.passportData.dateOfExpiry).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-text-primary font-medium truncate max-w-[200px]">{candidate.personalInfo.workExperience ? 'Experienced' : 'Fresher'}</p>
                        <p className="text-xs text-text-tertiary truncate max-w-[200px]">{candidate.personalInfo.skills.slice(0, 3).join(', ')}{candidate.personalInfo.skills.length > 3 ? '...' : ''}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {candidate.isRequested ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Visa Selected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Pending Visa
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2 flex-wrap max-w-[200px]">
                          {candidate.generatedCVs && candidate.generatedCVs.length > 0 ? (
                            candidate.generatedCVs.map((tmpl, idx) => {
                              const templateId = typeof tmpl === 'string' ? tmpl : tmpl?.templateId;
                              if (!templateId) return null;
                              return (
                                <span key={idx} className="px-2 py-0.5 text-[10px] uppercase font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                                  {templateId.replace('tmpl-', '').toUpperCase()}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-xs text-text-tertiary">No CVs</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative inline-block" data-action-menu>
                          <button onClick={() => setOpenMenuId(openMenuId === candidate.id ? null : candidate.id)} className="text-text-tertiary hover:text-primary transition-colors p-2 rounded-lg hover:bg-gray-100">
                            <MoreVertical size={18} />
                          </button>
                          {openMenuId === candidate.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-border rounded-xl shadow-xl z-50 py-1 animate-fade-in">
                              {candidate.isRequested ? (
                                <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setCancelVisaModalId(candidate.id); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left font-semibold">
                                  <CheckCircle size={16} className="text-amber-500" />
                                  <span>Cancel Visa Selected</span>
                                </button>
                              ) : (
                                <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setVisaModalId(candidate.id); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left font-semibold">
                                  <CheckCircle size={16} className="text-text-tertiary" />
                                  <span>Visa Selected</span>
                                </button>
                              )}
                              <div className="border-t border-border/60 my-1" />
                              <button onClick={() => deleteCandidate(candidate.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors text-left text-red-600 font-semibold">
                                <Trash2 size={16} /><span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-text-tertiary">No candidates registered yet. Click &quot;Add Candidate&quot; to get started.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      )}

      {/* Recent Requested Table - visible for roles with /requested access */}
      {canSee('/requested') && (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2"><ClipboardList className="text-green-600" size={20} /> Recent Visa Selected</h2>
          <Link href="/requested" className="text-sm text-primary hover:underline font-medium">View All →</Link>
        </div>

        <div className="bg-surface rounded-[2rem] border border-border/30 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-border/30 text-[10px] uppercase tracking-wider font-bold text-text-tertiary/90">
                  <th className="px-6 py-4 font-semibold">Shelf ID</th>
                  <th className="px-6 py-4 font-semibold">Candidate</th>
                  <th className="px-6 py-4 font-semibold">Passport No.</th>
                  <th className="px-6 py-4 font-semibold">Job / Skills</th>
                  <th className="px-6 py-4 font-semibold">Requested</th>
                  <th className="px-6 py-4 font-semibold">CV Generated</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {isLoading ? (
                  <tr><td colSpan={7} className="px-6 py-10 text-center"><div className="flex flex-col items-center gap-3"><Loader2 size={32} className="text-primary animate-spin" /><p className="text-text-tertiary">Loading...</p></div></td></tr>
                ) : recentRequested.length > 0 ? (
                  recentRequested.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-gray-50/30 transition-colors cursor-pointer" onClick={(e) => { if (!(e.target as HTMLElement).closest('[data-action-menu]') && !(e.target as HTMLElement).closest('button')) router.push(`/candidates/${candidate.id}`); }}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-mono font-bold inline-block border border-gray-200 shadow-sm">{candidate.shelfId || 'UNASSIGNED'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0 border border-green-100">
                            <span className="text-green-600 font-bold text-sm">{candidate.passportData.givenNames.charAt(0)}{candidate.passportData.surname.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-text-primary flex items-center gap-2 text-sm">
                              {candidate.passportData.givenNames} {candidate.passportData.surname}
                              {candidate.isFlagged && <Flag size={14} className="text-red-500 fill-red-500" />}
                            </p>
                            <p className="text-xs text-text-tertiary">{candidate.personalInfo.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-text-primary">{candidate.passportData.passportNumber}</p>
                        <p className="text-xs text-text-tertiary">Exp: {new Date(candidate.passportData.dateOfExpiry).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-text-primary font-medium truncate max-w-[200px]">{candidate.personalInfo.workExperience ? 'Experienced' : 'Fresher'}</p>
                        <p className="text-xs text-text-tertiary truncate max-w-[200px]">{candidate.personalInfo.skills.slice(0, 3).join(', ')}{candidate.personalInfo.skills.length > 3 ? '...' : ''}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Visa Selected
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2 flex-wrap max-w-[200px]">
                          {candidate.generatedCVs && candidate.generatedCVs.length > 0 ? (
                            candidate.generatedCVs.map((tmpl, idx) => {
                              const templateId = typeof tmpl === 'string' ? tmpl : tmpl?.templateId;
                              if (!templateId) return null;
                              return (
                                <span key={idx} className="px-2 py-0.5 text-[10px] uppercase font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                                  {templateId.replace('tmpl-', '').toUpperCase()}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-xs text-text-tertiary">No CVs</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative inline-block" data-action-menu>
                          <button onClick={() => setOpenMenuId(openMenuId === candidate.id ? null : candidate.id)} className="text-text-tertiary hover:text-primary transition-colors p-2 rounded-lg hover:bg-gray-100">
                            <MoreVertical size={18} />
                          </button>
                          {openMenuId === candidate.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-border rounded-xl shadow-xl z-50 py-1 animate-fade-in">
                              <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setCancelVisaModalId(candidate.id); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left font-semibold">
                                <CheckCircle size={16} className="text-amber-500" />
                                <span>Cancel Visa Selected</span>
                              </button>
                              <div className="border-t border-border/60 my-1" />
                              <button onClick={() => deleteCandidate(candidate.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors text-left text-red-600 font-semibold">
                                <Trash2 size={16} /><span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-text-tertiary">No visa selected candidates yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      )}
      {/* Featured Quick Registered Table (Only for Registrar) */}
      {userRole === 'registrar' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <ClipboardList className="text-amber-500" size={20} /> Featured Quick Registered
            </h2>
            <Link href="/quick-registered" className="text-sm text-primary hover:underline font-medium">
              View All →
            </Link>
          </div>

          <div className="bg-surface rounded-[2rem] border border-border/30 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-border/30 text-[10px] uppercase tracking-wider font-bold text-text-tertiary/90">
                    <th className="px-6 py-4 font-semibold">Candidate</th>
                    <th className="px-6 py-4 font-semibold">Passport No.</th>
                    <th className="px-6 py-4 font-semibold">Nationality</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Date Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {quickLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 size={32} className="text-primary animate-spin" />
                          <p className="text-text-tertiary">Loading registrations...</p>
                        </div>
                      </td>
                    </tr>
                  ) : quickRegistrations.length > 0 ? (
                    quickRegistrations.slice(0, 5).map((r) => (
                      <tr 
                        key={r.id} 
                        className="hover:bg-gray-50/30 transition-colors cursor-pointer"
                        onClick={() => router.push(`/quick-registration/preview/${r.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100">
                              <span className="text-amber-600 font-bold text-sm">
                                {r.givenNames?.charAt(0)}{r.surname?.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-text-primary text-sm">
                                {r.givenNames} {r.surname}
                              </p>
                              <p className="text-xs text-text-tertiary">{r.religion || 'Non-Muslim'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs font-mono font-bold text-text-secondary bg-gray-100 px-2 py-1 rounded-lg border border-gray-200">
                            {r.passportNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary capitalize">
                          {r.nationality || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {r.verificationStatus === 'promoted' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                              Promoted
                            </span>
                          ) : r.verificationStatus === 'verified' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-text-tertiary">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <ClipboardList size={32} className="mx-auto text-text-tertiary/20 mb-3" />
                        <p className="font-bold text-text-primary text-sm">No quick registrations yet</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Registrar Notes & Notice Board */}
      {userRole === 'registrar' && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <ClipboardList className="text-primary" size={20} /> System Notes & Registrar Guides
            </h2>
            <div className="bg-surface rounded-[2rem] border border-border/30 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 space-y-4">
              <div className="flex gap-4 items-start p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 font-bold shrink-0">1</div>
                <div>
                  <h4 className="font-bold text-sm text-text-primary">Always Scan Passports First</h4>
                  <p className="text-xs text-text-tertiary mt-0.5 leading-relaxed">Use the Quick Registration passport scanner to automatically extract candidate names and passport details instantly, preventing manual transcription errors.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start p-4 rounded-2xl bg-primary-50 border border-primary-50">
                <div className="p-2 rounded-xl bg-primary-100/50 text-primary font-bold shrink-0">2</div>
                <div>
                  <h4 className="font-bold text-sm text-text-primary">Ensure Required File Uploads</h4>
                  <p className="text-xs text-text-tertiary mt-0.5 leading-relaxed">A complete registration requires all five essential files: COC, Labour ID, Candidate ID, Relative ID, and applicant introduction video.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 font-bold shrink-0">3</div>
                <div>
                  <h4 className="font-bold text-sm text-text-primary">Musaned Verification Notice</h4>
                  <p className="text-xs text-text-tertiary mt-0.5 leading-relaxed">Once registered, wait-in candidates are verified by the Processing team using Musaned integration. Registrars can view preview cards but are not authorized to verify or publish records.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <Flag className="text-warning" size={20} /> Quick Reminders
            </h2>
            <div className="bg-gradient-to-br from-primary to-accent rounded-[2rem] p-6 text-white space-y-4 shadow-xl shadow-primary/20">
              <div>
                <h3 className="font-bold text-lg">Registrar Hub</h3>
                <p className="text-xs text-white/80 mt-1 leading-relaxed">Welcome back! You are logged in with the Registrar administrative role. Your daily tasks include quick candidate registration, managing broker listings, and candidate previews.</p>
              </div>
              <div className="border-t border-white/20 pt-4">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Assigned Workstation</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded">Front Desk</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold mt-2">
                  <span>Active Session Time</span>
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
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
        const candidate = allCandidates.find(c => c.id === cancelVisaModalId);
        const expectedVisa = candidate?.visaOrContractNumber || '';
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
                    Enter the Visa/Contract Number ({expectedVisa}) to confirm:
                  </label>
                  <Input 
                    autoFocus
                    placeholder="Enter Visa / Contract Number" 
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
                  disabled={cancelVisaNumberInput.trim().toLowerCase() !== expectedVisa.toLowerCase()}
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
