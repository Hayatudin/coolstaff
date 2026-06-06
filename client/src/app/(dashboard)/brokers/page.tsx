'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { 
  Users, Loader2, Plus, Search, ChevronRight, Calendar, 
  TrendingUp, Award, Clock, ArrowUpRight, Trash2, X, AlertTriangle, CheckCircle2,
  Lock, Unlock
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Broker } from '@/types';
import { useSession } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

export default function BrokersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isSuperAdmin = role === 'super_admin';
  const isAuthorized = role === 'super_admin' || role === 'accountant';

  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newBrokerName, setNewBrokerName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<Broker | null>(null);
  const [reassignBrokerId, setReassignBrokerId] = useState<string>('none');
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchBrokers = async () => {
    try {
      setIsLoading(true);
      const res = await api('/api/brokers', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) {
        setBrokers(data);
      } else {
        console.error('API did not return an array:', data);
        setBrokers([]);
      }

    } catch (err) {
      console.error('Failed to fetch brokers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBrokers();
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
        fetchBrokers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add broker');
      }
    } catch (err) {
      alert('Failed to add broker');
    } finally {
      setIsAdding(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await api(`/api/brokers/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reassignBrokerId }),
      });
      if (res.ok) {
        setDeleteTarget(null);
        setReassignBrokerId('none');
        fetchBrokers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete broker');
      }
    } catch (err) {
      alert('An error occurred while deleting the broker');
    } finally {
      setIsDeleting(false);
    }
  };

  const safeBrokers = Array.isArray(brokers) ? brokers : [];

  const filteredBrokers = safeBrokers.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCandidates = safeBrokers.reduce((sum, b) => sum + (b._count?.candidates || 0), 0);
  const topBroker = [...safeBrokers].sort((a, b) => (b._count?.candidates || 0) - (a._count?.candidates || 0))[0];
  const hasCandidates = deleteTarget ? (deleteTarget._count?.candidates || 0) > 0 : false;


  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Premium Hero Section */}
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
        
        {/* Decorative elements */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-accent/20 rounded-full blur-[100px]" />
      </div>

      {/* Action Bar */}
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
        
        <Button 
          onClick={() => setShowAddForm(!showAddForm)}
          variant={showAddForm ? "outline" : "primary"}
          className="h-12 px-6 rounded-2xl shadow-lg shadow-primary/10 group"
        >
          {showAddForm ? 'Cancel' : (
            <span className="flex items-center gap-2">
              <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" /> 
              Register New Broker
            </span>
          )}
        </Button>
      </div>

      {/* Add Broker Form */}
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

      {/* Brokers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-surface rounded-[2rem] border border-border animate-pulse" />
          ))
        ) : filteredBrokers.length > 0 ? (
          filteredBrokers.map(broker => (
            <div 
              key={broker.id}
              onClick={() => router.push(`/brokers/${broker.id}/candidates`)}
              className={cn(
                "group bg-surface rounded-[2rem] border p-6 transition-all duration-500 cursor-pointer relative overflow-hidden flex flex-col",
                broker.isLocked
                  ? "border-red-300 hover:border-red-400 bg-red-50/5 hover:shadow-red-500/5"
                  : "border-border/50 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5"
              )}
            >
              {/* Background accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full translate-x-10 -translate-y-10 group-hover:translate-x-5 group-hover:-translate-y-5 transition-transform duration-700" />
              
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-primary border border-primary/5 group-hover:scale-110 transition-transform duration-500">
                  <span className="text-2xl font-black">{broker.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Verified</p>
                  </div>
                  
                  {isAuthorized ? (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
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
                      }}
                      className={cn(
                        "p-1.5 rounded-full transition-colors z-20 shrink-0 cursor-pointer border",
                        broker.isLocked
                          ? "bg-red-50 hover:bg-red-100 text-red-600 border-red-200/50 hover:text-red-700"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-500 border-gray-200/50 hover:text-gray-700"
                      )}
                      title={broker.isLocked ? "Unlock Partner" : "Lock Partner"}
                    >
                      {broker.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                  ) : broker.isLocked ? (
                    <div className="bg-red-50 text-red-600 px-2 py-1 rounded-full border border-red-100/50 flex items-center gap-1">
                      <Lock size={10} />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Locked</span>
                    </div>
                  ) : null}

                  {isSuperAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(broker);
                        setReassignBrokerId('none');
                      }}
                      className="p-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-100/50 hover:text-red-700 border-red-200/50 transition-colors z-20 shrink-0 cursor-pointer"
                      title="Delete Partner"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex-1 relative z-10">
                <h3 className="text-xl font-bold text-text-primary group-hover:text-primary transition-colors duration-300 mb-2">{broker.name}</h3>
                <div className="flex items-center gap-4 text-text-tertiary">
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
          ))
        ) : (
          <div className="col-span-full py-32 text-center">
            <div className="w-24 h-24 bg-surface rounded-[2rem] border border-dashed border-border flex items-center justify-center mx-auto mb-6">
              <Users size={32} className="text-text-tertiary opacity-30" />
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-2">Network is Empty</h3>
            <p className="text-text-tertiary max-w-xs mx-auto">No partners registered in your recruitment network yet.</p>
          </div>
        )}
      </div>

      {/* Delete & Reassign Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-surface border border-border/80 rounded-[2rem] w-full max-w-lg shadow-2xl p-8 relative animate-scale-in">
            {/* Close Button */}
            <button 
              onClick={() => setDeleteTarget(null)}
              className="absolute right-6 top-6 text-text-tertiary hover:text-text-primary hover:bg-border/50 p-2 rounded-xl transition-all cursor-pointer"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-primary">Delete Broker Source</h3>
                <p className="text-sm text-text-tertiary mt-1">
                  You are about to delete <span className="font-semibold text-text-primary">"{deleteTarget.name}"</span>.
                </p>
              </div>
            </div>

            {/* Candidate Impact Alert */}
            {hasCandidates ? (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 mb-6 flex gap-3">
                <Users className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-amber-800 font-medium leading-relaxed">
                  This broker currently has <span className="font-bold">{deleteTarget._count?.candidates || 0} candidate(s)</span> linked to their account. Wiping this partner profile requires handling their registrations to ensure database integrity.
                </div>
              </div>
            ) : (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 mb-6 flex gap-3">
                <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-emerald-800 font-medium leading-relaxed">
                  This broker currently has <span className="font-bold">0 candidates</span> registered under them. You can safely proceed with deleting this profile directly without any reassignments.
                </div>
              </div>
            )}

            {/* Reassignment / Handling Selection */}
            <div className="space-y-4 mb-8">
              <label className="block text-xs uppercase tracking-wider font-bold text-text-tertiary">
                Choose Reassignment Strategy:
              </label>
              
              <div className="space-y-3">
                <label className={cn(
                  "flex items-center gap-3 p-4 border rounded-2xl transition-all",
                  hasCandidates 
                    ? "bg-surface-hover/30 border-border/60 cursor-pointer hover:border-primary/30" 
                    : "bg-border/20 border-border/30 opacity-50 cursor-not-allowed select-none"
                )}>
                  <input 
                    type="radio" 
                    name="reassignStrategy"
                    value="none"
                    checked={reassignBrokerId === 'none'}
                    onChange={() => setReassignBrokerId('none')}
                    className="w-4 h-4 text-primary border-border focus:ring-primary/20 cursor-pointer disabled:cursor-not-allowed"
                    disabled={!hasCandidates}
                  />
                  <div className="text-sm">
                    <p className="font-bold text-text-primary">Safe Disconnect</p>
                    <p className="text-xs text-text-tertiary mt-0.5">Disconnect candidates (Mark them as direct walk-in registrations)</p>
                  </div>
                </label>

                <label className={cn(
                  "flex items-center gap-3 p-4 border rounded-2xl transition-all",
                  hasCandidates && brokers.filter(b => b.id !== deleteTarget.id).length > 0
                    ? "bg-surface-hover/30 border-border/60 cursor-pointer hover:border-primary/30" 
                    : "bg-border/20 border-border/30 opacity-50 cursor-not-allowed select-none"
                )}>
                  <input 
                    type="radio" 
                    name="reassignStrategy"
                    value="reassign"
                    checked={reassignBrokerId !== 'none'}
                    onChange={() => {
                      const firstOther = brokers.find(b => b.id !== deleteTarget.id);
                      setReassignBrokerId(firstOther ? firstOther.id : 'none');
                    }}
                    className="w-4 h-4 text-primary border-border focus:ring-primary/20 cursor-pointer disabled:cursor-not-allowed"
                    disabled={!hasCandidates || brokers.filter(b => b.id !== deleteTarget.id).length === 0}
                  />
                  <div className="text-sm">
                    <p className="font-bold text-text-primary">Reassign & Merge Candidates</p>
                    <p className="text-xs text-text-tertiary mt-0.5">Transfer all candidates seamlessly to another active broker</p>
                  </div>
                </label>
              </div>

              {/* Nested broker dropdown when reassign is selected */}
              {reassignBrokerId !== 'none' && (
                <div className="pt-2 animate-slide-in-top">
                  <label className="block text-[11px] font-bold text-text-secondary mb-2">
                    Select Target Broker:
                  </label>
                  <select
                    value={reassignBrokerId}
                    onChange={(e) => setReassignBrokerId(e.target.value)}
                    className="w-full h-12 px-4 bg-surface border border-border rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                  >
                    {brokers
                      .filter(b => b.id !== deleteTarget.id)
                      .map(otherBroker => (
                        <option key={otherBroker.id} value={otherBroker.id}>
                          {otherBroker.name} ({otherBroker._count?.candidates || 0} active candidates)
                        </option>
                      ))
                    }
                  </select>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-12 rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmDelete}
                loading={isDeleting}
                className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/15"
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
