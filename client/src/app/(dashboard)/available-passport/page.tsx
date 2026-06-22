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
  Trash2
} from 'lucide-react';
import { cn, getFileUrl } from '@/lib/utils';

interface Passport {
  id: string;
  shelfNo: string;
  fullName: string;
  passportNumber: string;
  passportImageUrl: string | null;
  status: string;
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
  const handleMarkTaken = async (id: string, passportNumber: string) => {
    if (!confirm(`Are you sure you want to mark passport "${passportNumber}" as Taken?`)) return;
    setIsUpdating(id);
    try {
      const res = await api(`/api/passports/${id}/taken`, {
        method: 'PATCH',
      });
      if (res.ok) {
        // Update local state instantly for snappiness
        setPassports(prev =>
          prev.map(p => (p.id === id ? { ...p, status: 'PassportTaken' } : p))
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
    }
  };

  const handleDelete = async (id: string, passportNumber: string) => {
    if (!confirm(`Are you sure you want to delete passport "${passportNumber}"? This action cannot be undone.`)) return;
    setIsUpdating(id);
    try {
      const res = await api(`/api/passports/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        // Remove from local state
        setPassports(prev => prev.filter(p => p.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete passport');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting passport');
    } finally {
      setIsUpdating(null);
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

      {/* Category Tabs & Search Panel */}
      <div className="bg-surface rounded-2xl border border-border p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Tabs */}
          <div className="flex bg-lavender-dark p-1 rounded-xl w-full md:w-auto self-start border border-border/40">
            <button
              onClick={() => setActiveTab('available')}
              className={cn(
                'flex-1 md:flex-none px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2',
                activeTab === 'available'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <span>Passport available</span>
              <span
                className={cn(
                  'px-2 py-0.5 text-xs rounded-full font-bold',
                  activeTab === 'available'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-black/5 text-text-tertiary'
                )}
              >
                {availableList.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('taken')}
              className={cn(
                'flex-1 md:flex-none px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2',
                activeTab === 'taken'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <span>Taken</span>
              <span
                className={cn(
                  'px-2 py-0.5 text-xs rounded-full font-bold',
                  activeTab === 'taken'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-black/5 text-text-tertiary'
                )}
              >
                {takenList.length}
              </span>
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
                        <td className="px-6 py-4 font-bold text-text-primary">
                          {passport.fullName}
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
                            <span className="text-text-tertiary text-xs italic">No Image</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {passport.status === 'Available' && (
                              <button
                                onClick={() => handleMarkTaken(passport.id, passport.passportNumber)}
                                disabled={isUpdating !== null}
                                title="Mark as Taken"
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1 text-xs font-semibold shadow-sm"
                              >
                                <CheckCircle2 size={13} />
                                <span>Taken</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(passport.id, passport.passportNumber)}
                              disabled={isUpdating !== null}
                              title="Delete Passport"
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-all cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 size={16} />
                            </button>
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
