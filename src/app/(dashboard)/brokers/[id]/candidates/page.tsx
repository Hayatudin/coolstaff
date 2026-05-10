'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Users, Loader2, Search, ArrowLeft, Calendar, FileText, User, 
  ChevronRight, Filter, Download, Trash2, Edit3, Briefcase, 
  MapPin, Phone, Mail, Clock, CheckCircle2, AlertCircle,
  MoreVertical, CheckCircle, Eye, CalendarDays
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Broker, Candidate } from '@/types';
import Badge from '@/components/ui/Badge';

type Interval = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

export default function BrokerCandidatesPage() {
  const params = useParams();
  const router = useRouter();
  const brokerId = params.id as string;

  const [broker, setBroker] = useState<Broker | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [interval, setInterval] = useState<Interval>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchBrokerData = async () => {
    try {
      setIsLoading(true);
      let url = `/api/brokers/${brokerId}/candidates?search=${searchQuery}&interval=${interval}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setBroker(data);
      setCandidates(data.candidates || []);
    } catch (err) {
      console.error('Failed to fetch broker candidates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBrokerData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, interval, brokerId, startDate, endDate]);

  const intervals: { label: string, value: Interval }[] = [
    { label: 'All Time', value: 'ALL' },
    { label: 'Today', value: '1D' },
    { label: 'Last Week', value: '1W' },
    { label: 'Last Month', value: '1M' },
    { label: 'Last Year', value: '1Y' },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12 max-w-7xl mx-auto px-4">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push('/brokers')}
            className="w-12 h-12 bg-surface border border-border/50 rounded-2xl flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <nav className="flex items-center gap-2 text-text-tertiary text-xs font-bold uppercase tracking-widest mb-1">
              <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => router.push('/brokers')}>Brokers</span>
              <ChevronRight size={12} />
              <span className="text-primary/60">Portfolio</span>
            </nav>
            <h1 className="text-4xl font-black text-text-primary tracking-tight">
              {broker?.name || 'Recruitment Source'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-primary/5 border border-primary/10 rounded-[2rem] px-6 py-4">
          <div className="text-right">
            <p className="text-[10px] text-primary/60 uppercase font-black tracking-widest leading-none">Total Candidates</p>
            <p className="text-2xl font-black text-primary leading-none mt-1">{candidates.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Users size={20} />
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-surface rounded-3xl border border-border/50 p-6 space-y-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 relative group">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-primary transition-colors" />
            <input 
              type="text"
              placeholder="Search within this portfolio..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 h-14 bg-gray-50/50 border border-border/50 rounded-2xl text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg font-medium"
            />
          </div>
          
          <div className="bg-gray-50/50 border border-border/50 rounded-2xl p-1.5 flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {intervals.map((item) => (
              <button
                key={item.value}
                onClick={() => {
                  setInterval(item.value);
                  setStartDate('');
                  setEndDate('');
                }}
                className={`px-6 py-3 rounded-xl text-xs font-black transition-all whitespace-nowrap uppercase tracking-widest ${
                  interval === item.value && !startDate && !endDate
                    ? 'bg-primary text-white ' 
                    : 'text-text-tertiary hover:bg-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-border/50">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => { setStartDate(e.target.value); setInterval('ALL'); }}
                  className="bg-gray-50/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm font-bold text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer hover:bg-white"
                />
              </div>
              <span className="text-text-tertiary font-black text-[10px] uppercase tracking-widest">to</span>
              <div className="relative">
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => { setEndDate(e.target.value); setInterval('ALL'); }}
                  className="bg-gray-50/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm font-bold text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer hover:bg-white"
                />
              </div>
            </div>
          </div>
          {(startDate || endDate || searchQuery) && (
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); setSearchQuery(''); setInterval('ALL'); }}
              className="px-4 py-2.5 rounded-xl text-[10px] font-black text-danger uppercase tracking-widest hover:bg-danger/5 transition-colors flex items-center gap-2 ml-auto border border-danger/10"
            >
              <Trash2 size={12} /> Clear All Filters
            </button>
          )}
        </div>
      </div>

      {/* Table Feed */}
      <div className="bg-surface rounded-[2.5rem] border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-border/50 text-[10px] uppercase tracking-[0.2em] text-text-tertiary font-black">
                <th className="px-8 py-6">Candidate Details</th>
                <th className="px-8 py-6">Passport Number</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6">Registered Date</th>
                <th className="px-8 py-6 text-right pr-12">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 size={40} className="text-primary animate-spin" />
                      <p className="text-text-tertiary font-bold uppercase tracking-widest text-[10px]">Syncing Portfolio...</p>
                    </div>
                  </td>
                </tr>
              ) : candidates.length > 0 ? (
                candidates.map((candidate: any) => (
                  <tr 
                    key={candidate.id} 
                    className="hover:bg-primary/[0.02] transition-all cursor-pointer group relative"
                    onClick={(e) => {
                      if (!(e.target as HTMLElement).closest('button')) {
                        router.push(`/candidates/${candidate.id}`);
                      }
                    }}
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-primary font-black text-sm border border-border group-hover:border-primary/30 group-hover:scale-105 transition-all duration-300 overflow-hidden">
                          {candidate.facePhotoUrl ? (
                            <img src={candidate.facePhotoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{candidate.givenNames.charAt(0)}{candidate.surname.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-text-primary text-base group-hover:text-primary transition-colors">{candidate.givenNames} {candidate.surname}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Briefcase size={10} className="text-primary/60" />
                            <p className="text-[10px] text-text-tertiary font-black uppercase tracking-wider">{candidate.job || 'Unassigned'}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono font-black text-text-secondary tracking-tight">{candidate.passportNumber}</span>
                        <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Primary Document</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <Badge variant={candidate.isRequested ? 'success' : 'warning'} className="rounded-lg px-3 py-1 text-[9px] font-black uppercase tracking-widest shadow-sm">
                        {candidate.isRequested ? '✓ Requested' : '○ Available'}
                      </Badge>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-text-secondary">
                          {new Date(candidate.registeredAt).toLocaleDateString(undefined, { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                        <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Entry Date</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right pr-12">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                        <button 
                          onClick={(e) => { e.stopPropagation(); router.push(`/candidates/${candidate.id}`); }}
                          className="p-2.5 rounded-xl bg-primary text-white hover:bg-primary-600 transition-all "
                          title="View Details"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center">
                    <div className="max-w-xs mx-auto">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-dashed border-border">
                        <Search size={32} className="text-text-tertiary opacity-20" />
                      </div>
                      <h3 className="text-xl font-bold text-text-primary mb-2">No Candidates Found</h3>
                      <p className="text-text-tertiary text-sm font-medium mb-8">We couldn't find any candidates in this portfolio matching your current search or date filters.</p>
                      <Button variant="outline" className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px]" onClick={() => { setSearchQuery(''); setInterval('ALL'); setStartDate(''); setEndDate(''); }}>
                        Reset All Filters
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
