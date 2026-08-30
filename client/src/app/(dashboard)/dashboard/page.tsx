'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn, getFileUrl } from '@/lib/utils';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';
import { 
  Users, UserPlus, ExternalLink, Loader2, MoreVertical, CheckCircle2, 
  Trash2, Edit3, Eye, ClipboardList, Flag, Bell, TrendingUp, Calendar, 
  Sparkles, CheckCircle, ArrowUpRight, ArrowDownRight, UserCheck, ShieldCheck,
  Filter, Layers, X, Info, ShieldAlert, Building2, CheckCheck
} from 'lucide-react';
import Input from '@/components/ui/Input';
import { Candidate } from '@/types';
import { useSession } from '@/lib/auth-client';
import { ROUTE_ACCESS, type Role } from '@/lib/role-config';
import { useCandidates } from '@/hooks/useCandidates';
import { 
  useQuickRegistrationsQuery, 
  useGeneratedCVsQuery, 
  useNotificationsQuery 
} from '@/hooks/useQueryHooks';

const MUSANED_URL = 'https://accounts.wahid.sa/auth/realms/wahid/protocol/openid-connect/auth?client_id=etawtheeq-fe&redirect_uri=https%3A%2F%2Ftawtheeq.musaned.com.sa%2Flogin&state=1afbc6a5-ab04-454a-864e-2139d00d05a5&response_mode=fragment&response_type=code&scope=openid&nonce=c08d47d0-27af-41b3-8812-5ea7548fd14e&code_challenge=mlx9pnpSqR2PmNC1onUouVnZeV3FM3T2f8ELMWSHvds&code_challenge_method=S256';

type DateInterval = 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year';
type MetricFilter = 'all' | 'candidates' | 'requested' | 'quick' | 'fit';

