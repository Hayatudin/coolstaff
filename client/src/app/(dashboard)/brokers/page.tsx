'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { 
  Users, Plus, Search, Folder, FolderOpen,
  TrendingUp, Award, Clock, ArrowUpRight, 
  Lock, Unlock, MoreVertical, ArrowRightLeft, Trash2, X, Loader2
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Broker, Leader } from '@/types';
import { useSession } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

export default function BrokersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isSuperAdmin = role === 'super_admin';
  const isAuthorized = role === 'super_admin' || role === 'accountant';

  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLeadersLoading, setIsLeadersLoading] = useState(true);
  
  // Create forms visibility states
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddLeaderForm, setShowAddLeaderForm] = useState(false);
  
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingLeader, setIsAddingLeader] = useState(false);
  
  const [newBrokerName, setNewBrokerName] = useState('');
  const [newLeaderName, setNewLeaderName] = useState('');
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

  // Delete leader modal state
  const [deleteLeaderTarget, setDeleteLeaderTarget] = useState<Leader | null>(null);
  const [isDeletingLeader, setIsDeletingLeader] = useState(false);

  const [expandedLeaderId, setExpandedLeaderId] = useState<string | null>(null);

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

  const fetchBrokers = async () => {
    try {
      setIsLoading(true);
      const res = await api('/api/brokers', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) {
        setBrokers(data);
      } else {
        console.error('API did not return an array for brokers:', data);
        setBrokers([]);
      }
    } catch (err) {
      console.error('Failed to fetch brokers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeaders = async () => {
    try {
      setIsLeadersLoading(true);
      const res = await api('/api/leaders', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) {
        setLeaders(data);
      } else {
        console.error('API did not return an array for leaders:', data);
        setLeaders([]);
      }
    } catch (err) {
      console.error('Failed to fetch leaders:', err);
    } finally {
      setIsLeadersLoading(false);
    }
  };

  const fetchData = async () => {
    await Promise.all([fetchBrokers(), fetchLeaders()]);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddBroker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrokerName.trim()) return;
    try {
      setIsAdding(true);
      const res = await api('/api/brokers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBrokerName.trim() }),
      });
      if (res.ok) {
        setNewBrokerName('');
        setShowAddForm(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add broker');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add broker');
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddLeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeaderName.trim()) return;
    try {
      setIsAddingLeader(true);
      const res = await api('/api/leaders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLeaderName.trim() }),
      });
      if (res.ok) {
        setNewLeaderName('');
        setShowAddLeaderForm(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add leader');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add leader');
    } finally {
      setIsAddingLeader(false);
    }
  };

  // ─── Action: Move Candidates (Between Brokers) ────────────────────────
  const handleMoveCandidates = async () => {
    if (!moveTarget || !selectedTargetBrokerId) return;
    try {
      setIsMoving(true);
      const res = await api(`/api/brokers/${moveTarget.id}/move-candidates`, {
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

  // ─── Action: Delete Leader ────────────────────────────────────────
  const handleDeleteLeader = async () => {
    if (!deleteLeaderTarget) return;
    try {
      setIsDeletingLeader(true);
      await api(`/api/leaders/${deleteLeaderTarget.id}`, {
        method: 'DELETE',
      });
      setDeleteLeaderTarget(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete leader');
    } finally {
      setIsDeletingLeader(false);
    }
  };

  const safeBrokers = Array.isArray(brokers) ? brokers : [];
  const filteredBrokers = safeBrokers.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Filter leaders depending on matching brokers search
  const filteredLeaders = leaders.filter(l => {
    const nameMatches = l.name.toLowerCase().includes(searchQuery.toLowerCase());
    const hasMatchingBroker = l.brokers?.some(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return nameMatches || hasMatchingBroker;
  });

  const independentBrokers = filteredBrokers.filter(b => !b.leaderId);

  const totalCandidates = safeBrokers.reduce((sum, b) => sum + (b._count?.candidates || 0), 0);

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
                        const firstOther = safeBrokers.find(b => b.id !== broker.id);
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
            {broker.leader && (
              <div className="flex items-center gap-1.5 bg-lime-500/10 text-lime-600 dark:text-lime-400 px-2 py-0.5 rounded-full border border-lime-500/20 text-[10px] font-bold uppercase tracking-wider w-max mt-1">
                <Folder size={10} />
                Leader: {broker.leader.name}
              </div>
            )}
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
      {/* ───── Hero Section ───── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-sidebar-from to-sidebar-to rounded-[2rem] p-8 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2">Brokers Network</h1>
            <p className="text-white/60 text-lg max-w-md">Manage your candidate sources and optimize recruitment performance with real-time tracking.</p>
          </div>
          <div className="flex gap-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 min-w-[140px]">
              <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mb-1">Total Sources</p>
              <p className="text-3xl font-black">{brokers.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 min-w-[140px]">
              <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mb-1">Total Impact</p>
              <p className="text-3xl font-black">{totalCandidates}</p>
            </div>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-accent/20 rounded-full blur-[100px]" />
      </div>

      {/* ───── Action Bar ───── */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search broker network..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 h-12 bg-surface border border-border/50 rounded-2xl text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button
            onClick={() => {
              setShowAddLeaderForm(!showAddLeaderForm);
              setShowAddForm(false);
            }}
            variant={showAddLeaderForm ? "outline" : "secondary"}
            className="flex-1 md:flex-none h-12 px-6 rounded-2xl shadow-md group"
          >
            {showAddLeaderForm ? 'Cancel Leader' : (
              <span className="flex items-center gap-2">
                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300 text-lime-500" />
                Create Leader
              </span>
            )}
          </Button>
          <Button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setShowAddLeaderForm(false);
            }}
            variant={showAddForm ? "outline" : "primary"}
            className="flex-1 md:flex-none h-12 px-6 rounded-2xl shadow-lg shadow-primary/10 group"
          >
            {showAddForm ? 'Cancel' : (
              <span className="flex items-center gap-2">
                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                Register Broker
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* ───── Add Leader Form ───── */}
      {showAddLeaderForm && (
        <div className="bg-surface rounded-3xl border border-lime-500/20 shadow-xl p-8 animate-slide-in-top">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-lime-500/10 flex items-center justify-center">
              <Folder size={20} className="text-lime-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">Leader Registration</h2>
              <p className="text-sm text-text-tertiary">Create a new organizational leader to group brokers.</p>
            </div>
          </div>
          <form onSubmit={handleAddLeader} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Leader Name (e.g., John Doe)..."
                value={newLeaderName}
                onChange={e => setNewLeaderName(e.target.value)}
                required
                className="h-12 rounded-xl"
              />
            </div>
            <Button type="submit" loading={isAddingLeader} className="h-12 px-10 rounded-xl bg-lime-600 hover:bg-lime-700 text-white border-lime-600">
              Initialize Leader
            </Button>
          </form>
        </div>
      )}

      {/* ───── Add Broker Form ───── */}
      {showAddForm && (
        <div className="bg-surface rounded-3xl border border-primary/20 shadow-xl p-8 animate-slide-in-top">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">Source Registration</h2>
              <p className="text-sm text-text-tertiary">Expand your network by adding a new recruitment partner.</p>
            </div>
          </div>
          <form onSubmit={handleAddBroker} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Partner or Broker Name..."
                value={newBrokerName}
                onChange={e => setNewBrokerName(e.target.value)}
                required
                className="h-12 rounded-xl"
              />
            </div>
            <Button type="submit" loading={isAdding} className="h-12 px-10 rounded-xl">
              Initialize Partner
            </Button>
          </form>
        </div>
      )}

      {/* ───── Main View Grid (Grouped by Leaders Folders) ───── */}
      <div className="space-y-12 animate-fade-in">
        {/* Leaders Folders */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLeadersLoading || isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 bg-surface rounded-[2rem] border border-border animate-pulse mt-8" />
            ))
          ) : (
            <>
              {/* Leader Folders */}
              {filteredLeaders.map(leader => {
                const isExpanded = expandedLeaderId === leader.id;
                return (
                  <div key={leader.id} className="relative pt-10 group/folder flex flex-col">
                    {/* Folder Tab shape */}
                    <div 
                      onClick={() => setExpandedLeaderId(isExpanded ? null : leader.id)}
                      className={cn(
                        "absolute top-0 left-0 text-black rounded-t-[1.25rem] px-5 py-2.5 font-extrabold text-xs flex items-center gap-3 shadow-md z-10 cursor-pointer transition-all duration-300",
                        isExpanded
                          ? "bg-gradient-to-r from-lime-400 to-emerald-500 scale-105"
                          : "bg-gray-100 hover:bg-gray-200 border border-b-0 border-gray-300"
                      )}
                    >
                      {isExpanded ? <FolderOpen size={14} className="text-black shrink-0" /> : <Folder size={14} className="text-gray-700 shrink-0" />}
                      <span className="truncate max-w-[120px]">{leader.name}</span>
                      
                      {isAuthorized && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteLeaderTarget(leader);
                          }}
                          className="p-1 rounded-full hover:bg-black/10 text-black/60 hover:text-red-700 transition-colors ml-1 cursor-pointer"
                          title="Delete Leader"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    {/* Folder Top Line */}
                    <div className="absolute top-0 left-[180px] right-0 h-10 border-b border-border/50" />

                    {/* Folder Body */}
                    <div
                      onClick={() => setExpandedLeaderId(isExpanded ? null : leader.id)}
                      className={cn(
                        "bg-surface border border-border/50 rounded-b-[2rem] rounded-tr-[2rem] p-6 shadow-md transition-all duration-300 hover:shadow-xl hover:border-lime-400/30 flex flex-col justify-between cursor-pointer relative overflow-hidden flex-1 min-h-[160px]",
                        isExpanded && "ring-2 ring-lime-400/20 border-lime-400/30"
                      )}
                    >
                      {/* Background element */}
                      <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-primary/5 rounded-full blur-xl" />

                      <div className="space-y-3 relative z-10">
                        <h3 className="text-lg font-bold text-text-primary mt-2">{leader.name}</h3>
                        <p className="text-xs text-text-tertiary">Recruitment Leader Profile Group</p>
                      </div>

                      <div className="mt-8 flex justify-between items-end relative z-10 border-t border-border/30 pt-4">
                        <div>
                          <p className="text-[10px] text-text-tertiary uppercase font-black tracking-wider mb-1">Brokers</p>
                          <p className="text-2xl font-black text-text-primary leading-none tabular-nums">
                            {leader._count?.brokers || 0}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-text-tertiary uppercase font-black tracking-wider mb-1">Candidates</p>
                          <p className="text-2xl font-black text-lime-500 leading-none tabular-nums">
                            {leader.totalCandidates || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Independent Brokers Virtual Folder */}
              {independentBrokers.length > 0 && (
                <div key="independent-folder" className="relative pt-10 group/folder flex flex-col">
                  {/* Folder Tab shape */}
                  <div 
                    onClick={() => setExpandedLeaderId(expandedLeaderId === 'independent' ? null : 'independent')}
                    className={cn(
                      "absolute top-0 left-0 text-black rounded-t-[1.25rem] px-5 py-2.5 font-extrabold text-xs flex items-center gap-3 shadow-md z-10 cursor-pointer transition-all duration-300",
                      expandedLeaderId === 'independent'
                        ? "bg-gradient-to-r from-gray-400 to-slate-500 scale-105 text-white"
                        : "bg-gray-100 hover:bg-gray-200 border border-b-0 border-gray-300"
                    )}
                  >
                    {expandedLeaderId === 'independent' ? <FolderOpen size={14} className="text-white shrink-0" /> : <Folder size={14} className="text-gray-700 shrink-0" />}
                    <span className="truncate max-w-[120px]">Independent</span>
                  </div>
                  {/* Folder Top Line */}
                  <div className="absolute top-0 left-[180px] right-0 h-10 border-b border-border/50" />

                  {/* Folder Body */}
                  <div
                    onClick={() => setExpandedLeaderId(expandedLeaderId === 'independent' ? null : 'independent')}
                    className={cn(
                      "bg-surface border border-border/50 rounded-b-[2rem] rounded-tr-[2rem] p-6 shadow-md transition-all duration-300 hover:shadow-xl hover:border-slate-400/30 flex flex-col justify-between cursor-pointer relative overflow-hidden flex-1 min-h-[160px]",
                      expandedLeaderId === 'independent' && "ring-2 ring-slate-400/20 border-slate-400/30"
                    )}
                  >
                    <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-slate-500/5 rounded-full blur-xl" />

                    <div className="space-y-3 relative z-10">
                      <h3 className="text-lg font-bold text-text-primary mt-2">Independent Brokers</h3>
                      <p className="text-xs text-text-tertiary">Unassigned recruitment source group</p>
                    </div>

                    <div className="mt-8 flex justify-between items-end relative z-10 border-t border-border/30 pt-4">
                      <div>
                        <p className="text-[10px] text-text-tertiary uppercase font-black tracking-wider mb-1">Brokers</p>
                        <p className="text-2xl font-black text-text-primary leading-none tabular-nums">
                          {independentBrokers.length}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-text-tertiary uppercase font-black tracking-wider mb-1">Candidates</p>
                        <p className="text-2xl font-black text-slate-500 leading-none tabular-nums">
                          {independentBrokers.reduce((sum, b) => sum + (b._count?.candidates || 0), 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {filteredLeaders.length === 0 && independentBrokers.length === 0 && (
                <div className="col-span-full py-16 text-center bg-surface border border-dashed border-border rounded-[2rem]">
                  <Folder size={32} className="mx-auto text-text-tertiary opacity-30 mb-3" />
                  <h4 className="text-lg font-bold text-text-primary">No Leaders or Brokers Registered</h4>
                  <p className="text-xs text-text-tertiary max-w-xs mx-auto mt-1">Create a leader or register a broker above to build your network.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Expanded Leader/Independent Broker Grid */}
        {expandedLeaderId && (() => {
          if (expandedLeaderId === 'independent') {
            return (
              <div className="bg-gradient-to-b from-surface-hover/10 to-surface-hover/20 border border-border/80 rounded-[2rem] p-8 space-y-6 animate-fade-in">
                <div className="flex justify-between items-center border-b border-border/40 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-500 font-bold">
                      <FolderOpen size={20} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-text-primary">Independent Brokers</h4>
                      <p className="text-xs text-text-tertiary">{independentBrokers.length} broker(s) without a leader</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedLeaderId(null)}
                    className="text-xs font-semibold text-text-tertiary hover:text-text-primary cursor-pointer hover:bg-border/45 px-3 py-1.5 rounded-lg transition-all"
                  >
                    Close Folder
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {independentBrokers.length > 0 ? (
                    independentBrokers.map(broker => renderBrokerCard(broker))
                  ) : (
                    <div className="col-span-full py-12 text-center">
                      <p className="text-sm text-text-tertiary">No independent brokers.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          const selectedLeader = leaders.find(l => l.id === expandedLeaderId);
          if (!selectedLeader) return null;

          const leaderBrokers = filteredBrokers.filter(b => b.leaderId === expandedLeaderId);

          return (
            <div className="bg-gradient-to-b from-surface-hover/10 to-surface-hover/20 border border-border/80 rounded-[2rem] p-8 space-y-6 animate-fade-in">
              <div className="flex justify-between items-center border-b border-border/40 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-lime-500/10 flex items-center justify-center text-lime-500 font-bold">
                    <FolderOpen size={20} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-text-primary">{selectedLeader.name}'s Brokers</h4>
                    <p className="text-xs text-text-tertiary">{leaderBrokers.length} broker(s) under this leader</p>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedLeaderId(null)}
                  className="text-xs font-semibold text-text-tertiary hover:text-text-primary cursor-pointer hover:bg-border/45 px-3 py-1.5 rounded-lg transition-all"
                >
                  Close Folder
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {leaderBrokers.length > 0 ? (
                  leaderBrokers.map(broker => renderBrokerCard(broker))
                ) : (
                  <div className="col-span-full py-12 text-center">
                    <p className="text-sm text-text-tertiary">No brokers inside this leader yet.</p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
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
                {safeBrokers
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
              {safeBrokers.filter(b => b.id !== moveTarget.id).length === 0 && (
                <p className="text-sm text-text-tertiary text-center py-4">No other brokers available. Create another broker first.</p>
              )}
              {safeBrokers.filter(b => b.id !== moveTarget.id).length > 0 &&
               safeBrokers.filter(b => b.id !== moveTarget.id && b.name.toLowerCase().includes(brokerSearchQuery.toLowerCase())).length === 0 && (
                <p className="text-sm text-text-tertiary text-center py-4">No matching brokers found.</p>
              )}
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
                  Assign broker <span className="font-semibold text-text-primary">"{moveBrokerTarget.name}"</span> to a leader. All candidates under this broker will belong to that leader.
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
                  .map(leader => (
                    <label
                      key={leader.id}
                      className={cn(
                        "flex items-center gap-3 p-4 border rounded-2xl transition-all cursor-pointer",
                        selectedLeaderId === leader.id
                          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                          : "border-border/50 hover:border-primary/30 bg-surface-hover/20"
                      )}
                    >
                      <input
                        type="radio"
                        name="targetLeader"
                        value={leader.id}
                        checked={selectedLeaderId === leader.id}
                        onChange={() => setSelectedLeaderId(leader.id)}
                        className="w-4 h-4 text-primary border-border focus:ring-primary/20 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text-primary truncate">{leader.name}</p>
                        <p className="text-[11px] text-text-tertiary">
                          {leader._count?.brokers || 0} broker(s) & {leader.totalCandidates || 0} candidate(s)
                        </p>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-lime-500/10 flex items-center justify-center text-lime-600 text-sm font-black shrink-0">
                        {leader.name.charAt(0).toUpperCase()}
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

      {/* ═══════════ Delete Leader Confirmation Modal ═══════════ */}
      {deleteLeaderTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-border/80 rounded-[2rem] w-full max-w-md shadow-2xl p-8 relative animate-scale-in">
            <button
              onClick={() => setDeleteLeaderTarget(null)}
              className="absolute right-6 top-6 text-text-tertiary hover:text-text-primary hover:bg-border/50 p-2 rounded-xl transition-all cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-primary">Delete Leader</h3>
                <p className="text-sm text-text-tertiary mt-1">
                  Are you sure you want to delete leader <span className="font-semibold text-text-primary">"{deleteLeaderTarget.name}"</span>?
                </p>
              </div>
            </div>

            {(deleteLeaderTarget._count?.brokers || 0) > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 mb-6 flex gap-3">
                <Users className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-amber-800 font-medium leading-relaxed">
                  This leader has <span className="font-bold">{deleteLeaderTarget._count?.brokers || 0} broker(s)</span>. The brokers will be unassigned (become independent) but will NOT be deleted from the system.
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setDeleteLeaderTarget(null)}
                className="flex-1 h-12 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteLeader}
                loading={isDeletingLeader}
                className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/15"
              >
                Delete Leader
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
