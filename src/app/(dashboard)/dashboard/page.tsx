'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { Users, UserPlus, ExternalLink, Loader2, MoreVertical, CheckCircle, Trash2, Edit3, Eye, ClipboardList } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import { Candidate } from '@/types';

import { useCandidates } from '@/hooks/useCandidates';

const MUSANED_URL = 'https://accounts.wahid.sa/auth/realms/wahid/protocol/openid-connect/auth?client_id=etawtheeq-fe&redirect_uri=https%3A%2F%2Ftawtheeq.musaned.com.sa%2Flogin&state=1afbc6a5-ab04-454a-864e-2139d00d05a5&response_mode=fragment&response_type=code&scope=openid&nonce=c08d47d0-27af-41b3-8812-5ea7548fd14e&code_challenge=mlx9pnpSqR2PmNC1onUouVnZeV3FM3T2f8ELMWSHvds&code_challenge_method=S256';

export default function DashboardPage() {
  const router = useRouter();
  const { candidates: allCandidates, isLoading, mutate: setAllCandidates } = useCandidates();
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [viewDoc, setViewDoc] = React.useState<string | null>(null);
  const [visaModalId, setVisaModalId] = React.useState<string | null>(null);
  const [visaNumberInput, setVisaNumberInput] = React.useState('');

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-action-menu]')) setOpenMenuId(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleRequested = async (id: string, current: boolean, visaNum?: string) => {
    setOpenMenuId(null);
    setVisaModalId(null);
    setVisaNumberInput('');
    try {
      const bodyPayload: any = { isRequested: !current };
      if (!current && visaNum) {
        bodyPayload.visaOrContractNumber = visaNum;
      } else if (current) {
        bodyPayload.visaOrContractNumber = null;
      }

      const res = await fetch(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      if (!res.ok) throw new Error();
      setAllCandidates(prev => prev.map(c => c.id === id ? { ...c, isRequested: !current, visaOrContractNumber: bodyPayload.visaOrContractNumber } : c));
    } catch { alert('Failed to update status'); }
  };

  const deleteCandidate = async (id: string) => {
    setOpenMenuId(null);
    if (!confirm('Are you sure you want to delete this candidate? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/candidates/${id}`, { method: 'DELETE' });
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
          <Link href="/registration" className="hidden sm:block">
            <Button variant="primary" icon={<UserPlus size={16} />}>ADD CANDIDATE</Button>
          </Link>
          <Link href="/quick-registration" className="sm:hidden w-full">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/30 transition-all active:scale-[0.98]">
              <ClipboardList size={18} /> QUICK REGISTER
            </button>
          </Link>
          <a href={MUSANED_URL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-[#2a9d8f] to-[#238b80] hover:from-[#238b80] hover:to-[#1d7a71] text-white rounded-xl font-semibold text-xs sm:text-sm shadow-lg shadow-[#2a9d8f]/25 transition-all duration-200 hover:shadow-xl hover:shadow-[#2a9d8f]/30 hover:-translate-y-0.5 flex-1 sm:flex-none">
            <ExternalLink size={16} /> <span className="hidden sm:inline">Go to</span> Musaned
          </a>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface rounded-[1.5rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all p-6 flex items-center gap-5">
          <div className="p-4 rounded-2xl bg-primary-50"><Users size={24} className="text-primary" /></div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{allCandidates.length}</p>
            <p className="text-sm text-text-tertiary">Total Candidates</p>
          </div>
        </div>
        <div className="bg-surface rounded-[1.5rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all p-6 flex items-center gap-5">
          <div className="p-4 rounded-2xl bg-success/10"><ClipboardList size={24} className="text-success" /></div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{requestedCount}</p>
            <p className="text-sm text-text-tertiary">Visa Selected</p>
          </div>
        </div>
        <div className="bg-surface rounded-[1.5rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all p-6 flex items-center gap-5">
          <div className="p-4 rounded-2xl bg-warning/10"><UserPlus size={24} className="text-warning" /></div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{allCandidates.length - requestedCount}</p>
            <p className="text-sm text-text-tertiary">Not Visa Selected</p>
          </div>
        </div>
      </div>

      {/* Recent Candidates Table */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2"><Users className="text-primary" size={20} /> Recent Candidates</h2>
          <Link href="/candidates" className="text-sm text-primary hover:underline font-medium">View All →</Link>
        </div>

        <div className="bg-surface rounded-[1.5rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#fafaff] border-b border-border/50 text-[11px] uppercase tracking-[0.15em] font-bold text-text-tertiary">
                  <th className="px-6 py-4 font-semibold">Shelf ID</th>
                  <th className="px-6 py-4 font-semibold">Candidate</th>
                  <th className="px-6 py-4 font-semibold">Passport No.</th>
                  <th className="px-6 py-4 font-semibold">Job / Skills</th>
                  <th className="px-6 py-4 font-semibold">Visa Status</th>
                  <th className="px-6 py-4 font-semibold">COC</th>
                  <th className="px-6 py-4 font-semibold">Medical</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={8} className="px-6 py-10 text-center"><div className="flex flex-col items-center gap-3"><Loader2 size={32} className="text-primary animate-spin" /><p className="text-text-tertiary">Loading candidates...</p></div></td></tr>
                ) : recentCandidates.length > 0 ? (
                  recentCandidates.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={(e) => { if (!(e.target as HTMLElement).closest('[data-action-menu]') && !(e.target as HTMLElement).closest('button')) router.push(`/candidates/${candidate.id}`); }}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono font-bold inline-block border border-gray-200 shadow-sm">{candidate.shelfId || 'UNASSIGNED'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                            <span className="text-primary font-bold text-sm">{candidate.passportData.givenNames.charAt(0)}{candidate.passportData.surname.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-text-primary">{candidate.passportData.givenNames} {candidate.passportData.surname}</p>
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
                        <Badge variant={candidate.isRequested ? 'success' : 'default'}>{candidate.isRequested ? '✓ Visa Selected' : 'Pending Visa'}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {candidate.cocDocumentUrl ? (
                          <button onClick={() => setViewDoc(candidate.cocDocumentUrl!)} className="text-sm text-primary hover:underline font-medium flex items-center gap-1"><Eye size={14} /> View</button>
                        ) : <span className="text-xs text-text-tertiary">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {candidate.medicalDocumentUrl ? (
                          <button onClick={() => setViewDoc(candidate.medicalDocumentUrl!)} className="text-sm text-emerald-600 hover:underline font-medium flex items-center gap-1"><Eye size={14} /> View</button>
                        ) : <span className="text-xs text-text-tertiary">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative inline-block" data-action-menu>
                          <button onClick={() => setOpenMenuId(openMenuId === candidate.id ? null : candidate.id)} className="text-text-tertiary hover:text-primary transition-colors p-2 rounded-lg hover:bg-primary-50">
                            <MoreVertical size={18} />
                          </button>
                          {openMenuId === candidate.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 animate-fade-in">
                              {candidate.isRequested ? (
                                <button onClick={(e) => { e.stopPropagation(); toggleRequested(candidate.id, true); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left">
                                  <CheckCircle size={16} className="text-amber-500" />
                                  <span>Cancel Visa Selected</span>
                                </button>
                              ) : (
                                <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setVisaModalId(candidate.id); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left">
                                  <CheckCircle size={16} className="text-text-tertiary" />
                                  <span>Visa Selected</span>
                                </button>
                              )}
                              <div className="border-t border-border my-1" />
                              <button onClick={() => deleteCandidate(candidate.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors text-left text-red-600">
                                <Trash2 size={16} /><span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-text-tertiary">No candidates registered yet. Click &quot;Add Candidate&quot; to get started.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Recent Requested Table */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2"><ClipboardList className="text-green-600" size={20} /> Recent Visa Selected</h2>
          <Link href="/requested" className="text-sm text-primary hover:underline font-medium">View All →</Link>
        </div>

        <div className="bg-surface rounded-[1.5rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#fafaff] border-b border-border/50 text-[11px] uppercase tracking-[0.15em] font-bold text-text-tertiary">
                  <th className="px-6 py-4 font-semibold">Shelf ID</th>
                  <th className="px-6 py-4 font-semibold">Candidate</th>
                  <th className="px-6 py-4 font-semibold">Passport No.</th>
                  <th className="px-6 py-4 font-semibold">Job / Skills</th>
                  <th className="px-6 py-4 font-semibold">Requested</th>
                  <th className="px-6 py-4 font-semibold">COC</th>
                  <th className="px-6 py-4 font-semibold">Medical</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={8} className="px-6 py-10 text-center"><div className="flex flex-col items-center gap-3"><Loader2 size={32} className="text-primary animate-spin" /><p className="text-text-tertiary">Loading...</p></div></td></tr>
                ) : recentRequested.length > 0 ? (
                  recentRequested.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={(e) => { if (!(e.target as HTMLElement).closest('[data-action-menu]') && !(e.target as HTMLElement).closest('button')) router.push(`/candidates/${candidate.id}`); }}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono font-bold inline-block border border-gray-200 shadow-sm">{candidate.shelfId || 'UNASSIGNED'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                            <span className="text-green-600 font-bold text-sm">{candidate.passportData.givenNames.charAt(0)}{candidate.passportData.surname.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-text-primary">{candidate.passportData.givenNames} {candidate.passportData.surname}</p>
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
                        <Badge variant="success">✓ Visa Selected</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {candidate.cocDocumentUrl ? (
                          <button onClick={() => setViewDoc(candidate.cocDocumentUrl!)} className="text-sm text-primary hover:underline font-medium flex items-center gap-1"><Eye size={14} /> View</button>
                        ) : <span className="text-xs text-text-tertiary">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {candidate.medicalDocumentUrl ? (
                          <button onClick={() => setViewDoc(candidate.medicalDocumentUrl!)} className="text-sm text-emerald-600 hover:underline font-medium flex items-center gap-1"><Eye size={14} /> View</button>
                        ) : <span className="text-xs text-text-tertiary">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative inline-block" data-action-menu>
                          <button onClick={() => setOpenMenuId(openMenuId === candidate.id ? null : candidate.id)} className="text-text-tertiary hover:text-primary transition-colors p-2 rounded-lg hover:bg-primary-50">
                            <MoreVertical size={18} />
                          </button>
                          {openMenuId === candidate.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 animate-fade-in">
                              <button onClick={(e) => { e.stopPropagation(); toggleRequested(candidate.id, true); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left">
                                <CheckCircle size={16} className="text-amber-500" />
                                <span>Cancel Visa Selected</span>
                              </button>
                              <div className="border-t border-border my-1" />
                              <button onClick={() => deleteCandidate(candidate.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors text-left text-red-600">
                                <Trash2 size={16} /><span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-text-tertiary">No visa selected candidates yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

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
    </div>
  );
}
