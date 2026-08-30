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
  Filter, Layers, X, Info
} from 'lucide-react';
import Input from '@/components/ui/Input';
import { Candidate } from '@/types';
import { useSession } from '@/lib/auth-client';
import { ROUTE_ACCESS, type Role } from '@/lib/role-config';
import { useCandidates } from '@/hooks/useCandidates';
import { useQuickRegistrationsQuery } from '@/hooks/useQueryHooks';

const MUSANED_URL = 'https://accounts.wahid.sa/auth/realms/wahid/protocol/openid-connect/auth?client_id=etawtheeq-fe&redirect_uri=https%3A%2F%2Ftawtheeq.musaned.com.sa%2Flogin&state=1afbc6a5-ab04-454a-864e-2139d00d05a5&response_mode=fragment&response_type=code&scope=openid&nonce=c08d47d0-27af-41b3-8812-5ea7548fd14e&code_challenge=mlx9pnpSqR2PmNC1onUouVnZeV3FM3T2f8ELMWSHvds&code_challenge_method=S256';

type DateInterval = 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year';
type MetricFilter = 'all' | 'candidates' | 'requested' | 'quick' | 'fit';

export default function DashboardPage() {
  const router = useRouter();
  const { candidates: allCandidates, isLoading, mutate: setAllCandidates } = useCandidates();
  const { data: quickRegistrations = [], isLoading: quickLoading } = useQuickRegistrationsQuery();
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const [viewDoc, setViewDoc] = React.useState<string | null>(null);
  const [visaModalId, setVisaModalId] = React.useState<string | null>(null);
  const [visaNumberInput, setVisaNumberInput] = React.useState('');
  const [cancelVisaModalId, setCancelVisaModalId] = React.useState<string | null>(null);
  const [cancelVisaNumberInput, setCancelVisaNumberInput] = React.useState('');
  
  // Interactive Controls: Date Range & Active Card Metric Filter
  const [dateInterval, setDateInterval] = useState<DateInterval>('all');
  const [metricFilter, setMetricFilter] = useState<MetricFilter>('all');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; candY: number; visaY: number; label: string; candCount: number; visaCount: number } | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(4);
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

  // KPI Metrics Calculation
  const totalCandidatesCount = filteredCandidates.length;
  const visaSelectedCount = useMemo(() => {
    return filteredCandidates.filter(c => c.isRequested || c.visaSelected || c.status === 'visa selected').length;
  }, [filteredCandidates]);
  
  const fitCandidatesCount = useMemo(() => {
    return filteredCandidates.filter(c => c.generatedCVs && c.generatedCVs.length > 0).length;
  }, [filteredCandidates]);

  const quickRegCount = filteredQuickRegistrations.length;
  const pendingQuickCount = useMemo(() => {
    return filteredQuickRegistrations.filter(r => r.verificationStatus !== 'promoted').length;
  }, [filteredQuickRegistrations]);

  const conversionRate = totalCandidatesCount > 0 ? Math.round((visaSelectedCount / totalCandidatesCount) * 100) : 0;

  // Sector distribution breakdown
  const sectorBreakdown = useMemo(() => {
    const counts: Record<string, number> = {
      'House Maid': 0,
      'Driver': 0,
      'Cook': 0,
      'Babysitter': 0,
      'Nurse': 0,
    };
    filteredCandidates.forEach(c => {
      const job = c.personalInfo?.job || 'House Maid';
      if (job.toLowerCase().includes('driver')) counts['Driver']++;
      else if (job.toLowerCase().includes('cook')) counts['Cook']++;
      else if (job.toLowerCase().includes('baby') || job.toLowerCase().includes('nanny')) counts['Babysitter']++;
      else if (job.toLowerCase().includes('nurse')) counts['Nurse']++;
      else counts['House Maid']++;
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const colors = ['#2A276C', '#6b5ce7', '#ec4899', '#3b82f6', '#10b981'];
    let currentAngle = 0;

    return Object.entries(counts).map(([name, count], idx) => {
      const percentage = Math.round((count / total) * 100);
      const angle = (count / total) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      return { name, count, percentage, color: colors[idx % colors.length], startAngle, angle };
    });
  }, [filteredCandidates]);

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
          1. iOS TOP GREETING & HEADER BAR
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
          2. TOP 4 CARDS ROW (FinPay Inspiration UI Aesthetics)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Metallic Primary Brand Card */}
        <div className="bg-gradient-to-br from-[#2A276C] via-[#35327D] to-[#4A479C] text-white p-5 rounded-2xl shadow-sm border border-indigo-900/40 relative overflow-hidden flex flex-col justify-between min-h-[170px]">
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/15 px-2.5 py-1 rounded-lg backdrop-blur-md text-white/90">
              CoolStaff Agency
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <div className="relative z-10 my-3">
            <p className="text-[11px] font-medium text-white/60 uppercase tracking-wider">Total Active Quota</p>
            <h3 className="text-3xl font-extrabold tracking-tight mt-0.5">{totalCandidatesCount}</h3>
          </div>

          <div className="flex items-center justify-between relative z-10 pt-2 border-t border-white/10 text-xs">
            <span className="font-mono text-[11px] text-white/70">CS-2026-ETH</span>
            <span className="text-emerald-300 font-semibold text-[11px]">Musaned Synced ✓</span>
          </div>
        </div>

        {/* Card 2: Total Candidates KPI */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-none hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users size={20} />
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">
              <TrendingUp size={12} /> +14%
            </span>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-400">Total Candidates</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{totalCandidatesCount}</h3>
          </div>

          <p className="text-[11px] text-slate-400 mt-3 border-t border-slate-100 pt-2 font-medium">
            Active candidate database records
          </p>
        </div>

        {/* Card 3: Visa Selected KPI */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-none hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">
              {conversionRate}% Conversion
            </span>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-400">Visa Selected</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{visaSelectedCount}</h3>
          </div>

          <p className="text-[11px] text-slate-400 mt-3 border-t border-slate-100 pt-2 font-medium">
            Confirmed for Gulf employer visas
          </p>
        </div>

        {/* Card 4: Quick Registrations KPI */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-none hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ClipboardList size={20} />
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
              {pendingQuickCount} Pending
            </span>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-400">Quick Registrations</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{quickRegCount}</h3>
          </div>

          <p className="text-[11px] text-slate-400 mt-3 border-t border-slate-100 pt-2 font-medium">
            Musaned fast entry pipeline
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
          4. MIDDLE SECTION: CHARTS & SECTOR BREAKDOWN (2/3 + 1/3)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Main Bar / Area Chart (2/3 width) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Recruitment Statistics</h2>
              <p className="text-xs text-slate-400 font-medium">Candidate Registrations vs Visa Selections</p>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2A276C]" /> Registrations
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Visa Approved
              </span>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-slate-900">{totalCandidatesCount}</span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                +{conversionRate}% Visa Rate
              </span>
            </div>
          </div>

          {/* SVG Bar / Area Chart */}
          <div className="h-64 w-full pt-4 relative">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200">
              {/* Grid Lines */}
              {[40, 80, 120, 160].map((y, idx) => (
                <line key={idx} x1="0" y1={y} x2="500" y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
              ))}

              {/* Bars representation */}
              {chartPoints.map((pt, idx) => {
                const step = 500 / chartPoints.length;
                const x = idx * step + step / 2;
                const maxVal = Math.max(1, totalCandidatesCount);
                const candH = Math.max(12, (pt.candCount / maxVal) * 140);
                const visaH = Math.max(6, (pt.visaCount / maxVal) * 140);

                return (
                  <g key={idx} className="group cursor-pointer">
                    {/* Candidate Registration Bar */}
                    <rect
                      x={x - 14}
                      y={180 - candH}
                      width="12"
                      height={candH}
                      rx="4"
                      fill="#2A276C"
                      className="transition-all group-hover:opacity-80"
                    />
                    {/* Visa Selection Bar */}
                    <rect
                      x={x + 2}
                      y={180 - visaH}
                      width="12"
                      height={visaH}
                      rx="4"
                      fill="#10B981"
                      className="transition-all group-hover:opacity-80"
                    />
                    {/* X Label */}
                    <text x={x} y="198" textAnchor="middle" fontSize="11" fill="#94a3b8" fontWeight="600">
                      {pt.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right: Job Sector Breakdown (1/3 width) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">Sector Statistics</h2>
            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
              This Month
            </span>
          </div>

          {/* Ring Chart Center */}
          <div className="relative flex items-center justify-center my-2">
            <div className="w-36 h-36 rounded-full border-[14px] border-[#2A276C] border-t-emerald-500 border-r-pink-500 border-b-blue-500 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-slate-900">{totalCandidatesCount}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Candidates</span>
            </div>
          </div>

          {/* Breakdown Items List */}
          <div className="space-y-2.5 pt-2">
            {sectorBreakdown.map((sec) => (
              <div key={sec.name} className="flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sec.color }} />
                  <span className="text-slate-700 font-bold">{sec.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-semibold">{sec.percentage}%</span>
                  <span className="text-slate-900 font-extrabold w-8 text-right">{sec.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          5. BOTTOM SECTION: RECENT OPERATIONS TABLE & ACTIVITY FEED (2/3 + 1/3)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Recent Candidate Operations Table (2/3 width) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Recent Candidate Operations</h2>
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
                  filteredCandidates.slice(0, 7).map((c) => {
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

          <div className="pt-2 border-t border-slate-100">
            <button 
              onClick={() => setShowNotificationsModal(true)}
              className="w-full py-2 text-xs font-bold text-center text-primary hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
            >
              View Full Activity Log →
            </button>
          </div>
        </div>

      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          6. NOTIFICATIONS MODAL
      ════════════════════════════════════════════════════════════════════════ */}
      {showNotificationsModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNotificationsModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <Bell className="text-primary" size={20} /> Real-time Activity Feed
              </h3>
              <button onClick={() => setShowNotificationsModal(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">✕</button>
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-900">New Candidate Added</p>
                <p className="text-xs text-slate-500 mt-0.5">Candidate records successfully indexed into database.</p>
                <span className="text-[10px] text-slate-400">2 mins ago</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-xs font-bold text-emerald-900">Visa Selected Confirmed</p>
                <p className="text-xs text-emerald-700 mt-0.5">Candidate marked as visa selected for deployment.</p>
                <span className="text-[10px] text-emerald-600">18 mins ago</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs font-bold text-amber-900">Quick Registration Submitted</p>
                <p className="text-xs text-amber-700 mt-0.5">Entry file pending Musaned document verification.</p>
                <span className="text-[10px] text-amber-600">1 hour ago</span>
              </div>
            </div>

            <div className="pt-2 text-right">
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
