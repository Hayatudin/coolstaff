'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { 
  Users, Search, Folder, ArrowLeft,
  Award, Clock, ArrowUpRight, 
  Lock, Unlock, MoreVertical, ArrowRightLeft, Trash2, X, ChevronRight
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Broker, Leader } from '@/types';
import { useSession } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

export default function LeaderBrokersPage() {
  const params = useParams();
  const router = useRouter();
  const leaderId = params.id as string;
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAuthorized = role === 'super_admin' || role === 'accountant';

  const [leader, setLeader] = useState<Leader | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Action menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Move modal state (moving candidates between brokers)
  const [moveTarget, setMoveTarget] = useState<Broker | null>(null);
  const [selectedTargetBrokerId, setSelectedTargetBrokerId] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  const [brokerSearchQuery, setBrokerSearchQuery] = useState('');

  // Move Broker to Leader modal state
  const [moveBrokerTarget, setMoveBrokerTarget] = useState<Broker | null>(null);
  const [selectedLeaderId, setSelectedLeaderId] = useState('');
  const [isMovingBroker, setIsMovingBroker] = useState(false);
  const [leaderSearchQuery, setLeaderSearchQuery] = useState('');

  // Delete broker modal state
  const [deleteTarget, setDeleteTarget] = useState<Broker | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [leadersRes, brokersRes] = await Promise.all([
        api('/api/leaders', { cache: 'no-store' }),
        api('/api/brokers', { cache: 'no-store' })
      ]);
      const leadersData = await leadersRes.json();
      const brokersData = await brokersRes.json();
      
      if (Array.isArray(leadersData)) {
        setLeaders(leadersData);
        const match = leadersData.find((l: Leader) => l.id === leaderId);
        setLeader(match || null);
      }
      if (Array.isArray(brokersData)) {
        setBrokers(brokersData);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [leaderId]);

  // ─── Action: Move Candidates (Between Brokers) ────────────────────────
  const handleMoveCandidates = async () => {
    if (!moveTarget || !selectedTargetBrokerId) return;
    try {
      setIsMoving(true);
      await api(`/api/brokers/${moveTarget.id}/move-candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetBrokerId: selectedTargetBrokerId }),
      });
      setMoveTarget(null);
      setSelectedTargetBrokerId('');
      setBrokerSearchQuery('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to move candidates');
    } finally {
      setIsMoving(false);
    }
  };

  // ─── Action: Move Broker to Leader ──────────────────────────────────
  const handleMoveBrokerToLeader = async () => {
    if (!moveBrokerTarget) return;
    try {
      setIsMovingBroker(true);
      const res = await api(`/api/brokers/${moveBrokerTarget.id}/leader`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaderId: selectedLeaderId || null }),
      });
      if (res.ok) {
        setMoveBrokerTarget(null);
        setSelectedLeaderId('');
        setLeaderSearchQuery('');
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to move broker to leader');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to move broker to leader');
    } finally {
      setIsMovingBroker(false);
    }
  };

  // ─── Action: Toggle Lock ──────────────────────────────────────────
  const handleToggleLock = async (broker: Broker) => {
    try {
      const res = await api(`/api/brokers/${broker.id}/toggle-lock`, {
        method: 'PATCH',
      });
      const updated = await res.json();
      setBrokers(prev => prev.map(b => b.id === broker.id ? { ...b, isLocked: updated.isLocked } : b));
      fetchData();
    } catch (err: any) {
      console.error('Failed to toggle lock:', err);
      alert(err.message || 'Failed to toggle lock');
    }
  };

  // ─── Action: Delete Broker ────────────────────────────────────────
  const handleDeleteBroker = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await api(`/api/brokers/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete broker');
    } finally {
      setIsDeleting(false);
    }
  };

  const currentLeaderBrokers = leader?.brokers || [];
  const filteredBrokers = currentLeaderBrokers.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCandidates = currentLeaderBrokers.reduce((sum, b) => sum + (b._count?.candidates || 0), 0);

  // Render a single Broker Card (used across lists/grids)
  const renderBrokerCard = (broker: Broker) => {
    return (
      <div
        key={broker.id}
        onClick={() => router.push(`/brokers/${broker.id}/candidates`)}
        className={cn(
          "group bg-surface rounded-[2rem] border p-6 transition-all duration-500 cursor-pointer relative overflow-hidden flex flex-col min-h-[220px]",
          broker.isLocked
            ? "border-red-300 hover:border-red-400 bg-red-50/5 hover:shadow-red-500/5"
            : "border-border/50 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5"
        )}
      >
        {/* Background accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full translate-x-10 -translate-y-10 group-hover:translate-x-5 group-hover:-translate-y-5 transition-transform duration-700" />

        <div className="flex justify-between items-start mb-6 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-primary border border-primary/5 group-hover:scale-110 transition-transform duration-500">
            <span className="text-2xl font-black">{broker.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-2">
            {broker.isLocked && (
              <div className="bg-red-50 text-red-600 px-2 py-1 rounded-full border border-red-100/50 flex items-center gap-1">
                <Lock size={10} />
                <span className="text-[9px] font-bold uppercase tracking-wider">Locked</span>
              </div>
            )}

            {/* ───── Action Menu Button ───── */}
            {isAuthorized && (
              <div className="relative" ref={openMenuId === broker.id ? menuRef : null}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === broker.id ? null : broker.id);
                  }}
                  className="p-1.5 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200/50 hover:text-gray-700 transition-colors z-20 shrink-0 cursor-pointer"
                  title="Actions"
                >
                  <MoreVertical size={14} />
                </button>

                {/* Dropdown Menu */}
                {openMenuId === broker.id && (
                  <div
                    className="absolute right-0 top-full mt-2 w-52 bg-surface border border-border/80 rounded-xl shadow-2xl z-50 py-1.5 animate-fade-in"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Move Candidates */}
                    <button
                      onClick={() => {
                        setOpenMenuId(null);
                        setMoveTarget(broker);
                        const firstOther = brokers.find(b => b.id !== broker.id);
                        setSelectedTargetBrokerId(firstOther?.id || '');
                      }}
                      disabled={(broker._count?.candidates || 0) === 0}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left",
                        (broker._count?.candidates || 0) === 0
                          ? "text-text-tertiary/50 cursor-not-allowed"
                          : "text-text-primary hover:bg-primary/5 hover:text-primary cursor-pointer"
                      )}
                    >
                      <ArrowRightLeft size={16} />
                      <div>
                        <p>Move Candidates</p>
                        <p className="text-[10px] font-normal text-text-tertiary">{broker._count?.candidates || 0} candidate(s)</p>
                      </div>
                    </button>

                    <div className="border-t border-border/40 my-1" />

                    {/* Assign Leader */}
                    <button
                      onClick={() => {
                        setOpenMenuId(null);
                        setMoveBrokerTarget(broker);
                        setSelectedLeaderId(broker.leaderId || '');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-primary/5 hover:text-primary transition-colors text-left cursor-pointer"
                    >
                      <Folder size={16} className="text-lime-500 shrink-0" />
                      <div>
                        <p>Assign Leader</p>
                        <p className="text-[10px] font-normal text-text-tertiary">
                          {broker.leader ? `Leader: ${broker.leader.name}` : 'Unassigned'}
                        </p>
                      </div>
                    </button>

                    <div className="border-t border-border/40 my-1" />

                    {/* Lock / Unlock */}
                    <button
                      onClick={() => {
                        setOpenMenuId(null);
                        handleToggleLock(broker);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-amber-50 hover:text-amber-700 transition-colors text-left cursor-pointer"
                    >
                      {broker.isLocked ? <Unlock size={16} /> : <Lock size={16} />}
                      <div>
                        <p>{broker.isLocked ? 'Unlock Broker' : 'Lock Broker'}</p>
                        <p className="text-[10px] font-normal text-text-tertiary">
                          {broker.isLocked ? 'Restore CVs from backup' : 'Hide CVs to backup'}
                        </p>
                      </div>
                    </button>

                    <div className="border-t border-border/40 my-1" />

                    {/* Delete */}
                    <button
                      onClick={() => {
                        setOpenMenuId(null);
                        setDeleteTarget(broker);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
                    >
                      <Trash2 size={16} />
                      <div>
                        <p>Delete Broker</p>
                        <p className="text-[10px] font-normal text-red-400">Permanently remove</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 relative z-10">
          <h3 className="text-xl font-bold text-text-primary group-hover:text-primary transition-colors duration-300 mb-2">{broker.name}</h3>
          <div className="flex flex-col gap-1 text-text-tertiary">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Clock size={14} />
                <span className="text-xs font-medium">Est. {new Date(broker.createdAt).getFullYear()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Award size={14} className="text-amber-500" />
                <span className="text-xs font-medium">Partner</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-end justify-between relative z-10">
          <div>
            <p className="text-[10px] text-text-tertiary uppercase font-black tracking-tighter mb-1">Impact score</p>
            <p className="text-3xl font-black text-text-primary leading-none tabular-nums">
              {broker._count?.candidates || 0}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
            <ArrowUpRight size={20} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* ───── Header Section ───── */}
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
              <span className="text-primary/60">Leader details</span>
            </nav>
            <h1 className="text-4xl font-black text-text-primary tracking-tight flex items-center gap-3">
              {leader?.name || 'Leader Network'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-primary/5 border border-primary/10 rounded-[2rem] px-6 py-4">
          <div className="text-right">
            <p className="text-[10px] text-primary/60 uppercase font-black tracking-widest leading-none font-bold">Total Network Candidates</p>
            <p className="text-2xl font-black text-primary leading-none mt-1">{totalCandidates}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Users size={20} />
          </div>
        </div>
      </div>

      {/* ───── Action Bar ───── */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search leader's brokers..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 h-12 bg-surface border border-border/50 rounded-2xl text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
        </div>
      </div>

      {/* ───── Brokers Grid ───── */}
      <div className="space-y-12 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 bg-surface rounded-[2rem] border border-border animate-pulse" />
            ))
          ) : filteredBrokers.length > 0 ? (
            filteredBrokers.map(broker => renderBrokerCard(broker))
          ) : (
            <div className="col-span-full py-16 text-center bg-surface border border-dashed border-border rounded-[2rem]">
              <Folder size={32} className="mx-auto text-text-tertiary opacity-30 mb-3" />
              <h4 className="text-lg font-bold text-text-primary">No Brokers Found</h4>
              <p className="text-xs text-text-tertiary max-w-xs mx-auto mt-1">Assign brokers to this leader on the main network page.</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ Move Candidates Modal ═══════════ */}
      {moveTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-border/80 rounded-[2rem] w-full max-w-md shadow-2xl p-8 relative animate-scale-in">
            <button
              onClick={() => { setMoveTarget(null); setSelectedTargetBrokerId(''); setBrokerSearchQuery(''); }}
              className="absolute right-6 top-6 text-text-tertiary hover:text-text-primary hover:bg-border/50 p-2 rounded-xl transition-all cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 shrink-0">
                <ArrowRightLeft size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-primary">Move Candidates</h3>
                <p className="text-sm text-text-tertiary mt-1">
                  Move all <span className="font-semibold text-text-primary">{moveTarget._count?.candidates || 0} candidate(s)</span> from <span className="font-semibold text-text-primary">"{moveTarget.name}"</span> to another broker.
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <label className="block text-xs uppercase tracking-wider font-bold text-text-tertiary">
                Select Destination Broker:
              </label>

              {/* Search input for brokers */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search destination broker..."
                  value={brokerSearchQuery}
                  onChange={e => setBrokerSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 h-10 bg-surface border border-border/50 rounded-xl text-xs text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                />
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {brokers
                  .filter(b => b.id !== moveTarget.id)
                  .filter(b => b.name.toLowerCase().includes(brokerSearchQuery.toLowerCase()))
                  .map(otherBroker => (
                    <label
                      key={otherBroker.id}
                      className={cn(
                        "flex items-center gap-3 p-4 border rounded-2xl transition-all cursor-pointer",
                        selectedTargetBrokerId === otherBroker.id
                          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                          : "border-border/50 hover:border-primary/30 bg-surface-hover/20"
                      )}
                    >
                      <input
                        type="radio"
                        name="targetBroker"
                        value={otherBroker.id}
                        checked={selectedTargetBrokerId === otherBroker.id}
                        onChange={() => setSelectedTargetBrokerId(otherBroker.id)}
                        className="w-4 h-4 text-primary border-border focus:ring-primary/20 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text-primary truncate">{otherBroker.name}</p>
                        <p className="text-[11px] text-text-tertiary">{otherBroker._count?.candidates || 0} existing candidate(s)</p>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary text-sm font-black shrink-0">
                        {otherBroker.name.charAt(0).toUpperCase()}
                      </div>
                    </label>
                  ))}
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => { setMoveTarget(null); setSelectedTargetBrokerId(''); setBrokerSearchQuery(''); }}
                className="flex-1 h-12 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleMoveCandidates}
                loading={isMoving}
                disabled={!selectedTargetBrokerId}
                className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/15"
              >
                Move All Candidates
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ Move Broker to Leader Modal ═══════════ */}
      {moveBrokerTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-border/80 rounded-[2rem] w-full max-w-md shadow-2xl p-8 relative animate-scale-in">
            <button
              onClick={() => { setMoveBrokerTarget(null); setSelectedLeaderId(''); setLeaderSearchQuery(''); }}
              className="absolute right-6 top-6 text-text-tertiary hover:text-text-primary hover:bg-border/50 p-2 rounded-xl transition-all cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-600 shrink-0">
                <Folder size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-primary">Assign Leader</h3>
                <p className="text-sm text-text-tertiary mt-1">
                  Assign broker <span className="font-semibold text-text-primary">"{moveBrokerTarget.name}"</span> to a leader.
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <label className="block text-xs uppercase tracking-wider font-bold text-text-tertiary">
                Select Leader:
              </label>

              {/* Search input for leaders */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search leaders..."
                  value={leaderSearchQuery}
                  onChange={e => setLeaderSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 h-10 bg-surface border border-border/50 rounded-xl text-xs text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                />
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {/* Independent / None Option */}
                <label
                  className={cn(
                    "flex items-center gap-3 p-4 border rounded-2xl transition-all cursor-pointer",
                    selectedLeaderId === ''
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/50 hover:border-primary/30 bg-surface-hover/20"
                  )}
                >
                  <input
                    type="radio"
                    name="targetLeader"
                    value=""
                    checked={selectedLeaderId === ''}
                    onChange={() => setSelectedLeaderId('')}
                    className="w-4 h-4 text-primary border-border focus:ring-primary/20 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-primary">Independent (No Leader)</p>
                    <p className="text-[11px] text-text-tertiary">Assign broker without any parent leader group</p>
                  </div>
                </label>

                {/* Leaders list */}
                {leaders
                  .filter(l => l.name.toLowerCase().includes(leaderSearchQuery.toLowerCase()))
                  .map(leaderItem => (
                    <label
                      key={leaderItem.id}
                      className={cn(
                        "flex items-center gap-3 p-4 border rounded-2xl transition-all cursor-pointer",
                        selectedLeaderId === leaderItem.id
                          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                          : "border-border/50 hover:border-primary/30 bg-surface-hover/20"
                      )}
                    >
                      <input
                        type="radio"
                        name="targetLeader"
                        value={leaderItem.id}
                        checked={selectedLeaderId === leaderItem.id}
                        onChange={() => setSelectedLeaderId(leaderItem.id)}
                        className="w-4 h-4 text-primary border-border focus:ring-primary/20 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text-primary truncate">{leaderItem.name}</p>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-lime-500/10 flex items-center justify-center text-lime-600 text-sm font-black shrink-0">
                        {leaderItem.name.charAt(0).toUpperCase()}
                      </div>
                    </label>
                  ))}
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => { setMoveBrokerTarget(null); setSelectedLeaderId(''); setLeaderSearchQuery(''); }}
                className="flex-1 h-12 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleMoveBrokerToLeader}
                loading={isMovingBroker}
                className="flex-1 h-12 rounded-xl bg-lime-600 hover:bg-lime-700 text-white shadow-lg shadow-lime-600/15 border-lime-600"
              >
                Assign Leader
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ Delete Confirmation Modal ═══════════ */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-border/80 rounded-[2rem] w-full max-w-md shadow-2xl p-8 relative animate-scale-in">
            <button
              onClick={() => setDeleteTarget(null)}
              className="absolute right-6 top-6 text-text-tertiary hover:text-text-primary hover:bg-border/50 p-2 rounded-xl transition-all cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-primary">Delete Broker</h3>
                <p className="text-sm text-text-tertiary mt-1">
                  Are you sure you want to delete <span className="font-semibold text-text-primary">"{deleteTarget.name}"</span>?
                </p>
              </div>
            </div>

            {(deleteTarget._count?.candidates || 0) > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 mb-6 flex gap-3">
                <Users className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-amber-800 font-medium leading-relaxed">
                  This broker has <span className="font-bold">{deleteTarget._count?.candidates || 0} candidate(s)</span>. They will be disconnected from this broker but remain in the system.
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-12 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteBroker}
                loading={isDeleting}
                className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/15"
              >
                Delete Broker
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
