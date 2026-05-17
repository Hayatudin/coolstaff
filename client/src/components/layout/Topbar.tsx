'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, ChevronDown, User, FileText, X, Loader2, CheckCheck, Menu, RotateCw } from 'lucide-react';
import { cn, getFileUrl } from '@/lib/utils';
import { useSession } from '@/lib/auth-client';
import { api } from '@/lib/api';

interface TopbarProps {
  onMobileMenuToggle?: () => void;
}

export default function Topbar({ onMobileMenuToggle }: TopbarProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api('/api/notifications');
        const data = await res.json();
        if (Array.isArray(data)) {
          setNotifications(data);
          setUnreadCount(data.filter((n: any) => !n.isRead).length);
        }
      } catch (err: any) {
        console.warn('Failed to fetch notifications', err.message || err);
      }
    };
    fetchNotifications();
  }, []);

  const markAllRead = async () => {
    try {
      await api('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err: any) {
      console.warn('Failed to mark notifications as read', err.message || err);
    }
  };

  useEffect(() => {
    const fetchResults = async () => {
      if (searchQuery.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const res = await api(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setResults(data);
        setShowResults(true);
      } catch (err: any) {
        console.warn('Search error:', err.message || err);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(fetchResults, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectCandidate = (id: string) => {
    setSearchQuery('');
    setShowResults(false);
    router.push(`/candidates/${id}`);
  };

  const role = (session?.user as any)?.role ?? 'user';

  return (
    <header className="sticky top-0 z-40 h-14 sm:h-16 bg-white/70 backdrop-blur-xl border-b border-border/50 flex items-center justify-between px-3 sm:px-4 md:px-8 gap-2">
      {/* Mobile menu button */}
      <button
        onClick={onMobileMenuToggle}
        className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors shrink-0"
      >
        <Menu size={22} className="text-text-secondary" />
      </button>

      {/* Search */}
      <div className="relative flex-1 max-w-[200px] sm:max-w-xs md:max-w-sm lg:max-w-md" ref={searchRef}>
        <div className="relative group">
          <Search size={16} className={cn(
            "absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 transition-colors duration-200",
            searchQuery ? "text-primary" : "text-text-tertiary"
          )} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
            placeholder="Search candidates..."
            className="w-full pl-9 sm:pl-12 pr-8 sm:pr-10 py-2 sm:py-2.5 text-sm rounded-xl sm:rounded-2xl border border-border/60 bg-gray-50/50 text-text-primary placeholder:text-text-tertiary/60 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all duration-300"
          />
          {isSearching ? (
            <Loader2 size={14} className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-primary animate-spin" />
          ) : searchQuery && (
            <button 
              onClick={() => { setSearchQuery(''); setResults([]); }}
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-danger transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && (results.length > 0 || searchQuery.length >= 2) && (
          <div className="absolute top-full mt-2 w-full sm:w-80 md:w-96 bg-white rounded-2xl border border-border shadow-2xl shadow-primary/10 overflow-hidden animate-slide-in-top z-50">
            {results.length > 0 ? (
              <div className="p-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary px-3 py-2">Quick Results</p>
                {results.map((candidate) => (
                  <button
                    key={candidate.id}
                    onClick={() => handleSelectCandidate(candidate.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-primary/5 rounded-xl transition-colors text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-primary font-bold overflow-hidden border border-border/50 group-hover:border-primary/30">
                      {candidate.facePhotoUrl ? (
                        <img src={getFileUrl(candidate.facePhotoUrl)} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                      ) : (
                        <span>{candidate.givenNames.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">{candidate.givenNames} {candidate.surname}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono font-bold text-text-tertiary px-1.5 py-0.5 bg-gray-100 rounded">{candidate.passportNumber}</span>
                        <span className="text-[10px] text-text-tertiary truncate opacity-60">{candidate.job}</span>
                      </div>
                    </div>
                    <ChevronDown size={14} className="text-text-tertiary -rotate-90 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            ) : !isSearching && (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search size={20} className="text-text-tertiary opacity-20" />
                </div>
                <p className="text-sm font-bold text-text-primary">No results found</p>
                <p className="text-xs text-text-tertiary mt-1">Try a different name or passport</p>
              </div>
            )}
            
            {results.length > 0 && (
              <div className="bg-gray-50/50 p-2 border-t border-border/50">
                <button 
                  onClick={() => router.push(`/candidates?q=${searchQuery}`)}
                  className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-lg transition-colors"
                >
                  View all results
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1 sm:gap-2 md:gap-4 shrink-0">
        {/* Instant Reload Button */}
        <button 
          onClick={() => window.location.reload()}
          title="Refresh Website"
          className="p-2 sm:p-2.5 rounded-xl hover:bg-primary/5 transition-all duration-200 group active:scale-[0.95]"
        >
          <RotateCw size={18} className="text-text-secondary group-hover:text-primary group-hover:rotate-180 transition-all duration-500 sm:w-5 sm:h-5" />
        </button>

        {/* Notification */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 sm:p-2.5 rounded-xl hover:bg-primary/5 transition-all duration-200 group"
          >
            <Bell size={18} className="text-text-secondary group-hover:text-primary transition-colors sm:w-5 sm:h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-danger rounded-full ring-2 sm:ring-4 ring-white flex items-center justify-center">
              </span>
            )}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-danger text-white text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded-full min-w-[16px] sm:min-w-[18px] text-center shadow-sm">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-[calc(100vw-24px)] sm:w-80 max-w-80 bg-white rounded-2xl border border-border shadow-2xl shadow-primary/10 overflow-hidden animate-slide-in-top z-50">
              <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between bg-gray-50/50">
                <h3 className="font-bold text-text-primary text-sm sm:text-base">Notifications</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllRead}
                    className="text-[10px] uppercase tracking-wider font-bold text-primary hover:text-indigo-700 flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-md"
                  >
                    <CheckCheck size={12} /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={cn(
                        "p-3 sm:p-4 border-b border-border/50 hover:bg-gray-50 transition-colors cursor-pointer",
                        !notif.isRead ? "bg-primary/5" : ""
                      )}
                      onClick={() => {
                        if (notif.candidateId) router.push(`/candidates/${notif.candidateId}`);
                        setShowNotifications(false);
                      }}
                    >
                      <div className="flex gap-3">
                        <div className={cn("mt-0.5 w-2 h-2 rounded-full shrink-0", !notif.isRead ? "bg-primary" : "bg-transparent")} />
                        <div>
                          <p className={cn("text-sm mb-1", !notif.isRead ? "font-bold text-text-primary" : "font-medium text-text-secondary")}>
                            {notif.title}
                          </p>
                          <p className="text-xs text-text-tertiary leading-relaxed line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-text-tertiary/70 mt-2 font-medium">
                            {new Date(notif.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <Bell size={24} className="mx-auto text-text-tertiary opacity-20 mb-3" />
                    <p className="text-sm font-bold text-text-primary">All caught up!</p>
                    <p className="text-xs text-text-tertiary mt-1">No new notifications</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User menu — show name on md+ (only render after mount to avoid hydration mismatch) */}
        {mounted && session?.user && (
          <div className="flex items-center gap-2 sm:gap-3 sm:pl-2 md:pl-4 md:border-l md:border-border/50 cursor-pointer hover:bg-gray-50 rounded-xl sm:rounded-2xl px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 transition-all duration-200 group">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform shrink-0">
              <User size={14} className="text-white sm:w-4 sm:h-4" />
            </div>
            <div className="hidden md:block">
              <p className="text-[10px] font-black uppercase tracking-tighter text-text-tertiary leading-none mb-1">{role.replace('_', ' ')}</p>
              <p className="text-sm font-bold text-text-primary leading-none truncate max-w-[120px]">{session.user.name}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
