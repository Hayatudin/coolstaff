'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Search,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  XCircle,
  FileCheck,
  User,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Passport {
  id: string;
  passportNumber: string;
  surname: string;
  givenNames: string;
  dateOfBirth: string | null;
  dateOfExpiry: string | null;
  nationality: string | null;
  gender: string | null;
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

  // Helper Functions
  const calculateAge = (dobString?: string | null) => {
    if (!dobString) return '—';
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return '—';
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970) + ' yrs';
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return date.toISOString().split('T')[0];
  };

  const getExpiryStatus = (expiryString?: string | null) => {
    if (!expiryString) return 'normal';
    const expiry = new Date(expiryString);
    if (isNaN(expiry.getTime())) return 'normal';
    const now = new Date();
    if (expiry.getTime() < now.getTime()) return 'expired';

    const sixMonthsLater = new Date();
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    if (expiry.getTime() < sixMonthsLater.getTime()) return 'warning';

    return 'normal';
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
        p.surname.toLowerCase().includes(q) ||
        p.givenNames.toLowerCase().includes(q) ||
        (p.nationality && p.nationality.toLowerCase().includes(q))
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
              placeholder="Search by passport number, name, or nationality..."
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
                  <th className="px-6 py-4">Passport Number</th>
                  <th className="px-6 py-4">Full Name</th>
                  <th className="px-6 py-4">Age</th>
                  <th className="px-6 py-4">Gender</th>
                  <th className="px-6 py-4">Nationality</th>
                  <th className="px-6 py-4">Expiry Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm text-text-primary">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-text-tertiary">
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
                    const expiryStatus = getExpiryStatus(passport.dateOfExpiry);

                    return (
                      <tr
                        key={passport.id}
                        className="hover:bg-primary-50/20 transition-colors duration-150 group"
                      >
                        {/* Passport Number */}
                        <td className="px-6 py-4 font-bold text-primary tracking-wide">
                          {passport.passportNumber}
                        </td>

                        {/* Full Name */}
                        <td className="px-6 py-4 font-medium">
                          {passport.surname} {passport.givenNames}
                        </td>

                        {/* Age */}
                        <td className="px-6 py-4 text-text-secondary whitespace-nowrap">
                          {calculateAge(passport.dateOfBirth)}
                        </td>

                        {/* Gender */}
                        <td className="px-6 py-4 text-text-secondary capitalize">
                          {passport.gender?.toLowerCase() || '—'}
                        </td>

                        {/* Nationality */}
                        <td className="px-6 py-4 font-medium text-text-secondary">
                          {passport.nationality || '—'}
                        </td>

                        {/* Expiry Date */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-text-secondary font-mono">
                              {formatDate(passport.dateOfExpiry)}
                            </span>
                            {expiryStatus === 'expired' && (
                              <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md">
                                <XCircle size={12} /> Expired
                              </span>
                            )}
                            {expiryStatus === 'warning' && (
                              <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md animate-pulse">
                                <AlertCircle size={12} /> Expiring soon
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={cn(
                              'px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider',
                              passport.status === 'Available'
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : 'bg-blue-100 text-blue-700 border border-blue-200'
                            )}
                          >
                            {passport.status === 'Available' ? 'Available' : 'Taken'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {passport.status === 'Available' && (
                              <button
                                onClick={() => handleMarkTaken(passport.id, passport.passportNumber)}
                                disabled={isUpdating !== null}
                                title="Mark as Taken"
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-transparent hover:border-emerald-200 transition-all cursor-pointer disabled:opacity-50"
                              >
                                <CheckCircle2 size={16} />
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
    </div>
  );
}
