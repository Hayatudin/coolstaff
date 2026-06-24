'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Search,
  CheckCircle2,
  Loader2,
  Eye,
  X,
  AlertCircle,
  FileCheck,
  XCircle,
  HeartPulse,
  AlertTriangle
} from 'lucide-react';
import { cn, getFileUrl } from '@/lib/utils';

interface Passport {
  id: string;
  shelfNo: string;
  fullName: string;
  passportNumber: string;
  passportImageUrl: string | null;
  status: string;
  takenReason?: string | null;
  takenByName?: string | null;
  takenByPhone?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AvailablePassportPage() {
  const [passports, setPassports] = useState<Passport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'available' | 'taken'>('available');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Taken Modal State
  const [takenModalOpen, setTakenModalOpen] = useState(false);
  const [selectedPassport, setSelectedPassport] = useState<Passport | null>(null);
  const [takenReason, setTakenReason] = useState<'Medical' | 'Terminate'>('Medical');
  const [takenByName, setTakenByName] = useState('');
  const [takenByPhone, setTakenByPhone] = useState('');

  // Fetch all passports from backend
  const fetchPassports = async () => {
    try {
      const res = await api('/api/passports');
      const data = await res.json();
      if (Array.isArray(data)) {
        setPassports(data);
      }
    } catch (err) {
      console.error('Failed to fetch passports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassports();
  }, []);

  // Handlers
  const handleOpenTakenModal = (passport: Passport) => {
    setSelectedPassport(passport);
    setTakenReason('Medical');
    setTakenByName('');
    setTakenByPhone('');
    setTakenModalOpen(true);
  };

  const handleConfirmTaken = async () => {
    if (!selectedPassport) return;
    if (!takenByName.trim()) return;
    if (takenReason === 'Terminate' && !takenByPhone.trim()) return;

    setIsUpdating(selectedPassport.id);
    setTakenModalOpen(false);
    try {
      const res = await api(`/api/passports/${selectedPassport.id}/taken`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          takenReason,
          takenByName: takenByName.trim(),
          takenByPhone: takenReason === 'Terminate' ? takenByPhone.trim() : undefined,
        }),
      });
      if (res.ok) {
        // Update local state instantly for snappiness
        setPassports(prev =>
          prev.map(p =>
            p.id === selectedPassport.id
              ? {
                  ...p,
                  status: 'PassportTaken',
                  takenReason,
                  takenByName: takenByName.trim().toUpperCase(),
                  takenByPhone: takenReason === 'Terminate' ? takenByPhone.trim() : null,
                }
              : p
          )
        );
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update passport');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating passport status');
    } finally {
      setIsUpdating(null);
      setSelectedPassport(null);
    }
  };

  // Filter and Category Splitting
  const availableList = passports.filter(p => p.status === 'Available');
  const takenList = passports.filter(p => p.status === 'PassportTaken');

  const getFilteredList = (list: Passport[]) => {
    if (!search) return list;
    const q = search.toLowerCase().trim();
    return list.filter(
      p =>
        p.passportNumber.toLowerCase().includes(q) ||
        p.fullName.toLowerCase().includes(q) ||
        p.shelfNo.toLowerCase().includes(q)
    );
  };

  const currentList = activeTab === 'available' ? availableList : takenList;
  const filteredList = getFilteredList(currentList);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">Available Passport</h1>
          <p className="text-text-tertiary mt-1 text-sm">
            Search, track, and manage registered passports in available or taken categories.
          </p>
        </div>
      </div>

      {/* Large Stats Counter Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Available Passports Stats Box */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/60 p-6 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.08] text-emerald-800 pointer-events-none transition-transform duration-300 group-hover:scale-110">
            <FileCheck size={120} />
          </div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Available Passports</span>
          <span className="text-4xl sm:text-5xl font-extrabold text-emerald-700 tracking-tight mt-2">
            {loading ? <Loader2 size={24} className="animate-spin text-emerald-500" /> : availableList.length}
          </span>
        </div>

        {/* Taken Passports Stats Box */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/60 p-6 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.08] text-blue-800 pointer-events-none transition-transform duration-300 group-hover:scale-110">
            <XCircle size={120} />
          </div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Taken Passports</span>
          <span className="text-4xl sm:text-5xl font-extrabold text-blue-700 tracking-tight mt-2">
            {loading ? <Loader2 size={24} className="animate-spin text-blue-500" /> : takenList.length}
          </span>
        </div>
      </div>

      {/* Category Tabs & Search Panel */}
      <div className="bg-surface rounded-2xl border border-border p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Tabs (No small badge counts inside) */}
          <div className="flex bg-lavender-dark p-1 rounded-xl w-full md:w-auto self-start border border-border/40">
            <button
              onClick={() => setActiveTab('available')}
              className={cn(
                'flex-1 md:flex-none px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2',
                activeTab === 'available'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              Passport available
            </button>
            <button
              onClick={() => setActiveTab('taken')}
              className={cn(
                'flex-1 md:flex-none px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2',
                activeTab === 'taken'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              Taken
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:max-w-md">
            <input
              type="text"
              placeholder="Search by shelf no, passport number, or name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
          </div>
        </div>
      </div>

      {/* Main List Table */}
      {loading ? (
        <div className="bg-surface rounded-2xl border border-border p-12 text-center shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-text-secondary font-medium">Loading passports...</p>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-border text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  <th className="px-6 py-4">Shelf No</th>
                  <th className="px-6 py-4">Full Name</th>
                  <th className="px-6 py-4">Passport Number</th>
                  <th className="px-6 py-4">Image</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm text-text-primary">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-text-tertiary">
                      <div className="max-w-md mx-auto space-y-2">
                        <AlertCircle className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
                        <p className="font-semibold text-text-secondary">No passports found</p>
                        <p className="text-xs">
                          {search
                            ? 'No matches found. Try modifying your search criteria.'
                            : `There are currently no passports in the "${
                                activeTab === 'available' ? 'Passport available' : 'Taken'
                              }" category.`}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredList.map(passport => {
                    return (
                      <tr
                        key={passport.id}
                        className="hover:bg-primary-50/20 transition-colors duration-150 group"
                      >
                        {/* Shelf No */}
                        <td className="px-6 py-4 font-mono font-bold text-text-secondary">
                          {passport.shelfNo}
                        </td>

                        {/* Full Name */}
                        <td className="px-6 py-4">
                          <div className="font-bold text-text-primary">
                            {passport.fullName}
                          </div>
                          {passport.status === 'PassportTaken' && passport.takenReason && (
                            <div className="text-xs mt-1.5 space-y-1">
                              <div className="inline-block">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                                  passport.takenReason === 'Medical'
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                    : "bg-rose-50 text-rose-600 border border-rose-100"
                                )}>
                                  {passport.takenReason}
                                </span>
                              </div>
                              <div className="text-text-secondary font-medium">
                                <span className="text-text-tertiary">Taken by:</span> {passport.takenByName}
                              </div>
                              {passport.takenByPhone && (
                                <div className="text-text-secondary font-mono text-[11px]">
                                  <span className="text-text-tertiary">Phone:</span> {passport.takenByPhone}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Passport Number */}
                        <td className="px-6 py-4 font-semibold text-primary tracking-wide">
                          {passport.passportNumber}
                        </td>

                        {/* Image Preview */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {passport.passportImageUrl ? (
                            <button
                              onClick={() => setPreviewImage(passport.passportImageUrl)}
                              className="p-1.5 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary-dark rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                              title="View Passport Image"
                            >
                              <Eye size={14} />
                              <span>View Image</span>
                            </button>
                          ) : (
                            <span className="text-text-tertiary text-xs font-medium">No image</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {passport.status === 'Available' && (
                              <button
                                onClick={() => handleOpenTakenModal(passport)}
                                disabled={isUpdating !== null}
                                title="Mark as Taken"
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1 text-xs font-semibold shadow-sm"
                              >
                                <CheckCircle2 size={13} />
                                <span>Taken</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Taken Modal */}
      {takenModalOpen && selectedPassport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative max-w-md w-full bg-surface rounded-2xl overflow-hidden shadow-2xl border border-border animate-scale-pop">
            <button
              onClick={() => setTakenModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-text-secondary hover:text-text-primary hover:bg-gray-100 rounded-full transition-colors z-10 cursor-pointer"
            >
              <X size={20} />
            </button>
            
            <div className="p-6">
              <h3 className="text-lg font-bold text-text-primary mb-2 border-b border-border pb-3 flex items-center gap-2">
                <CheckCircle2 className="text-emerald-500 w-5 h-5" />
                <span>Mark Passport as Taken</span>
              </h3>
              
              <div className="mb-4 bg-gray-50 p-3 rounded-xl border border-border/60">
                <div className="text-xs text-text-tertiary uppercase tracking-wider font-semibold">Candidate</div>
                <div className="font-bold text-text-primary text-sm mt-0.5">{selectedPassport.fullName}</div>
                <div className="text-xs text-primary font-semibold font-mono mt-0.5">{selectedPassport.passportNumber}</div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                  Select Reason <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTakenReason('Medical')}
                    className={cn(
                      "p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-200",
                      takenReason === 'Medical'
                        ? "border-emerald-500 bg-emerald-50/50 text-emerald-700 shadow-sm"
                        : "border-border hover:border-gray-300 bg-white text-text-secondary"
                    )}
                  >
                    <HeartPulse className={cn("w-5 h-5", takenReason === 'Medical' ? "text-emerald-600" : "text-text-tertiary")} />
                    <span className="font-semibold text-xs">Medical</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTakenReason('Terminate')}
                    className={cn(
                      "p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-200",
                      takenReason === 'Terminate'
                        ? "border-rose-500 bg-rose-50/50 text-rose-700 shadow-sm"
                        : "border-border hover:border-gray-300 bg-white text-text-secondary"
                    )}
                  >
                    <AlertTriangle className={cn("w-5 h-5", takenReason === 'Terminate' ? "text-rose-600" : "text-text-tertiary")} />
                    <span className="font-semibold text-xs">Terminate</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                    Person's Name who took it <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={takenByName}
                    onChange={(e) => setTakenByName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    required
                  />
                </div>

                {takenReason === 'Terminate' && (
                  <div className="animate-fade-in">
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter phone number"
                      value={takenByPhone}
                      onChange={(e) => setTakenByPhone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setTakenModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary rounded-xl hover:bg-gray-50 border border-border transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTaken}
                  disabled={
                    !takenByName.trim() ||
                    (takenReason === 'Terminate' && !takenByPhone.trim())
                  }
                  className={cn(
                    "px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5",
                    takenReason === 'Medical'
                      ? "bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:bg-emerald-300"
                      : "bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:bg-rose-300"
                  )}
                >
                  <CheckCircle2 size={14} />
                  <span>Confirm Taken</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative max-w-3xl w-full bg-surface rounded-2xl overflow-hidden shadow-2xl border border-border animate-scale-pop">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/50 text-white hover:bg-black/75 rounded-full transition-colors z-10 cursor-pointer"
            >
              <X size={20} />
            </button>
            <div className="p-4 sm:p-6 flex flex-col items-center">
              <h3 className="text-lg font-bold text-text-primary mb-4 w-full text-left border-b border-border pb-2">
                Passport Image Preview
              </h3>
              <div className="relative aspect-[3/2] w-full max-h-[500px] bg-gray-50 flex items-center justify-center rounded-xl border border-border overflow-hidden">
                <img
                  src={getFileUrl(previewImage)}
                  alt="Passport Preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
