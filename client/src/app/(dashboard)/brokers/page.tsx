'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { 
  Users, Loader2, Plus, Search, ChevronRight, Calendar, 
  TrendingUp, Award, Clock, ArrowUpRight 
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Broker } from '@/types';

export default function BrokersPage() {
  const router = useRouter();
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newBrokerName, setNewBrokerName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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

  const safeBrokers = Array.isArray(brokers) ? brokers : [];

  const filteredBrokers = safeBrokers.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCandidates = safeBrokers.reduce((sum, b) => sum + (b._count?.candidates || 0), 0);
  const topBroker = [...safeBrokers].sort((a, b) => (b._count?.candidates || 0) - (a._count?.candidates || 0))[0];


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
              className="group bg-surface rounded-[2rem] border border-border/50 p-6 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 cursor-pointer relative overflow-hidden flex flex-col"
            >
              {/* Background accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full translate-x-10 -translate-y-10 group-hover:translate-x-5 group-hover:-translate-y-5 transition-transform duration-700" />
              
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-primary border border-primary/5 group-hover:scale-110 transition-transform duration-500">
                  <span className="text-2xl font-black">{broker.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Verified</p>
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
    </div>
  );
}
