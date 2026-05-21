'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Video, Search, ExternalLink, Loader2, RefreshCw,
  User, Calendar, Globe, FileText, Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface UploadedVideo {
  id: string;
  fullName: string;
  passportNumber: string;
  nationality: string;
  videoUrl: string;
  date: string;
  source: 'candidate' | 'quickRegistration' | 'preRegistered';
}

const SOURCE_BADGE: Record<string, { label: string; bg: string; text: string; border: string }> = {
  candidate:         { label: 'Candidate',    bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-100' },
  quickRegistration: { label: 'Entry Record', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
  preRegistered:     { label: 'Pre-Registered', bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-100' },
};

export default function UploadedVideosPage() {
  const [videos, setVideos] = useState<UploadedVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');

  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = search ? `?q=${encodeURIComponent(search)}` : '';
      const res = await api(`/api/video-uploads/uploaded${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setVideos(Array.isArray(data) ? data : []);
    } catch {
      console.error('Failed to fetch uploaded videos');
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchVideos, 300);
    return () => clearTimeout(timer);
  }, [fetchVideos]);

  // Listen for app-refresh events
  useEffect(() => {
    const handler = () => fetchVideos();
    window.addEventListener('app-refresh', handler);
    return () => window.removeEventListener('app-refresh', handler);
  }, [fetchVideos]);

  const filtered = filterSource === 'all'
    ? videos
    : videos.filter(v => v.source === filterSource);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  const getYouTubeUrl = (url: string) => {
    if (!url) return '#';
    if (url.startsWith('http')) return url;
    return `https://${url}`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-50">
              <Video size={22} className="text-rose-600" />
            </div>
            Uploaded Videos
          </h1>
          <p className="text-gray-500 mt-1 ml-12">Browse all candidates with uploaded video profiles</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchVideos}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-gray-500"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <div className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 border border-rose-100 rounded-full text-rose-700 text-xs font-semibold">
            <Video size={13} />
            {videos.length} video{videos.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Search + Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or passport…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          {['all', 'candidate', 'quickRegistration', 'preRegistered'].map(s => (
            <button
              key={s}
              onClick={() => setFilterSource(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                filterSource === s
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              )}
            >
              {s === 'all' ? 'All' : SOURCE_BADGE[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-widest font-bold text-gray-400">
                <th className="px-4 xl:px-6 py-3.5">Candidate</th>
                <th className="px-4 xl:px-6 py-3.5 hidden sm:table-cell">Passport</th>
                <th className="px-4 xl:px-6 py-3.5 hidden md:table-cell">Source</th>
                <th className="px-4 xl:px-6 py-3.5 hidden lg:table-cell">Date</th>
                <th className="px-4 xl:px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <Loader2 size={28} className="mx-auto text-rose-500 animate-spin" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center">
                        <Video size={24} className="text-gray-300" />
                      </div>
                      <p className="text-sm font-bold text-gray-900">No videos found</p>
                      <p className="text-xs text-gray-400">
                        {search ? 'Try a different search term' : 'No video uploads yet'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(v => {
                const badge = SOURCE_BADGE[v.source] || SOURCE_BADGE.candidate;
                return (
                  <tr key={`${v.source}-${v.id}`} className="hover:bg-gray-50/60 transition-colors group">
                    {/* Name */}
                    <td className="px-4 xl:px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2 xl:gap-3">
                        <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                          <User size={16} className="text-rose-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate max-w-[200px]">{v.fullName || '—'}</p>
                          {v.nationality && (
                            <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                              <Globe size={10} /> {v.nationality}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Passport */}
                    <td className="px-4 xl:px-6 py-3.5 whitespace-nowrap hidden sm:table-cell">
                      {v.passportNumber ? (
                        <span className="text-xs font-mono font-bold text-gray-600 px-2 py-1 bg-gray-50 rounded-md border border-gray-100">
                          {v.passportNumber}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    {/* Source */}
                    <td className="px-4 xl:px-6 py-3.5 whitespace-nowrap hidden md:table-cell">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border',
                        badge.bg, badge.text, badge.border
                      )}>
                        {badge.label}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 xl:px-6 py-3.5 whitespace-nowrap hidden lg:table-cell">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar size={12} className="text-gray-400" />
                        {formatDate(v.date)}
                      </div>
                    </td>

                    {/* Watch Video */}
                    <td className="px-4 xl:px-6 py-3.5 whitespace-nowrap text-right">
                      <a
                        href={getYouTubeUrl(v.videoUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 hover:text-red-700 transition-all border border-red-100 group-hover:shadow-sm"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                        Watch Video
                        <ExternalLink size={12} />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!isLoading && (
          <div className="px-6 py-3 border-t border-gray-50 text-xs text-gray-400 flex items-center justify-between">
            <span>{filtered.length} video{filtered.length !== 1 ? 's' : ''} shown</span>
            {filterSource !== 'all' && (
              <button onClick={() => setFilterSource('all')} className="text-rose-500 hover:text-rose-700 font-semibold">
                Clear filter
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
