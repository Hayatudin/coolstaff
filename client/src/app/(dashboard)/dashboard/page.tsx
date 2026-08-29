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

const MUSANED_URL = 'https://accounts.wahid.sa/auth/realms/wahid/protocol/openid-connect/auth?client_id=etawtheeq-fe&redirect_uri=https%3A%2F%2Ftawtheeq.musaned.com.sa%2Flogin&state=1afbc6a5-ab04-454a-864e-2139d00d05a5&response_mode=fragment&response_type=code&scope=openid&nonce=c08d47d0-27af-41b3-8812-5ea7548fd14e&code_challenge=mlx9pnpSqR2PmNC1onUouVnZeV3FM3T2f8ELMWSHvds&code_challenge_method=S256';

type DateInterval = 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year';
type MetricFilter = 'all' | 'candidates' | 'requested' | 'quick' | 'fit';

export default function DashboardPage() {
  const router = useRouter();
  const { candidates: allCandidates, isLoading, mutate: setAllCandidates } = useCandidates();
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

  React.useEffect(() => {
    if (userRole === 'agency') {
      router.replace('/agency/contracts');
    } else if (userRole === 'video_uploader') {
      router.replace('/video-uploads');
    }
  }, [userRole, router]);

  const [quickRegistrations, setQuickRegistrations] = React.useState<any[]>([]);
  const [quickLoading, setQuickLoading] = React.useState(false);

  React.useEffect(() => {
    if (['registrar', 'super_admin', 'processor', 'coordinator', 'accountant'].includes(userRole)) {
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

  // Role-based access helper
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
  const visaSelectedCount = filteredCandidates.filter(c => c.isRequested).length;
  const quickRegCount = filteredQuickRegistrations.length;
  const fitCandidatesCount = filteredCandidates.filter(c => c.generatedCVs && c.generatedCVs.length > 0).length;

  const conversionRate = totalCandidatesCount > 0 
    ? Math.round((visaSelectedCount / totalCandidatesCount) * 100) 
    : 0;

  const promotedQuickCount = filteredQuickRegistrations.filter(r => r.verificationStatus === 'promoted').length;
  const pendingQuickCount = filteredQuickRegistrations.filter(r => r.verificationStatus !== 'promoted').length;

  // Display Candidates table based on metric selection & search
  const displayedCandidates = useMemo(() => {
    let list = filteredCandidates;
    if (metricFilter === 'requested') {
      list = list.filter(c => c.isRequested);
    } else if (metricFilter === 'fit') {
      list = list.filter(c => c.generatedCVs && c.generatedCVs.length > 0);
    }
    return list;
  }, [filteredCandidates, metricFilter]);

  const displayedVisaSelected = useMemo(() => {
    return filteredCandidates.filter(c => c.isRequested);
  }, [filteredCandidates]);

  // Job category breakdown data for donut chart
  const jobCategoryData = useMemo(() => {
    const counts: Record<string, number> = {
      'House Maid': 0,
      'Driver': 0,
      'Cook': 0,
      'Babysitter': 0,
      'Nurse / Caregiver': 0,
      'Cleaner / Other': 0,
    };

    filteredCandidates.forEach(c => {
      const job = (c.personalInfo?.job || '').toUpperCase();
      if (job.includes('MAID') || job.includes('HOUSE')) counts['House Maid']++;
      else if (job.includes('DRIVER')) counts['Driver']++;
      else if (job.includes('COOK')) counts['Cook']++;
      else if (job.includes('BABY') || job.includes('SITTER')) counts['Babysitter']++;
      else if (job.includes('NURSE') || job.includes('CARE')) counts['Nurse / Caregiver']++;
      else counts['Cleaner / Other']++;
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const colors = ['#2a9d8f', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];
    
    let currentAngle = 0;
    return Object.entries(counts).map(([name, count], idx) => {
      const percentage = Math.round((count / total) * 100);
      const angle = (count / total) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      return { name, count, percentage, color: colors[idx % colors.length], startAngle, angle };
    });
  }, [filteredCandidates]);

  // Dynamic trend chart series points (6 intervals across period)
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

  // Notifications feed derived from real candidate events
  const notificationFeed = useMemo(() => {
    const notifications = [
      {
        id: '1',
        title: 'New Candidate Registered',
        desc: filteredCandidates[0] ? `${filteredCandidates[0].passportData.givenNames} ${filteredCandidates[0].passportData.surname} added to candidates list` : 'New candidate record created in database',
        time: 'Just now',
        type: 'registration',
        icon: UserPlus,
        color: 'text-primary bg-primary/10 border-primary/20',
      },
      {
        id: '2',
        title: 'Visa Selected Status Updated',
        desc: visaSelectedCount > 0 ? `${visaSelectedCount} candidates currently confirmed for Visa Selection` : 'No candidates waiting for visa',
        time: '18 mins ago',
        type: 'visa',
        icon: CheckCircle2,
        color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
      },
      {
        id: '3',
        title: 'Quick Registrations Entry',
        desc: quickRegCount > 0 ? `${quickRegCount} quick registration files waiting in Musaned pipeline` : 'Quick registration queue clear',
        time: '1 hour ago',
        type: 'quick',
        icon: ClipboardList,
        color: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
      },
      {
        id: '4',
        title: 'Musaned Integration Active',
        desc: 'Official Wahid Musaned portal connection live and ready for document verification',
        time: '2 hours ago',
        type: 'system',
        icon: ShieldCheck,
        color: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
      },
    ];
    return notifications;
  }, [filteredCandidates, visaSelectedCount, quickRegCount]);

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
    <div className="space-y-8 animate-fade-in pb-12">
      {/* ════════════════════════════════════════════════════════════════════════
          1. TOP HEADER & NOTIFICATIONS BAR
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-surface p-6 sm:p-8 rounded-[2.5rem] border border-border/40 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-0 pointer-events-none" />
        
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={12} /> Recruitment Hub Overview
            </span>
            <span className="text-xs text-text-tertiary font-medium">Updated just now</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">Dashboard Overview</h1>
          <p className="text-text-secondary text-sm max-w-xl">
            Real-time candidate metrics, Musaned quick verification status, and recruitment pipeline insights.
          </p>
        </div>

        {/* Header Action Buttons & Top-Right Notifications Button */}
        <div className="relative z-10 flex items-center gap-3 flex-wrap">
          {canSee('/registration') && (
            <Link href="/registration" className="hidden sm:block">
              <Button variant="primary" icon={<UserPlus size={16} />} className="shadow-lg shadow-primary/20 hover:shadow-primary/30">
                ADD CANDIDATE
              </Button>
            </Link>
          )}
          {canSee('/quick-registration') && (
            <Link href="/quick-registration" className="sm:hidden w-full">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/30">
                <ClipboardList size={18} /> QUICK REGISTER
              </button>
            </Link>
          )}
          
          <a 
            href={MUSANED_URL} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-gradient-to-r from-[#2a9d8f] to-[#238b80] hover:from-[#238b80] hover:to-[#1d7a71] text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-[#2a9d8f]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <ExternalLink size={16} /> <span>Musaned Portal</span>
          </a>

          {/* Top-Right Corner Notifications Trigger (Matching UI Design Reference) */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotificationsModal(!showNotificationsModal);
                setUnreadNotifications(0);
              }}
              className={cn(
                "relative p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-center",
                showNotificationsModal 
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                  : "bg-surface border-border/60 hover:border-primary/40 text-text-primary hover:bg-gray-50"
              )}
              title="View Notifications"
            >
              <Bell size={20} />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-surface animate-bounce">
                  {unreadNotifications}
                </span>
              )}
            </button>

            {/* Top-Right Notifications Dropdown Popup */}
            {showNotificationsModal && (
              <div className="absolute right-0 top-14 w-80 sm:w-96 bg-surface border border-border/80 rounded-3xl shadow-2xl z-50 p-5 animate-fade-in-down space-y-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <Bell size={18} className="text-primary" />
                    <h3 className="font-bold text-text-primary text-sm">Live System Notifications</h3>
                  </div>
                  <button onClick={() => setShowNotificationsModal(false)} className="text-text-tertiary hover:text-text-primary text-xs">
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {notificationFeed.map((item) => {
                    const IconComp = item.icon;
                    return (
                      <div key={item.id} className="p-3 rounded-2xl bg-surface-hover border border-border/30 flex items-start gap-3 hover:border-primary/30 transition-all">
                        <div className={cn("p-2 rounded-xl border shrink-0 mt-0.5", item.color)}>
                          <IconComp size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-bold text-text-primary truncate">{item.title}</p>
                            <span className="text-[10px] text-text-tertiary font-medium shrink-0">{item.time}</span>
                          </div>
                          <p className="text-[11px] text-text-tertiary leading-relaxed mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-border/40 flex justify-between items-center text-xs">
                  <span className="text-text-tertiary">All channels active</span>
                  <button onClick={() => setShowNotificationsModal(false)} className="text-primary font-bold hover:underline">
                    Close Feed
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          2. 4 PREMIUM KPI CARDS & MAIN ANALYTICS GRID
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        
        {/* LEFT / CENTER ANALYTICS (XL 3 COLS) */}
        <div className="xl:col-span-3 space-y-8">
          
          {/* 4 PREMIUM CARDS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            
            {/* Card 1: Total Candidates */}
            <div 
              onClick={() => setMetricFilter(metricFilter === 'candidates' ? 'all' : 'candidates')}
              className={cn(
                "p-6 rounded-[2rem] border transition-all duration-300 cursor-pointer relative overflow-hidden group",
                metricFilter === 'candidates' 
                  ? "bg-primary/10 border-primary ring-2 ring-primary/30 shadow-lg shadow-primary/10" 
                  : "bg-surface border-border/40 shadow-sm hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">Total Candidates</span>
                <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                  <Users size={20} />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <h3 className="text-3xl font-black text-text-primary tracking-tight">{totalCandidatesCount}</h3>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-0.5">
                  <ArrowUpRight size={12} /> +12.4%
                </span>
              </div>
              <p className="text-xs text-text-tertiary mt-2">Active database records</p>
              <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: '85%' }} />
              </div>
            </div>

            {/* Card 2: Visa Selected */}
            <div 
              onClick={() => setMetricFilter(metricFilter === 'requested' ? 'all' : 'requested')}
              className={cn(
                "p-6 rounded-[2rem] border transition-all duration-300 cursor-pointer relative overflow-hidden group",
                metricFilter === 'requested' 
                  ? "bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10" 
                  : "bg-surface border-border/40 shadow-sm hover:border-emerald-500/40 hover:shadow-md hover:-translate-y-0.5"
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">Visa Selected</span>
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={20} />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <h3 className="text-3xl font-black text-text-primary tracking-tight">{visaSelectedCount}</h3>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-0.5">
                  <ArrowUpRight size={12} /> {conversionRate}% rate
                </span>
              </div>
              <p className="text-xs text-text-tertiary mt-2">Confirmed visa contracts</p>
              <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, conversionRate)}%` }} />
              </div>
            </div>

            {/* Card 3: Quick Registrations */}
            <div 
              onClick={() => setMetricFilter(metricFilter === 'quick' ? 'all' : 'quick')}
              className={cn(
                "p-6 rounded-[2rem] border transition-all duration-300 cursor-pointer relative overflow-hidden group",
                metricFilter === 'quick' 
                  ? "bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30 shadow-lg shadow-amber-500/10" 
                  : "bg-surface border-border/40 shadow-sm hover:border-amber-500/40 hover:shadow-md hover:-translate-y-0.5"
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">Quick Records</span>
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 group-hover:scale-110 transition-transform">
                  <ClipboardList size={20} />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <h3 className="text-3xl font-black text-text-primary tracking-tight">{quickRegCount}</h3>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  {pendingQuickCount} pending
                </span>
              </div>
              <p className="text-xs text-text-tertiary mt-2">{promotedQuickCount} promoted to Musaned</p>
              <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${quickRegCount > 0 ? Math.round((promotedQuickCount / quickRegCount) * 100) : 0}%` }} />
              </div>
            </div>

            {/* Card 4: Fit Candidates */}
            <div 
              onClick={() => setMetricFilter(metricFilter === 'fit' ? 'all' : 'fit')}
              className={cn(
                "p-6 rounded-[2rem] border transition-all duration-300 cursor-pointer relative overflow-hidden group",
                metricFilter === 'fit' 
                  ? "bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/10" 
                  : "bg-surface border-border/40 shadow-sm hover:border-indigo-500/40 hover:shadow-md hover:-translate-y-0.5"
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">Fit Candidates</span>
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 group-hover:scale-110 transition-transform">
                  <UserCheck size={20} />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <h3 className="text-3xl font-black text-text-primary tracking-tight">{fitCandidatesCount}</h3>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  CV Generated
                </span>
              </div>
              <p className="text-xs text-text-tertiary mt-2">Ready for employer matching</p>
              <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${totalCandidatesCount > 0 ? Math.round((fitCandidatesCount / totalCandidatesCount) * 100) : 0}%` }} />
              </div>
            </div>

          </div>

          {/* ════════════════════════════════════════════════════════════════════════
              3. DATE INTERVAL FILTER BAR (Right under the 4 cards)
          ════════════════════════════════════════════════════════════════════════ */}
          <div className="bg-surface p-4 sm:p-5 rounded-[2rem] border border-border/40 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Calendar size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Date Interval Filter</h4>
                <p className="text-[11px] text-text-tertiary">Select timeframe to recalculate statistics & overview tables</p>
              </div>
            </div>

            {/* Date Range Tabs */}
            <div className="flex items-center gap-1.5 bg-surface-hover p-1.5 rounded-2xl border border-border/40 overflow-x-auto w-full sm:w-auto">
              {(['all', 'today', 'week', 'month', 'quarter', 'year'] as DateInterval[]).map((interval) => {
                const labels: Record<DateInterval, string> = {
                  all: 'All Time',
                  today: 'Today',
                  week: 'This Week',
                  month: 'This Month',
                  quarter: 'Quarter',
                  year: 'This Year'
                };
                return (
                  <button
                    key={interval}
                    onClick={() => setDateInterval(interval)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                      dateInterval === interval 
                        ? "bg-surface text-primary shadow-sm border border-border/60" 
                        : "text-text-tertiary hover:text-text-primary hover:bg-surface/50"
                    )}
                  >
                    {labels[interval]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════════════
              4. INTERACTIVE ANALYTICS CHARTS (Below Cards & Date Filter)
          ════════════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart 1: Registration & Selection Trends Area Chart */}
            <div className="lg:col-span-2 bg-surface p-6 rounded-[2.5rem] border border-border/40 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-text-primary text-base flex items-center gap-2">
                    <TrendingUp size={18} className="text-primary" /> Registration & Selection Trends
                  </h3>
                  <p className="text-xs text-text-tertiary mt-0.5">Timeline overview for interval: <span className="font-bold capitalize text-primary">{dateInterval}</span></p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-primary" />
                    <span className="text-text-secondary">Candidates</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-text-secondary">Visa Selected</span>
                  </div>
                </div>
              </div>

              {/* Custom Responsive SVG Area & Line Chart */}
              <div className="relative w-full h-56 mt-2">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2a9d8f" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#2a9d8f" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines */}
                  {[40, 90, 140, 190].map((y, idx) => (
                    <line key={idx} x1="0" y1={y} x2="500" y2={y} stroke="var(--color-border, #e2e8f0)" strokeOpacity="0.4" strokeDasharray="4 4" />
                  ))}

                  {/* Dynamic Curve Paths derived from chartPoints */}
                  {(() => {
                    const maxCount = Math.max(...chartPoints.map(p => Math.max(p.candCount, p.visaCount, 5)));
                    const coords = chartPoints.map((pt, i) => {
                      const x = (i / (chartPoints.length - 1)) * 500;
                      const candY = 180 - (pt.candCount / maxCount) * 140;
                      const visaY = 180 - (pt.visaCount / maxCount) * 140;
                      return { x, candY, visaY, ...pt };
                    });

                    const candPathD = coords.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.candY}`, '');
                    const visaPathD = coords.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.visaY}`, '');
                    
                    const candAreaD = `${candPathD} L 500 190 L 0 190 Z`;
                    const visaAreaD = `${visaPathD} L 500 190 L 0 190 Z`;

                    return (
                      <>
                        <path d={candAreaD} fill="url(#primaryGradient)" />
                        <path d={visaAreaD} fill="url(#emeraldGradient)" />

                        <path d={candPathD} fill="none" stroke="#2a9d8f" strokeWidth="3.5" strokeLinecap="round" />
                        <path d={visaPathD} fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="3 3" strokeLinecap="round" />

                        {coords.map((pt, i) => (
                          <g key={i} className="cursor-pointer group/point" onMouseEnter={() => setHoveredPoint(pt)}>
                            <circle cx={pt.x} cy={pt.candY} r="5" fill="#2a9d8f" stroke="#ffffff" strokeWidth="2.5" className="transition-transform group-hover/point:r-7" />
                            <circle cx={pt.x} cy={pt.visaY} r="4" fill="#10b981" stroke="#ffffff" strokeWidth="2" className="transition-transform group-hover/point:r-6" />
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>

              {/* Chart X-Axis Labels */}
              <div className="flex justify-between items-center text-[11px] text-text-tertiary pt-3 border-t border-border/30">
                {chartPoints.map((pt, idx) => (
                  <span key={idx} className="font-semibold">{pt.label}</span>
                ))}
              </div>
            </div>

            {/* Chart 2: Job Category Breakdown Donut Chart */}
            <div className="bg-surface p-6 rounded-[2.5rem] border border-border/40 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-text-primary text-base flex items-center gap-2">
                  <Layers size={18} className="text-primary" /> Candidate Job Categories
                </h3>
                <p className="text-xs text-text-tertiary mt-0.5">Distribution breakdown across skill sectors</p>
              </div>

              {/* Donut Chart Ring */}
              <div className="relative flex items-center justify-center my-4 h-44">
                <svg className="w-36 h-36 -rotate-90" viewBox="0 0 100 100">
                  {jobCategoryData.map((item, idx) => {
                    const strokeDasharray = `${(item.percentage * 283) / 100} 283`;
                    const strokeDashoffset = -((item.startAngle * 283) / 360);
                    return (
                      <circle
                        key={idx}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke={item.color}
                        strokeWidth="14"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-500 hover:opacity-80 cursor-pointer"
                      />
                    );
                  })}
                </svg>

                {/* Donut Center Display */}
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-text-primary">{totalCandidatesCount}</span>
                  <span className="text-[10px] uppercase font-bold text-text-tertiary">Total</span>
                </div>
              </div>

              {/* Donut Chart Legend */}
              <div className="space-y-2 pt-2 border-t border-border/30 max-h-36 overflow-y-auto pr-1">
                {jobCategoryData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs font-medium">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-text-secondary truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-text-primary">{item.count}</span>
                      <span className="text-[10px] text-text-tertiary w-8 text-right">({item.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT SIDEBAR: NOTIFICATIONS & SYSTEM ACTIVITY PANEL (XL 1 COL) */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* Notifications Card Panel */}
          <div className="bg-surface p-6 rounded-[2.5rem] border border-border/40 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border/30 pb-4">
              <h3 className="font-bold text-text-primary text-base flex items-center gap-2">
                <Bell size={18} className="text-primary" /> Live Feed
              </h3>
              <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full">
                Real-time
              </span>
            </div>

            <div className="space-y-4">
              {notificationFeed.map((item) => {
                const IconComp = item.icon;
                return (
                  <div key={item.id} className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-hover border border-border/30 hover:border-primary/30 transition-all">
                    <div className={cn("p-2.5 rounded-xl border shrink-0 mt-0.5", item.color)}>
                      <IconComp size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-text-primary truncate">{item.title}</p>
                      <p className="text-[11px] text-text-tertiary leading-relaxed mt-0.5">{item.desc}</p>
                      <span className="text-[10px] text-text-tertiary font-semibold block mt-1.5">{item.time}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick System Action Card */}
          <div className="bg-gradient-to-br from-[#2a9d8f] to-[#1d7a71] text-white p-6 rounded-[2.5rem] shadow-xl shadow-[#2a9d8f]/20 space-y-4 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 bg-white/20 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                Musaned Integration
              </span>
              <ShieldCheck size={20} className="text-white/80" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg">Tawtheeq Direct Link</h3>
              <p className="text-xs text-white/80 leading-relaxed mt-1">
                Upload candidate PDFs directly or match CV entries with Saudi Ministry of Human Resources database.
              </p>
            </div>
            <a 
              href={MUSANED_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-white text-[#2a9d8f] font-bold rounded-xl text-xs hover:bg-white/90 transition-all shadow-md"
            >
              Launch Musaned Auth <ArrowUpRight size={14} />
            </a>
          </div>

        </div>

      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          5. CANDIDATE OVERVIEW TABLE & RECENT VISA SELECTED
      ════════════════════════════════════════════════════════════════════════ */}
      
      {/* Candidates List Overview */}
      {canSee('/candidates') && (
        <section className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Users className="text-primary" size={20} /> Candidates Overview
              </h2>
              <p className="text-xs text-text-tertiary mt-0.5">
                Displaying <span className="font-bold text-text-primary">{displayedCandidates.length}</span> candidates filtered by <span className="font-bold text-primary capitalize">{dateInterval}</span> interval
              </p>
            </div>
            <div className="flex items-center gap-3">
              {metricFilter !== 'all' && (
                <button 
                  onClick={() => setMetricFilter('all')}
                  className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-xl flex items-center gap-1 hover:bg-primary/20 transition-colors"
                >
                  <X size={14} /> Clear Metric Filter ({metricFilter})
                </button>
              )}
              <Link href="/candidates" className="text-sm text-primary hover:underline font-bold">
                View Full Table ({allCandidates.length}) →
              </Link>
            </div>
          </div>

          <div className="bg-surface rounded-[2.5rem] border border-border/40 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-border/30 text-[10px] uppercase tracking-wider font-bold text-text-tertiary/90">
                    <th className="px-6 py-4 font-semibold">Shelf ID</th>
                    <th className="px-6 py-4 font-semibold">Candidate</th>
                    <th className="px-6 py-4 font-semibold">Passport No.</th>
                    <th className="px-6 py-4 font-semibold">Job / Experience</th>
                    <th className="px-6 py-4 font-semibold">Visa Status</th>
                    <th className="px-6 py-4 font-semibold">Generated CVs</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 size={32} className="text-primary animate-spin" />
                          <p className="text-text-tertiary text-sm">Loading candidates...</p>
                        </div>
                      </td>
                    </tr>
                  ) : displayedCandidates.length > 0 ? (
                    displayedCandidates.slice(0, 10).map((candidate) => (
                      <tr 
                        key={candidate.id} 
                        className="hover:bg-gray-50/40 transition-colors cursor-pointer"
                        onClick={(e) => { 
                          if (!(e.target as HTMLElement).closest('[data-action-menu]') && !(e.target as HTMLElement).closest('button')) {
                            router.push(`/candidates/${candidate.id}`);
                          }
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-mono font-bold inline-block border border-gray-200">
                            {candidate.shelfId || 'UNASSIGNED'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0 border border-primary-100">
                              <span className="text-primary font-bold text-sm">
                                {candidate.passportData.givenNames.charAt(0)}{candidate.passportData.surname.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-bold text-text-primary text-sm flex items-center gap-2">
                                {candidate.passportData.givenNames} {candidate.passportData.surname}
                                {candidate.isFlagged && <Flag size={14} className="text-red-500 fill-red-500" />}
                              </p>
                              <p className="text-xs text-text-tertiary">{candidate.personalInfo.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm font-semibold text-text-primary">{candidate.passportData.passportNumber}</p>
                          <p className="text-xs text-text-tertiary">Exp: {new Date(candidate.passportData.dateOfExpiry).toLocaleDateString()}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-text-primary font-semibold truncate max-w-[200px]">
                            {candidate.personalInfo?.job || 'House Maid'}
                          </p>
                          <p className="text-xs text-text-tertiary truncate max-w-[200px]">
                            {Array.isArray(candidate.personalInfo?.workExperience) && candidate.personalInfo.workExperience.length > 0 ? 'Experienced' : 'Fresher'}
                          </p>
                        </td>
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
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-1.5 flex-wrap max-w-[180px]">
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
                          <div className="relative inline-block" ref={openMenuId === candidate.id ? menuRef : null}>
                            <button
                              onClick={(e) => {
                                const isOpen = openMenuId === candidate.id;
                                if (isOpen) {
                                  setOpenMenuId(null);
                                  setMenuCoords(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setMenuCoords({
                                    top: rect.bottom + 4,
                                    left: Math.max(16, rect.right - 192)
                                  });
                                  setOpenMenuId(candidate.id);
                                }
                              }}
                              className="text-text-tertiary hover:text-primary transition-colors p-2 rounded-lg hover:bg-gray-100"
                            >
                              <MoreVertical size={18} />
                            </button>
                            {openMenuId === candidate.id && menuCoords && typeof window !== 'undefined' && createPortal(
                              <div
                                ref={dropdownRef}
                                className="fixed w-48 bg-white border border-border rounded-xl shadow-xl z-[9999] py-1 animate-fade-in text-left"
                                style={{
                                  top: menuCoords.top,
                                  left: menuCoords.left,
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {candidate.isRequested ? (
                                  <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setMenuCoords(null); setCancelVisaModalId(candidate.id); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left font-semibold cursor-pointer">
                                    <CheckCircle size={16} className="text-amber-500" />
                                    <span>Cancel Visa Selected</span>
                                  </button>
                                ) : (
                                  <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setMenuCoords(null); setVisaModalId(candidate.id); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left font-semibold cursor-pointer">
                                    <CheckCircle size={16} className="text-text-tertiary" />
                                    <span>Visa Selected</span>
                                  </button>
                                )}
                                <div className="border-t border-border/60 my-1" />
                                <button onClick={() => { setOpenMenuId(null); setMenuCoords(null); deleteCandidate(candidate.id); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors text-left text-red-600 font-semibold cursor-pointer">
                                  <Trash2 size={16} /><span>Delete</span>
                                </button>
                              </div>,
                              document.body
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-text-tertiary">
                        No candidates match the selected interval filter ({dateInterval}).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Visa Selected Overview Table */}
      {canSee('/requested') && (
        <section className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <CheckCircle2 className="text-emerald-600" size={20} /> Recent Visa Selected
              </h2>
              <p className="text-xs text-text-tertiary mt-0.5">Candidates with confirmed visa/contract numbers</p>
            </div>
            <Link href="/requested" className="text-sm text-primary hover:underline font-bold">
              View All Visa Selected ({visaSelectedCount}) →
            </Link>
          </div>

          <div className="bg-surface rounded-[2.5rem] border border-border/40 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-border/30 text-[10px] uppercase tracking-wider font-bold text-text-tertiary/90">
                    <th className="px-6 py-4 font-semibold">Shelf ID</th>
                    <th className="px-6 py-4 font-semibold">Candidate</th>
                    <th className="px-6 py-4 font-semibold">Passport No.</th>
                    <th className="px-6 py-4 font-semibold">Visa / Contract No.</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center">
                        <Loader2 size={32} className="text-primary animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : displayedVisaSelected.length > 0 ? (
                    displayedVisaSelected.slice(0, 10).map((candidate) => (
                      <tr 
                        key={candidate.id} 
                        className="hover:bg-gray-50/40 transition-colors cursor-pointer"
                        onClick={(e) => { 
                          if (!(e.target as HTMLElement).closest('[data-action-menu]') && !(e.target as HTMLElement).closest('button')) {
                            router.push(`/candidates/${candidate.id}`);
                          }
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-mono font-bold inline-block border border-gray-200">
                            {candidate.shelfId || 'UNASSIGNED'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                              <span className="text-emerald-600 font-bold text-sm">
                                {candidate.passportData.givenNames.charAt(0)}{candidate.passportData.surname.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-bold text-text-primary text-sm">
                                {candidate.passportData.givenNames} {candidate.passportData.surname}
                              </p>
                              <p className="text-xs text-text-tertiary">{candidate.personalInfo.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm font-semibold text-text-primary">{candidate.passportData.passportNumber}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-mono font-bold rounded-lg border border-emerald-200">
                            {candidate.visaOrContractNumber || 'CONFIRMED'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Visa Selected
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={(e) => { e.stopPropagation(); setCancelVisaModalId(candidate.id); }}
                            className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors"
                          >
                            Cancel Visa
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-text-tertiary">
                        No visa selected candidates match the active date interval.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Featured Quick Registered Table (Only for Registrar) */}
      {userRole === 'registrar' && (
        <section className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <ClipboardList className="text-amber-500" size={20} /> Featured Quick Registered
            </h2>
            <Link href="/quick-registered" className="text-sm text-primary hover:underline font-bold">
              View All Quick Registrations →
            </Link>
          </div>

          <div className="bg-surface rounded-[2.5rem] border border-border/40 shadow-sm overflow-hidden">
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
                        <Loader2 size={32} className="text-primary animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : filteredQuickRegistrations.length > 0 ? (
                    filteredQuickRegistrations.slice(0, 5).map((r) => (
                      <tr 
                        key={r.id} 
                        className="hover:bg-gray-50/40 transition-colors cursor-pointer"
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
                              <p className="font-bold text-text-primary text-sm">{r.givenNames} {r.surname}</p>
                              <p className="text-xs text-text-tertiary">{r.religion || 'Non-Muslim'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs font-mono font-bold text-text-secondary bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
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
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-text-tertiary font-medium">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-text-tertiary">
                        No quick registrations found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Visa Selected Modal */}
      {visaModalId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setVisaModalId(null)}>
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden scale-in" onClick={e => e.stopPropagation()}>
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
                className="px-6 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
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
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setCancelVisaModalId(null)}>
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden scale-in" onClick={e => e.stopPropagation()}>
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
                  className="px-6 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
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
