'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { 
  Users, Plus, Search, Folder, FolderOpen,
  TrendingUp, Award, Clock, ArrowUpRight, 
  Lock, Unlock, MoreVertical, ArrowRightLeft, Trash2, X, Loader2, Edit3, ArrowRight, LayoutTemplate, Check
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
  const canChangeTemplate = role === 'super_admin' || role === 'processor' || role === 'coordinator' || role === 'genaral';
  const canManageBrokers = role === 'super_admin' || role === 'accountant' || role === 'genaral';

  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [selectedBrokerForTemplate, setSelectedBrokerForTemplate] = useState<Broker | null>(null);
  const [isChangingTemplate, setIsChangingTemplate] = useState(false);

  const getBrokerTemplates = (broker: Broker) => {
    const templatesSet = new Set<string>();
    const safeCandidates = Array.isArray(broker.candidates) ? broker.candidates : [];
    safeCandidates.forEach((c: any) => {
      const safeCVs = Array.isArray(c.generatedCVs) ? c.generatedCVs : [];
      safeCVs.forEach((cv: any) => {
        if (cv.templateId) {
          const cleanId = cv.templateId.replace('tmpl-', '').toLowerCase();
          const templateObj = TEMPLATES.find(t => t.id === cleanId);
          if (templateObj) {
            templatesSet.add(templateObj.name);
          } else {
            templatesSet.add(cv.templateId.toUpperCase());
          }
        }
      });
    });
    return Array.from(templatesSet);
  };

  const handleConfirmChangeTemplate = async (newTemplateId: string) => {
    if (!selectedBrokerForTemplate) return;
    setIsChangingTemplate(true);
    try {
      const res = await api(`/api/brokers/${selectedBrokerForTemplate.id}/change-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: newTemplateId }),
      });
      if (res.ok) {
        setSelectedBrokerForTemplate(null);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to change template');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to change template');
    } finally {
      setIsChangingTemplate(false);
    }
  };
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
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
  const [deleteLeaderReason, setDeleteLeaderReason] = useState('');
  const [isDeletingLeader, setIsDeletingLeader] = useState(false);

  // Edit leader modal state
  const [editLeaderTarget, setEditLeaderTarget] = useState<Leader | null>(null);
  const [editLeaderName, setEditLeaderName] = useState('');
  const [isUpdatingLeader, setIsUpdatingLeader] = useState(false);

  const [expandedLeaderId, setExpandedLeaderId] = useState<string | null>(null);

  // Bulk Broker selection states
  const [selectedBrokerIds, setSelectedBrokerIds] = useState<string[]>([]);
  const [bulkTargetLeaderId, setBulkTargetLeaderId] = useState('');
  const [isBulkMoving, setIsBulkMoving] = useState(false);

  // Close menu when clicking outside, scrolling, or resizing
  useEffect(() => {
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

  // Keyboard navigation spelling search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.tagName === 'SELECT' ||
        activeEl.getAttribute('contenteditable') === 'true'
      )) {
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      if (e.key.length === 1 && /[a-zA-Z]/i.test(e.key)) {
        const char = e.key.toLowerCase();
        const targetBroker = brokers.find(b => b.name.trim().toLowerCase().startsWith(char));
        if (targetBroker) {
          const el = document.getElementById(`broker-card-${targetBroker.id}`) || 
                     document.getElementById(`broker-item-${targetBroker.id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-4', 'ring-primary/40');
            setTimeout(() => {
              el.classList.remove('ring-4', 'ring-primary/40');
            }, 1500);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [brokers]);

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

  // ─── Action: Move Multiple Brokers to Leader ───────────────────────
  const handleMoveSelectedBrokers = async () => {
    if (selectedBrokerIds.length === 0 || !bulkTargetLeaderId) return;
    try {
      setIsBulkMoving(true);
      const targetLeaderId = bulkTargetLeaderId === 'independent' ? null : bulkTargetLeaderId;
      const res = await api('/api/brokers/move-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brokerIds: selectedBrokerIds,
          leaderId: targetLeaderId,
        }),
      });
      if (res.ok) {
        setSelectedBrokerIds([]);
        setBulkTargetLeaderId('');
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to move brokers');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to move brokers');
    } finally {
      setIsBulkMoving(false);
    }
  };

  const toggleSelectBroker = (brokerId: string) => {
    setSelectedBrokerIds(prev =>
      prev.includes(brokerId) ? prev.filter(id => id !== brokerId) : [...prev, brokerId]
    );
  };

  const toggleSelectAllForLeader = (leaderId: string | null) => {
    const targetBrokers = brokers.filter(b => b.leaderId === leaderId);
    const targetIds = targetBrokers.map(b => b.id);
    const allSelected = targetIds.length > 0 && targetIds.every(id => selectedBrokerIds.includes(id));

    if (allSelected) {
      setSelectedBrokerIds(prev => prev.filter(id => !targetIds.includes(id)));
    } else {
      setSelectedBrokerIds(prev => {
        const newSelections = [...prev];
        targetIds.forEach(id => {
          if (!newSelections.includes(id)) newSelections.push(id);
        });
        return newSelections;
      });
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

  // ─── Action: Edit Leader ──────────────────────────────────────────
  const handleEditLeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLeaderTarget || !editLeaderName.trim()) return;
    try {
      setIsUpdatingLeader(true);
      const res = await api(`/api/leaders/${editLeaderTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editLeaderName.trim() }),
      });
      if (res.ok) {
        setEditLeaderTarget(null);
        setEditLeaderName('');
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update leader');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update leader');
    } finally {
      setIsUpdatingLeader(false);
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
        id={`broker-card-${broker.id}`}
        className={cn(
          "group bg-surface rounded-[2rem] border p-6 transition-all duration-500 relative flex flex-col min-h-[220px]",
          broker.isLocked
            ? "border-red-300 hover:border-red-400 bg-red-50/5 hover:shadow-red-500/5"
            : "border-border/50 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5",
          openMenuId === broker.id && "z-30"
        )}
      >
        {/* Background accent */}
        <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full translate-x-10 -translate-y-10 group-hover:translate-x-5 group-hover:-translate-y-5 transition-transform duration-700" />
        </div>

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
            {canManageBrokers && (
              <div className="relative" ref={openMenuId === broker.id ? menuRef : null}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const isOpen = openMenuId === broker.id;
                    if (isOpen) {
                      setOpenMenuId(null);
                      setMenuCoords(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMenuCoords({
                        top: rect.bottom + 8,
                        left: Math.max(16, rect.right - 208)
                      });
                      setOpenMenuId(broker.id);
                    }
                  }}
                  className="p-1.5 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200/50 hover:text-gray-700 transition-colors z-20 shrink-0 cursor-pointer"
                  title="Actions"
                >
                  <MoreVertical size={14} />
                </button>

                {/* Dropdown Menu using Portal */}
                {openMenuId === broker.id && menuCoords && typeof window !== 'undefined' && createPortal(
                  <div
                    ref={dropdownRef}
                    className="fixed w-52 bg-surface border border-border/80 rounded-xl shadow-2xl z-[9999] py-1.5 animate-fade-in"
                    style={{
                      top: menuCoords.top,
                      left: menuCoords.left,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Move Candidates */}
                    <button
                      onClick={() => {
                        setOpenMenuId(null);
                        setMenuCoords(null);
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

                    {isAuthorized && (
                      <>
                        <div className="border-t border-border/40 my-1" />

                        {/* Assign Leader */}
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            setMenuCoords(null);
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
                            setMenuCoords(null);
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
                            setMenuCoords(null);
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
                      </>
                    )}
                  </div>,
                  document.body
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

        {/* CV Templates Box */}
        <div className="mt-4 pt-3 border-t border-border/20 flex items-center justify-between relative z-10">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[10px] text-text-tertiary uppercase font-black tracking-widest">CV Templates</span>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {(() => {
                const templates = getBrokerTemplates(broker);
                if (templates.length > 0) {
                  return templates.map((t, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100/50 truncate max-w-[100px]"
                      title={t}
                    >
                      {t}
                    </span>
                  ));
                }
                return <span className="text-[11px] text-text-tertiary italic">No CVs</span>;
              })()}
            </div>
          </div>
          {canChangeTemplate && broker.candidates && broker.candidates.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedBrokerForTemplate(broker);
              }}
              className="p-1.5 text-primary hover:text-primary-dark hover:bg-primary/5 rounded-xl border border-primary/10 transition-all cursor-pointer shadow-sm shrink-0"
              title="Quick change CV template for all candidates"
            >
              <LayoutTemplate size={12} />
            </button>
          )}
        </div>

        <div className="mt-8 flex items-end justify-between relative z-10">
          <div>
            <p className="text-[10px] text-text-tertiary uppercase font-black tracking-tighter mb-1">Impact score</p>
            <p className="text-3xl font-black text-text-primary leading-none tabular-nums">
              {broker._count?.candidates || 0}
            </p>
          </div>
          <button
            onClick={() => router.push(`/brokers/${broker.id}/candidates`)}
            className="px-4 py-2 text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white border border-primary/20 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:shadow-primary/20"
          >
            Open
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    );
  };

  const renderNestedBrokersList = (leaderBrokers: Broker[], leaderId: string | null) => {
    return (
      <div 
        className="mt-6 border-t border-border/40 pt-4 space-y-4 w-full animate-fade-in relative z-20"
        onClick={e => e.stopPropagation()}
      >
        {/* Select All and Info */}
        <div className="flex items-center justify-between text-xs text-text-tertiary">
          <label className="flex items-center gap-2 cursor-pointer font-bold hover:text-text-primary transition-colors">
            <input
              type="checkbox"
              checked={leaderBrokers.length > 0 && leaderBrokers.every(b => selectedBrokerIds.includes(b.id))}
              onChange={() => toggleSelectAllForLeader(leaderId)}
              className="w-4 h-4 text-primary border-border rounded focus:ring-primary/20 cursor-pointer accent-primary"
            />
            Select All ({leaderBrokers.filter(b => selectedBrokerIds.includes(b.id)).length}/{leaderBrokers.length})
          </label>
          <span className="font-semibold">{leaderBrokers.length} broker(s)</span>
        </div>

        {/* Brokers List */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {leaderBrokers.map(broker => {
            const isSelected = selectedBrokerIds.includes(broker.id);
            return (
              <div
                key={broker.id}
                id={`broker-item-${broker.id}`}
                className={cn(
                  "interactive-broker flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 hover:bg-primary/5 hover:border-primary/20 group/broker",
                  isSelected ? "border-primary/30 bg-primary-50/10" : "border-border/40 bg-surface-hover/10"
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelectBroker(broker.id)}
                    className="w-4 h-4 text-primary border-border rounded focus:ring-primary/20 cursor-pointer accent-primary shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-text-primary group-hover/broker:text-primary transition-colors truncate">{broker.name}</p>
                      {broker.isLocked && (
                        <div className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full border border-red-100/50 flex items-center gap-0.5 shrink-0">
                          <Lock size={8} />
                          <span className="text-[7px] font-black uppercase tracking-wider">Locked</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-text-tertiary">{broker._count?.candidates || 0} candidate(s)</span>
                      {(() => {
                        const templates = getBrokerTemplates(broker);
                        if (templates.length > 0) {
                          return (
                            <>
                              <span className="text-[10px] text-text-tertiary">•</span>
                              <span className="text-[10px] text-indigo-600 font-bold truncate max-w-[120px]" title={templates.join(', ')}>
                                {templates.join(', ')}
                              </span>
                            </>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2 ml-2 shrink-0 relative-z-menu" onClick={(e) => e.stopPropagation()}>
                  {canChangeTemplate && broker.candidates && broker.candidates.length > 0 && (
                    <button
                      onClick={() => setSelectedBrokerForTemplate(broker)}
                      className="p-1.5 text-primary hover:text-primary-dark hover:bg-primary/5 rounded-xl border border-primary/10 transition-all cursor-pointer shadow-sm"
                      title="Quick change CV template for all candidates"
                    >
                      <LayoutTemplate size={12} />
                    </button>
                  )}
                  <button
                    onClick={() => router.push(`/brokers/${broker.id}/candidates`)}
                    className="px-3 py-1.5 text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white border border-primary/20 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-sm hover:shadow-primary/20"
                  >
                    Open
                    <ArrowRight size={10} />
                  </button>
                  {canManageBrokers && (
                    <div className="relative opacity-0 group-hover/broker:opacity-100 transition-opacity" ref={openMenuId === broker.id ? menuRef : null}>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === broker.id ? null : broker.id)}
                        className="p-1 rounded-lg hover:bg-black/5 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
                        title="Actions"
                      >
                        <MoreVertical size={14} />
                      </button>
                      {openMenuId === broker.id && (
                        <div className="absolute right-0 top-full mt-1 w-44 bg-surface border border-border/80 rounded-xl shadow-lg z-50 py-1.5 animate-fade-in text-left">
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
                              "w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-left transition-colors",
                              (broker._count?.candidates || 0) === 0
                                ? "text-text-tertiary/50 cursor-not-allowed"
                                : "text-text-primary hover:bg-primary/5 hover:text-primary cursor-pointer"
                            )}
                          >
                            <ArrowRightLeft size={12} />
                            Move Candidates
                          </button>

                          {isAuthorized && (
                            <>
                              <div className="border-t border-border/40 my-1" />
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setMoveBrokerTarget(broker);
                                  setSelectedLeaderId(broker.leaderId || '');
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-semibold text-text-primary hover:bg-primary/5 hover:text-primary flex items-center gap-2 cursor-pointer"
                              >
                                <Folder size={12} className="text-lime-500" />
                                Assign Leader
                              </button>

                              <div className="border-t border-border/40 my-1" />
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleToggleLock(broker);
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-semibold text-text-primary hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2 cursor-pointer"
                              >
                                {broker.isLocked ? <Unlock size={12} /> : <Lock size={12} />}
                                {broker.isLocked ? 'Unlock Broker' : 'Lock Broker'}
                              </button>

                              <div className="border-t border-border/40 my-1" />
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setDeleteTarget(broker);
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 size={12} />
                                Delete Broker
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {leaderBrokers.length === 0 && (
            <p className="text-xs text-text-tertiary italic text-center py-4">No brokers inside.</p>
          )}
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
        {/* Leaders Folders Section */}
        <div>
          <h2 className="text-xl font-black text-text-primary mb-6 flex items-center gap-2">
            <Folder className="text-lime-500" size={24} />
            Recruitment Leaders
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLeadersLoading || isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-48 bg-surface rounded-[2rem] border border-border animate-pulse" />
              ))
            ) : filteredLeaders.length > 0 ? (
              filteredLeaders.map(leader => {
                return (
                  <div key={leader.id} className="relative pt-10 group/folder flex flex-col">
                    {/* Folder Tab shape */}
                    <div 
                      className="absolute top-0 left-0 text-black rounded-t-[1.25rem] px-5 py-2.5 font-extrabold text-xs flex items-center gap-3 shadow-md z-10 transition-all duration-300 bg-gray-100 border border-b-0 border-gray-300"
                    >
                      <Folder size={14} className="text-gray-700 shrink-0" />
                      <span className="truncate max-w-[120px]">{leader.name}</span>
                      
                      {isAuthorized && (
                        <div className="flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditLeaderTarget(leader);
                              setEditLeaderName(leader.name);
                            }}
                            className="p-1 rounded-full hover:bg-black/10 text-black/60 hover:text-primary transition-colors cursor-pointer"
                            title="Edit Leader Name"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteLeaderReason('');
                              setDeleteLeaderTarget(leader);
                            }}
                            className="p-1 rounded-full hover:bg-black/10 text-black/60 hover:text-red-700 transition-colors cursor-pointer"
                            title="Delete Leader"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Folder Top Line */}
                    <div className="absolute top-0 left-[180px] right-0 h-10 border-b border-border/50" />

                    {/* Folder Body */}
                    <div
                      className="bg-surface border border-border/50 rounded-b-[2rem] rounded-tr-[2rem] p-6 shadow-md transition-all duration-300 hover:shadow-xl hover:border-lime-400/30 flex flex-col justify-between relative overflow-hidden w-full min-h-[160px] h-full"
                    >
                      {/* Background element */}
                      <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none" />

                      <div className="space-y-3 relative z-10 w-full">
                        <h3 className="text-lg font-bold text-text-primary mt-2">{leader.name}</h3>
                        <p className="text-xs text-text-tertiary">Recruitment Leader Profile Group</p>
                      </div>

                      <div className="mt-8 flex justify-between items-center relative z-10 border-t border-border/30 pt-4 w-full">
                        <div className="flex gap-6">
                          <div>
                            <p className="text-[10px] text-text-tertiary uppercase font-black tracking-wider mb-1">Brokers</p>
                            <p className="text-xl font-black text-text-primary leading-none tabular-nums">
                              {leader._count?.brokers || 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-text-tertiary uppercase font-black tracking-wider mb-1">Candidates</p>
                            <p className="text-xl font-black text-lime-500 leading-none tabular-nums">
                              {leader.totalCandidates || 0}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => router.push(`/brokers/leader/${leader.id}`)}
                          className="px-4 py-2 text-xs font-bold bg-lime-500/10 text-lime-600 hover:bg-lime-500 hover:text-white border border-lime-500/20 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:shadow-lime-500/20"
                        >
                          Open Group
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-12 text-center bg-surface border border-dashed border-border rounded-[2rem]">
                <Folder size={32} className="mx-auto text-text-tertiary opacity-30 mb-3" />
                <h4 className="text-sm font-bold text-text-primary">No Leaders Found</h4>
              </div>
            )}
          </div>
        </div>

        {/* Independent Brokers Section */}
        <div className="pt-6">
          <h2 className="text-xl font-black text-text-primary mb-6 flex items-center gap-2">
            <Users className="text-primary" size={24} />
            Independent Brokers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLeadersLoading || isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-48 bg-surface rounded-[2rem] border border-border animate-pulse" />
              ))
            ) : independentBrokers.length > 0 ? (
              independentBrokers.map(broker => renderBrokerCard(broker))
            ) : (
              <div className="col-span-full py-12 text-center bg-surface border border-dashed border-border rounded-[2rem]">
                <Users size={32} className="mx-auto text-text-tertiary opacity-30 mb-3" />
                <h4 className="text-sm font-bold text-text-primary">No Independent Brokers Found</h4>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════ Bulk Action Floating Bar ═══════════ */}
      {selectedBrokerIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface/90 backdrop-blur-md border border-primary/20 rounded-[2rem] shadow-2xl p-5 z-40 flex flex-col sm:flex-row items-center gap-4 animate-slide-in-bottom max-w-2xl w-[90%] sm:w-full">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-primary/10 text-primary font-black text-xs rounded-full">
              {selectedBrokerIds.length} Selected
            </div>
            <p className="text-sm font-bold text-text-primary">Brokers to Move</p>
          </div>
          <div className="flex-1 flex gap-3 w-full sm:w-auto">
            <select
              value={bulkTargetLeaderId}
              onChange={e => setBulkTargetLeaderId(e.target.value)}
              className="flex-1 h-11 px-4 text-xs font-semibold rounded-xl border border-border bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="" disabled>Select target leader...</option>
              <option value="independent">Independent (No Leader)</option>
              {leaders.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <Button
              onClick={handleMoveSelectedBrokers}
              loading={isBulkMoving}
              disabled={!bulkTargetLeaderId}
              className="h-11 text-xs px-6 bg-lime-600 hover:bg-lime-700 text-white rounded-xl border-lime-600 shadow-lg shadow-lime-600/15"
            >
              Move Bulk
            </Button>
          </div>
          <button
            onClick={() => setSelectedBrokerIds([])}
            className="text-xs text-text-tertiary hover:text-text-primary hover:underline font-bold transition-colors cursor-pointer"
          >
            Clear Selection
          </button>
        </div>
      )}

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
              onClick={() => { setDeleteLeaderTarget(null); setDeleteLeaderReason(''); }}
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

            <div className="space-y-2 mb-6">
              <label className="block text-xs uppercase tracking-wider font-bold text-text-tertiary">
                Reason for deletion:
              </label>
              <Input
                placeholder="Type reason for deleting leader..."
                value={deleteLeaderReason}
                onChange={e => setDeleteLeaderReason(e.target.value)}
                required
                className="h-10 rounded-xl"
              />
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => { setDeleteLeaderTarget(null); setDeleteLeaderReason(''); }}
                className="flex-1 h-12 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteLeader}
                loading={isDeletingLeader}
                disabled={!deleteLeaderReason.trim()}
                className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/15 disabled:opacity-50 disabled:cursor-not-allowed border-red-600"
              >
                Delete Leader
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* ═══════════ Edit Leader Modal ═══════════ */}
      {editLeaderTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-border/80 rounded-[2rem] w-full max-w-md shadow-2xl p-8 relative animate-scale-in">
            <button
              onClick={() => { setEditLeaderTarget(null); setEditLeaderName(''); }}
              className="absolute right-6 top-6 text-text-tertiary hover:text-text-primary hover:bg-border/50 p-2 rounded-xl transition-all cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Edit3 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-primary">Edit Leader</h3>
                <p className="text-sm text-text-tertiary mt-1">
                  Rename leader <span className="font-semibold text-text-primary">"{editLeaderTarget.name}"</span>.
                </p>
              </div>
            </div>

            <form onSubmit={handleEditLeader} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-wider font-bold text-text-tertiary">
                  New Leader Name:
                </label>
                <Input
                  placeholder="Type leader name..."
                  value={editLeaderName}
                  onChange={e => setEditLeaderName(e.target.value)}
                  required
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setEditLeaderTarget(null); setEditLeaderName(''); }}
                  className="flex-1 h-12 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={isUpdatingLeader}
                  disabled={!editLeaderName.trim() || editLeaderName.trim() === editLeaderTarget.name}
                  className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary-dark text-white shadow-lg border-primary"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedBrokerForTemplate && (
        <ChangeTemplateModal
          brokerName={selectedBrokerForTemplate.name}
          onChange={handleConfirmChangeTemplate}
          onClose={() => setSelectedBrokerForTemplate(null)}
          isLoading={isChangingTemplate}
        />
      )}
    </div>
  );
}

const TEMPLATES = [
  { id: 'ussus', name: 'USSUS' },
  { id: 'al-shablan', name: 'AL-Shablan' },
  { id: 'alm', name: 'ALAALAM' },
  { id: 'ka7', name: 'KAAFAAT' },
  { id: 'ku2', name: 'KHUZAM' },
  { id: 'ma', name: 'MA Standard' },
  { id: 'ra', name: 'RAYAAT' },
  { id: 'vision', name: 'Vision Layout' },
];

function ChangeTemplateModal({
  brokerName,
  onChange,
  onClose,
  isLoading,
}: {
  brokerName: string;
  onChange: (newTemplateId: string) => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && selected && !isLoading) {
        onChange(selected);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, isLoading, onChange]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Change Broker CV Template</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Select a new CV template for all candidates under broker <strong>"{brokerName}"</strong>
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 transition-colors text-text-tertiary hover:text-text-primary cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TEMPLATES.map(template => {
              const isSelected = selected === template.id;

              return (
                <button
                  key={template.id}
                  onClick={() => setSelected(template.id)}
                  className={cn(
                    'relative rounded-2xl border-2 overflow-hidden transition-all text-left flex flex-col cursor-pointer bg-white group p-4 min-h-[120px] justify-between',
                    isSelected
                      ? 'border-primary shadow-lg shadow-primary/10 scale-[1.02]'
                      : 'border-border/60 hover:border-primary/40'
                  )}
                >
                  <div className="flex flex-col gap-2">
                    <span className="text-base font-bold text-text-primary group-hover:text-primary transition-colors">{template.name}</span>
                    <span className="text-[10px] uppercase font-bold text-text-tertiary">Template ID: {template.id}</span>
                  </div>
                  {isSelected && (
                    <div className="self-end w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow mt-2">
                      <Check size={12} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-5 border-t border-border bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-text-secondary hover:bg-gray-150 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onChange(selected)}
            disabled={!selected || isLoading}
            className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/15 hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            Change Template
          </button>
        </div>
      </div>
    </div>
  );
}
