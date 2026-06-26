'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Video, Search, ExternalLink, Loader2, RefreshCw,
  User, Calendar, Globe, FileText, Filter, Edit2, Trash2, X, AlertCircle,
  Copy, Check, Eye
} from 'lucide-react';
import { cn, getFileUrl } from '@/lib/utils';
import { api } from '@/lib/api';
import FileUpload from '@/components/ui/FileUpload';

interface UploadedVideo {
  id: string;
  fullName: string;
  passportNumber: string;
  nationality: string;
  videoUrl: string;
  facePhotoUrl: string | null;
  fullBodyPhotoUrl: string | null;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 10;

  // Preview Media Modal State
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video'; title: string } | null>(null);

  // Edit Video Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<UploadedVideo | null>(null);
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Video State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState<UploadedVideo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterSource]);

  const handleStartEdit = (record: UploadedVideo) => {
    setEditRecord(record);
    setEditVideoUrl(record.videoUrl || '');
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRecord) return;
    if (!editVideoUrl.trim()) {
      setEditError('Video file is required');
      return;
    }

    setIsSaving(true);
    setEditError(null);
    try {
      const res = await api(`/api/video-uploads/${editRecord.source}/${editRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: editVideoUrl.trim() }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update video');
      }
      setIsEditOpen(false);
      fetchVideos();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update video');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartDelete = (record: UploadedVideo) => {
    setDeleteRecord(record);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteRecord) return;
    setIsDeleting(true);
    try {
      const res = await api(`/api/video-uploads/${deleteRecord.source}/${deleteRecord.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete video');
      }
      setIsDeleteOpen(false);
      fetchVideos();
    } catch (err: any) {
      alert(err.message || 'Failed to delete video');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = (path: string, id: string) => {
    if (!path) return;
    const fullUrl = getFileUrl(path);
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

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
      <div className="bg-surface rounded-[2rem] border border-border/30 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-border/30 text-[10px] uppercase tracking-wider font-bold text-text-tertiary/90">
                <th className="px-6 py-4 font-semibold">Candidate</th>
                <th className="px-6 py-4 font-semibold hidden sm:table-cell">Passport</th>
                <th className="px-6 py-4 font-semibold">Face Photo</th>
                <th className="px-6 py-4 font-semibold">Full Body</th>
                <th className="px-6 py-4 font-semibold">Video</th>
                <th className="px-6 py-4 font-semibold hidden md:table-cell">Source</th>
                <th className="px-6 py-4 font-semibold hidden lg:table-cell">Date</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={32} className="text-primary animate-spin" />
                      <p className="text-sm font-medium text-text-tertiary">Loading videos...</p>
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
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
              ) : paginated.map(v => {
                const badge = SOURCE_BADGE[v.source] || SOURCE_BADGE.candidate;
                return (
                  <tr key={`${v.source}-${v.id}`} className="hover:bg-gray-50/30 transition-colors group">
                    {/* Name */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center shrink-0 border border-rose-100 overflow-hidden">
                          {v.facePhotoUrl ? (
                            <img src={getFileUrl(v.facePhotoUrl)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User size={16} className="text-rose-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-text-primary text-sm truncate max-w-[150px]">{v.fullName || '—'}</p>
                          {v.nationality && (
                            <p className="text-[10px] text-text-tertiary flex items-center gap-1 mt-0.5">
                              <Globe size={10} /> {v.nationality}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Passport */}
                    <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                      {v.passportNumber ? (
                        <span className="text-xs font-mono font-bold text-text-secondary px-2.5 py-1 bg-gray-50 rounded-lg border border-border/40">
                          {v.passportNumber}
                        </span>
                      ) : (
                        <span className="text-xs text-text-tertiary">—</span>
                      )}
                    </td>

                    {/* Face Photo */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {v.facePhotoUrl ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={getFileUrl(v.facePhotoUrl)}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover border border-border"
                          />
                          <button
                            onClick={() => setPreviewMedia({ url: getFileUrl(v.facePhotoUrl), type: 'image', title: `${v.fullName}'s Face Photo` })}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-primary transition-colors cursor-pointer"
                            title="View Photo"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleCopy(v.facePhotoUrl!, `${v.id}-face`)}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-primary transition-colors cursor-pointer"
                            title="Copy secure path"
                          >
                            {copiedId === `${v.id}-face` ? <Check size={14} className="text-emerald-600 animate-scale-pop" /> : <Copy size={14} />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-text-tertiary">—</span>
                      )}
                    </td>

                    {/* Full Body Photo */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {v.fullBodyPhotoUrl ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={getFileUrl(v.fullBodyPhotoUrl)}
                            alt=""
                            className="w-10 h-12 rounded object-cover border border-border"
                          />
                          <button
                            onClick={() => setPreviewMedia({ url: getFileUrl(v.fullBodyPhotoUrl), type: 'image', title: `${v.fullName}'s Full Body Photo` })}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-primary transition-colors cursor-pointer"
                            title="View Photo"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleCopy(v.fullBodyPhotoUrl!, `${v.id}-body`)}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-primary transition-colors cursor-pointer"
                            title="Copy secure path"
                          >
                            {copiedId === `${v.id}-body` ? <Check size={14} className="text-emerald-600 animate-scale-pop" /> : <Copy size={14} />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-text-tertiary">—</span>
                      )}
                    </td>

                    {/* Video Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {v.videoUrl ? (
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded bg-rose-50 flex items-center justify-center shrink-0 border border-rose-100">
                            <Video size={15} className="text-rose-600" />
                          </div>
                          <button
                            onClick={() => setPreviewMedia({ url: getFileUrl(v.videoUrl), type: 'video', title: `${v.fullName || 'Candidate'}'s Video Profile` })}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-primary transition-colors cursor-pointer"
                            title="Play Video"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleCopy(v.videoUrl, `${v.id}-video`)}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-primary transition-colors cursor-pointer"
                            title="Copy secure path"
                          >
                            {copiedId === `${v.id}-video` ? <Check size={14} className="text-emerald-600 animate-scale-pop" /> : <Copy size={14} />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-text-tertiary">—</span>
                      )}
                    </td>

                    {/* Source */}
                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border',
                        badge.bg, badge.text, badge.border
                      )}>
                        {badge.label}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <Calendar size={12} className="text-text-tertiary" />
                        {formatDate(v.date)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleStartEdit(v)}
                          className="p-1.5 text-text-tertiary hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100 cursor-pointer"
                          title="Edit video file"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleStartDelete(v)}
                          className="p-1.5 text-text-tertiary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 cursor-pointer"
                          title="Delete video record"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!isLoading && (
          <div className="px-6 py-3 border-t border-border/20 text-xs text-text-tertiary flex items-center justify-between">
            <span>Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} video{filtered.length !== 1 ? 's' : ''}</span>
            {filterSource !== 'all' && (
              <button onClick={() => setFilterSource('all')} className="text-rose-500 hover:text-rose-700 font-semibold cursor-pointer">
                Clear filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination Component */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-text-secondary hover:bg-primary hover:text-white hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
          >
            ‹
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
            if (page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1) {
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all border cursor-pointer ${page === currentPage
                      ? 'bg-primary text-white border-primary shadow-md'
                      : 'border-border text-text-secondary hover:bg-primary/10 hover:border-primary/30'
                    }`}
                >
                  {page}
                </button>
              );
            }
            if (page === currentPage - 2 || page === currentPage + 2) {
              return <span key={page} className="text-text-tertiary px-1 font-bold">…</span>;
            }
            return null;
          })}

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-text-secondary hover:bg-primary hover:text-white hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
          >
            ›
          </button>
        </div>
      )}

      {/* Media Preview Modal */}
      {previewMedia && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="relative bg-surface rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-scale-pop"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <div className="flex items-center gap-2">
                <Video size={16} className="text-primary" />
                <h3 className="text-sm font-bold text-text-primary">{previewMedia.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewMedia(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-text-secondary hover:text-text-primary cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex items-center justify-center bg-gray-950 max-h-[75vh] overflow-auto">
              {previewMedia.type === 'video' ? (
                <video
                  src={previewMedia.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[70vh] object-contain rounded-xl"
                />
              ) : (
                <img
                  src={previewMedia.url}
                  alt={previewMedia.title}
                  className="max-w-full max-h-[70vh] object-contain rounded-xl"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && editRecord && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-md w-full overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Edit2 size={16} className="text-indigo-600" />
                Edit Video File
              </h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-semibold flex items-center gap-2">
                  <AlertCircle size={14} />
                  {editError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                  Candidate Name
                </label>
                <p className="text-sm font-bold text-gray-900">{editRecord.fullName}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                  Upload Video File
                </label>
                <FileUpload
                  shape="rect"
                  compact
                  accept="video/*"
                  preview={editVideoUrl ? getFileUrl(editVideoUrl) : null}
                  onFileSelect={(file) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      if (ev.target?.result) {
                        setEditVideoUrl(ev.target.result as string);
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                  onClear={() => setEditVideoUrl('')}
                  helperText="Supports MP4, WebM, MOV — Max 50MB"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isSaving ? <Loader2 size={13} className="animate-spin" /> : null}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && deleteRecord && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-sm w-full overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Trash2 size={16} className="text-red-600" />
                Remove Video Link
              </h3>
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                Are you sure you want to remove the video link for <span className="font-bold text-gray-900">{deleteRecord.fullName}</span>?
                {deleteRecord.source === 'preRegistered' && ' This will delete the pre-registration record completely.'}
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isDeleting ? <Loader2 size={13} className="animate-spin" /> : null}
                  Delete Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