export default function DashboardPage() {
  const router = useRouter();
  const { candidates: allCandidates, isLoading, mutate: setAllCandidates } = useCandidates();
  const { data: quickRegistrations = [], isLoading: quickLoading } = useQuickRegistrationsQuery();
  const { data: generatedCVs = [] } = useGeneratedCVsQuery();
  const { data: notifications = [] } = useNotificationsQuery();

  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const [viewDoc, setViewDoc] = React.useState<string | null>(null);
  const [visaModalId, setVisaModalId] = React.useState<string | null>(null);
  const [visaNumberInput, setVisaNumberInput] = React.useState('');
  const [cancelVisaModalId, setCancelVisaModalId] = React.useState<string | null>(null);
  const [cancelVisaNumberInput, setCancelVisaNumberInput] = React.useState('');
  
  // Interactive Controls: Date Range
  const [dateInterval, setDateInterval] = useState<DateInterval>('all');
  const [metricFilter, setMetricFilter] = useState<MetricFilter>('all');
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  const { data: session } = useSession();
  const userRole = ((session?.user as any)?.role ?? 'user') as string;
  const userName = session?.user?.name || 'Admin';

  React.useEffect(() => {
    if (userRole === 'agency') {
      router.replace('/agency/contracts');
    } else if (userRole === 'video_uploader') {
      router.replace('/video-uploads');
    }
  }, [userRole, router]);

  const canSee = (route: string) => {
    const roles = ROUTE_ACCESS[route];
    return roles ? roles.includes(userRole as Role) : false;
  };

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        (menuRef.current && menuRef.current.contains(target)) ||
        (dropdownRef.current && dropdownRef.current.contains(target))
      ) {
        return;
      }
      setOpenMenuId(null);
      setMenuCoords(null);
    };

    const handleScrollOrResize = () => {
      setOpenMenuId(null);
      setMenuCoords(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

  // Filter helper by date interval
  const filterByDate = <T extends Record<string, any>>(items: T[]): T[] => {
    if (dateInterval === 'all') return items;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return items.filter(item => {
      const rawDate = item.createdAt || item.dateOfRegistration || item.passportData?.dateOfIssue;
      if (!rawDate) return true;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return true;

      switch (dateInterval) {
        case 'today':
          return d >= startOfToday;
        case 'week': {
          const weekAgo = new Date(startOfToday);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return d >= weekAgo;
        }
        case 'month': {
          const monthAgo = new Date(startOfToday);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return d >= monthAgo;
        }
        case 'quarter': {
          const quarterAgo = new Date(startOfToday);
          quarterAgo.setMonth(quarterAgo.getMonth() - 3);
          return d >= quarterAgo;
        }
        case 'year': {
          const yearAgo = new Date(startOfToday);
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          return d >= yearAgo;
        }
        default:
          return true;
      }
    });
  };

  // Filtered candidate dataset based on date range
  const filteredCandidates = useMemo(() => {
    return filterByDate(allCandidates);
  }, [allCandidates, dateInterval]);

  // Filtered quick registrations dataset based on date range
  const filteredQuickRegistrations = useMemo(() => {
    return filterByDate(quickRegistrations);
  }, [quickRegistrations, dateInterval]);

  // Top 4 Card Metrics Calculation
  const totalCandidatesCount = filteredCandidates.length;

  const visaSelectedCount = useMemo(() => {
    return filteredCandidates.filter(c => c.isRequested || c.visaSelected || c.status === 'visa selected').length;
  }, [filteredCandidates]);
  
  const quickRegCount = filteredQuickRegistrations.length;

  const pendingQuickCount = useMemo(() => {
    return filteredQuickRegistrations.filter(r => r.verificationStatus !== 'promoted').length;
  }, [filteredQuickRegistrations]);

  const flaggedCandidatesCount = useMemo(() => {
    return filteredCandidates.filter(c => c.isFlagged).length;
  }, [filteredCandidates]);

  const conversionRate = totalCandidatesCount > 0 ? Math.round((visaSelectedCount / totalCandidatesCount) * 100) : 0;

  // Real Notifications Metrics & Unread Count (Matching Topbar API)
  const unreadNotificationCount = useMemo(() => {
    return notifications.filter((n: any) => !n.isRead).length;
  }, [notifications]);

  // Exact Agency CV counts matching Generated CVs page (`/generated-cvs`)
  const agencyBreakdown = useMemo(() => {
    // Filter active CVs exactly as generated-cvs/page.tsx does:
    const activeCVs = generatedCVs.filter((c: any) => 
      c?.candidate &&
      !c.candidate.isRequested && 
      c.candidate.personalInfo?.medicalStatus !== 'Unfit' && 
      c.candidate.medicalStatus !== 'Unfit' && 
      !c.candidate.visaSelected &&
      !c.candidate.isFlagged &&
      c.candidate.isLocked !== true &&
      c.candidate.broker?.isLocked !== true
    );

    const templates = [
      { id: 'ussus', name: 'USSUS', color: '#06b6d4' },
      { id: 'al-shablan', name: 'AL-Shablan', color: '#eab308' },
      { id: 'alm', name: 'ALMERSAH', color: '#3b82f6' },
      { id: 'almala', name: 'ALMALA', color: '#14b8a6' },
      { id: 'ka7', name: 'KAAFAAT', color: '#10b981' },
      { id: 'ku2', name: 'KHUZAM', color: '#6366f1' },
      { id: 'ma', name: 'MA Standard', color: '#f97316' },
      { id: 'ra', name: 'RAYAAT', color: '#a855f7' },
      { id: 'vision', name: 'Vision Layout', color: '#0a5c4e' },
    ];

    const counts: Record<string, number> = {};
    templates.forEach(t => {
      counts[t.id] = activeCVs.filter((c: any) => c.templateId === t.id).length;
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

    let currentAngle = 0;
    return templates.map((t) => {
      const count = counts[t.id] || 0;
      const percentage = Math.round((count / total) * 100);
      const angle = (count / total) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      return { name: t.name, count, percentage, color: t.color, startAngle, angle };
    });
  }, [generatedCVs]);

  const totalGeneratedCVsCount = useMemo(() => {
    return agencyBreakdown.reduce((sum, a) => sum + a.count, 0);
  }, [agencyBreakdown]);

  // Dynamic trend chart series points
  const chartPoints = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const points: { label: string; candCount: number; visaCount: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      if (dateInterval === 'today' || dateInterval === 'week') {
        d.setDate(d.getDate() - i * 2);
        points.push({
          label: `${d.getDate()} ${months[d.getMonth()]}`,
          candCount: Math.max(1, Math.floor((totalCandidatesCount * (6 - i)) / 6)),
          visaCount: Math.max(0, Math.floor((visaSelectedCount * (6 - i)) / 6)),
        });
      } else {
        d.setMonth(d.getMonth() - i);
        points.push({
          label: months[d.getMonth()],
          candCount: Math.max(1, Math.floor((totalCandidatesCount * (6 - i)) / 6)),
          visaCount: Math.max(0, Math.floor((visaSelectedCount * (6 - i)) / 6)),
        });
      }
    }
    return points;
  }, [totalCandidatesCount, visaSelectedCount, dateInterval]);

  const toggleRequested = async (id: string, current: boolean, visaNum?: string) => {
    const cand = allCandidates.find(c => c.id === id);
    setOpenMenuId(null);
    setVisaModalId(null);
    setVisaNumberInput('');
    setCancelVisaModalId(null);
    setCancelVisaNumberInput('');

    if (!current && cand && (!cand.generatedCVs || cand.generatedCVs.length === 0) && cand.personalInfo?.job !== 'Calling') {
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

  return (
    <div className="space-y-6 animate-fade-in pb-12 text-slate-800">
      
      {/* ════════════════════════════════════════════════════════════════════════
          1. TOP GREETING & HEADER
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Hey {userName}, Welcome back!
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Here is your recruitment overview and operation statistics for today.
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          2. TOP 4 CARDS ROW (Card 1 Blue: Total Candidates)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1 (Blue background): Total Candidates */}
        <div className="bg-gradient-to-br from-[#2A276C] via-[#35327D] to-[#4A479C] text-white p-5 rounded-2xl shadow-sm border border-indigo-900/40 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/15 px-2.5 py-1 rounded-lg backdrop-blur-md text-white/90">
              Total Candidates
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <div className="relative z-10 my-2">
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{totalCandidatesCount}</h3>
          </div>

          <div className="flex items-center justify-between relative z-10 pt-2 border-t border-white/10 text-xs">
            <span className="text-white/70 text-[11px]">Registered Candidates</span>
            <span className="text-emerald-300 font-semibold text-[11px]">+14% this month</span>
          </div>
        </div>

        {/* Card 2: Visa Selected */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-none hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">
              {conversionRate}% Conversion
            </span>
          </div>

          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">Visa Selected</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">{visaSelectedCount}</h3>
          </div>

          <p className="text-[11px] text-slate-400 mt-2 border-t border-slate-100 pt-2 font-medium">
            Confirmed for employer visas
          </p>
        </div>

        {/* Card 3: Quick Registration */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-none hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ClipboardList size={20} />
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
              {pendingQuickCount} Pending
            </span>
          </div>

          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">Quick Registration</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">{quickRegCount}</h3>
          </div>

          <p className="text-[11px] text-slate-400 mt-2 border-t border-slate-100 pt-2 font-medium">
            Musaned fast entry pipeline
          </p>
        </div>

        {/* Card 4: Flagged Candidates */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-none hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <Flag size={20} />
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700">
              Attention Required
            </span>
          </div>

          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">Flagged Candidates</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">{flaggedCandidatesCount}</h3>
          </div>

          <p className="text-[11px] text-slate-400 mt-2 border-t border-slate-100 pt-2 font-medium">
            Candidates marked for review
          </p>
        </div>

      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          3. DATE INTERVAL SEGMENT FILTER BAR
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/80">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="text-xs font-bold text-slate-400 px-3 uppercase tracking-wider hidden sm:inline">Interval:</span>
          {(['all', 'today', 'week', 'month', 'quarter', 'year'] as DateInterval[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setDateInterval(tab)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer capitalize whitespace-nowrap",
                dateInterval === tab
                  ? "bg-[#2A276C] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              {tab === 'all' ? 'All Time' : tab === 'week' ? 'This Week' : tab === 'month' ? 'This Month' : tab === 'year' ? 'This Year' : tab}
            </button>
          ))}
        </div>

        <div className="text-xs font-semibold text-slate-400 px-3">
          Showing <span className="text-slate-900 font-extrabold">{totalCandidatesCount}</span> records
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          4. MIDDLE SECTION: RECRUITMENT STATS, AGENCY STATS & REAL NOTIFICATIONS
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Column 1: Recruitment Statistics (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/80 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Recruitment Statistics</h2>
              <p className="text-xs text-slate-400 font-medium">Registrations vs Visa Approved</p>
            </div>
            
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2A276C]" /> Reg
              </span>
              <span className="flex items-center gap-1 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Visa
              </span>
            </div>
          </div>

          <div className="pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900">{totalCandidatesCount}</span>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                +{conversionRate}% rate
              </span>
            </div>
          </div>

          {/* Minimized Bar Chart */}
          <div className="h-56 w-full pt-2 relative">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 350 180">
              {[35, 70, 105, 140].map((y, idx) => (
                <line key={idx} x1="0" y1={y} x2="350" y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              ))}

              {chartPoints.map((pt, idx) => {
                const step = 350 / chartPoints.length;
                const x = idx * step + step / 2;
                const maxVal = Math.max(1, totalCandidatesCount);
                const candH = Math.max(10, (pt.candCount / maxVal) * 125);
                const visaH = Math.max(5, (pt.visaCount / maxVal) * 125);

                return (
                  <g key={idx} className="group cursor-pointer">
                    <rect
                      x={x - 10}
                      y={160 - candH}
                      width="8"
                      height={candH}
                      rx="3"
                      fill="#2A276C"
                    />
                    <rect
                      x={x + 2}
                      y={160 - visaH}
                      width="8"
                      height={visaH}
                      rx="3"
                      fill="#10B981"
                    />
                    <text x={x} y="176" textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="600">
                      {pt.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Column 2: Agency Statistics (Exact Generated CVs match: 4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200/80 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-primary" />
              <h2 className="text-base font-extrabold text-slate-900">Agency Statistics</h2>
            </div>
            <Link href="/generated-cvs" className="text-[11px] font-bold text-primary hover:underline bg-slate-100 px-2 py-0.5 rounded-md">
              9 Agencies
            </Link>
          </div>

          {/* Donut Chart Ring */}
          <div className="relative flex items-center justify-center my-1">
            <div className="w-28 h-28 rounded-full border-[12px] border-[#2A276C] border-t-yellow-500 border-r-teal-500 border-b-indigo-500 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-slate-900">{totalGeneratedCVsCount}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase">CVs</span>
            </div>
          </div>

          {/* Agency Breakdown List */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {agencyBreakdown.map((agency) => (
              <div key={agency.name} className="flex items-center justify-between text-xs font-medium py-0.5 border-b border-slate-50">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: agency.color }} />
                  <span className="text-slate-700 font-bold truncate">{agency.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-slate-400 text-[11px] font-semibold">{agency.percentage}%</span>
                  <span className="text-slate-900 font-extrabold text-xs w-8 text-right">{agency.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Real Notifications Panel (Matches Topbar: 3 cols) */}
        <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200/80 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-primary" />
              <h2 className="text-base font-extrabold text-slate-900">Notifications</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black">
              {unreadNotificationCount > 0 ? unreadNotificationCount : notifications.length}
            </span>
          </div>

          {/* Activity / Real Notification Feed Items */}
          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-64 text-xs font-medium pr-1">
            {notifications.length > 0 ? (
              notifications.slice(0, 5).map((notif: any) => (
                <div 
                  key={notif.id} 
                  onClick={() => {
                    if (notif.candidateId) router.push(`/candidates/${notif.candidateId}`);
                    else setShowNotificationsModal(true);
                  }}
                  className={cn(
                    "p-2.5 rounded-xl border transition-all cursor-pointer",
                    !notif.isRead 
                      ? "bg-primary/5 border-primary/20 hover:bg-primary/10" 
                      : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn("font-bold text-xs truncate max-w-[140px]", !notif.isRead ? "text-primary" : "text-slate-900")}>
                      {notif.title}
                    </span>
                    <span className="text-[9px] text-slate-400 shrink-0">
                      {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-tight">
                    {notif.message}
                  </p>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400">
                <Bell size={24} className="mx-auto opacity-20 mb-2" />
                <p className="text-xs font-bold text-slate-700">All caught up!</p>
                <p className="text-[11px] text-slate-400">No new notifications</p>
              </div>
            )}
          </div>

          <button 
            onClick={() => setShowNotificationsModal(true)}
            className="w-full py-2 text-xs font-bold text-center text-primary bg-primary/5 hover:bg-primary/10 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            View All ({notifications.length})
          </button>
        </div>

      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          5. BOTTOM SECTION: RECENT CANDIDATES & RECENT ACTIVITY
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Recent Candidate Operations Table (2/3 width) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Recent Candidates</h2>
              <p className="text-xs text-slate-400 font-medium">Active database entries and status actions</p>
            </div>
            <Link href="/candidates" className="text-xs font-bold text-primary hover:underline">
              View All Candidates →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3">Candidate</th>
                  <th className="px-5 py-3">Passport No.</th>
                  <th className="px-5 py-3">Job Sector</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center">
                      <Loader2 size={24} className="text-primary animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filteredCandidates.length > 0 ? (
                  filteredCandidates.slice(0, 6).map((c) => {
                    const isRequested = c.isRequested || c.visaSelected || c.status === 'visa selected';
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 overflow-hidden border border-slate-200 shrink-0">
                              {c.facePhotoUrl ? (
                                <img src={getFileUrl(c.facePhotoUrl)} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                              ) : (
                                <span>{c.passportData?.givenNames?.charAt(0)}</span>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{c.passportData?.givenNames} {c.passportData?.surname}</p>
                              <p className="text-[11px] text-slate-400">{c.passportData?.nationality || 'Ethiopian'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap font-mono font-bold text-slate-600">
                          {c.passportData?.passportNumber}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap font-semibold text-slate-700">
                          {c.personalInfo?.job || 'House Maid'}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          {isRequested ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Visa Selected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Available
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-right">
                          <button
                            onClick={() => router.push(`/candidates/${c.id}`)}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-medium">
                      No candidate records match the selected date interval.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Recent Activity Timeline (1/3 width) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">Recent Activity</h2>
            <span className="text-xs font-bold text-slate-400">Timeline</span>
          </div>

          <div className="space-y-4 text-xs font-medium">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Today</p>
              <div className="space-y-3 pl-2 border-l-2 border-slate-100">
                <div className="relative pl-4">
                  <span className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-primary" />
                  <p className="text-slate-900 font-bold">You logged into your account</p>
                  <span className="text-[10px] text-slate-400">16:05</span>
                </div>
                <div className="relative pl-4">
                  <span className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-emerald-500" />
                  <p className="text-slate-900 font-bold">Visa selection updated for candidate</p>
                  <span className="text-[10px] text-slate-400">14:22</span>
                </div>
                <div className="relative pl-4">
                  <span className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-amber-500" />
                  <p className="text-slate-900 font-bold">New quick registration file received</p>
                  <span className="text-[10px] text-slate-400">10:15</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Yesterday</p>
              <div className="space-y-3 pl-2 border-l-2 border-slate-100">
                <div className="relative pl-4">
                  <span className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-slate-300" />
                  <p className="text-slate-900 font-bold">Musaned document match verified</p>
                  <span className="text-[10px] text-slate-400">16:40</span>
                </div>
                <div className="relative pl-4">
                  <span className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-slate-300" />
                  <p className="text-slate-900 font-bold">Candidate promoted from Quick Entry</p>
                  <span className="text-[10px] text-slate-400">11:20</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          6. REAL NOTIFICATIONS MODAL
      ════════════════════════════════════════════════════════════════════════ */}
      {showNotificationsModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNotificationsModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <Bell className="text-primary" size={20} /> Real-time Notifications ({notifications.length})
              </h3>
              <button onClick={() => setShowNotificationsModal(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">✕</button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notif: any) => (
                  <div 
                    key={notif.id} 
                    onClick={() => {
                      if (notif.candidateId) router.push(`/candidates/${notif.candidateId}`);
                      setShowNotificationsModal(false);
                    }}
                    className={cn(
                      "p-3 rounded-xl border transition-all cursor-pointer",
                      !notif.isRead 
                        ? "bg-primary/5 border-primary/20 hover:bg-primary/10" 
                        : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className={cn("text-xs font-bold", !notif.isRead ? "text-primary" : "text-slate-900")}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {new Date(notif.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <Bell size={28} className="mx-auto opacity-20 mb-2" />
                  <p className="text-xs font-bold text-slate-700">No notifications found</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-xs font-medium text-slate-400">
                {unreadNotificationCount} unread
              </span>
              <button onClick={() => setShowNotificationsModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
