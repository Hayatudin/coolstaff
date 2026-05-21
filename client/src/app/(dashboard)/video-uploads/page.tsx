'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import Input from '@/components/ui/Input';
import {
  Video,
  Search,
  User,
  ExternalLink,
  CheckCircle,
  HelpCircle,
  FileVideo,
  RefreshCw,
  PlusCircle,
  ChevronRight,
} from 'lucide-react';

interface CandidateResult {
  id: string;
  givenNames: string;
  surname: string;
  passportNumber: string;
  nationality: string;
  passportImageUrl: string | null;
  source: 'candidate' | 'quickRegistration';
  fullName: string;
}

export default function VideoUploadsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CandidateResult[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateResult | null>(null);

  
  const [videoUrl, setVideoUrl] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Feedback states
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced real-time candidate search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2 || selectedCandidate) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/video-uploads/search-candidates?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data);
          setShowDropdown(data.length > 0);
        }
      } catch (err) {
        console.error('Failed to search candidates:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, selectedCandidate]);

  // Click outside listener for the search autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCandidate = (candidate: CandidateResult) => {
    setSelectedCandidate(candidate);
    setSearchQuery(candidate.fullName);
    setShowDropdown(false);
  };

  const handleClearSelection = () => {
    setSelectedCandidate(null);
    setSearchQuery('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validate inputs
    const finalUrl = videoUrl.trim();
    if (!finalUrl) {
      setMessage({ type: 'error', text: 'Please enter a valid YouTube Video URL' });
      return;
    }

    // YouTube regex validation
    const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (!ytRegex.test(finalUrl)) {
      setMessage({ type: 'error', text: 'Invalid URL. Please enter a valid YouTube video link' });
      return;
    }

    const payload = selectedCandidate
      ? {
          id: selectedCandidate.id,
          source: selectedCandidate.source,
          videoUrl: finalUrl,
        }
      : {
          fullName: searchQuery.trim(),
          videoUrl: finalUrl,
        };

    if (!selectedCandidate && !searchQuery.trim()) {
      setMessage({ type: 'error', text: 'Please type a candidate name or select one from the dropdown' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/video-uploads/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        setMessage({
          type: 'success',
          text: selectedCandidate
            ? `Successfully attached YouTube video to registered candidate "${selectedCandidate.fullName}"!`
            : `Successfully pre-registered video for candidate "${searchQuery.trim().toUpperCase()}"!`,
        });
        
        // Reset state
        setVideoUrl('');
        handleClearSelection();
      } else {
        setMessage({
          type: 'error',
          text: resData.error || 'Failed to save video URL. Please try again.',
        });
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: 'Server connection failed. Please ensure the backend is running.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Video Uploads Portal</h1>
          <p className="text-sm text-text-secondary mt-1">
            Attach YouTube interview videos directly to candidates or buffer them prior to registration.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-100 rounded-full text-rose-700 text-xs font-semibold self-start">
          <FileVideo size={14} />
          Uploader Access Active
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Portal Form Section */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl shadow-sm p-6 space-y-6 relative overflow-visible">
            
            {/* Form Section 1: Candidate Association */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-50 text-primary text-xs font-bold">1</span>
                <h3 className="text-base font-semibold text-text-primary">Identify Candidate</h3>
              </div>

              {/* Autocomplete Search input */}
              <div className="relative" ref={dropdownRef}>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Candidate Full Name
                </label>
                <div className="relative">
                  <Input
                    placeholder="Type candidate name to search or pre-register..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (selectedCandidate) handleClearSelection();
                    }}
                    disabled={!!selectedCandidate}
                    className="pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-text-tertiary">
                    {isSearching ? (
                      <RefreshCw size={16} className="animate-spin text-primary" />
                    ) : (
                      <Search size={16} />
                    )}
                  </div>
                </div>

                {/* Autocomplete dropdown list */}
                {showDropdown && (
                  <div className="absolute left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto divide-y divide-border/50 animate-dropdown">
                    {searchResults.map((c) => (
                      <button
                        key={`${c.source}-${c.id}`}
                        type="button"
                        onClick={() => handleSelectCandidate(c)}
                        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-primary-50/50 transition-colors duration-150 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-secondary overflow-hidden border border-border">
                            {c.passportImageUrl ? (
                              <img src={c.passportImageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User size={16} />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">
                              {c.fullName}
                            </p>
                            <p className="text-xs text-text-tertiary">
                              PP: {c.passportNumber} • {c.nationality}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                            c.source === 'candidate' 
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-100" 
                              : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          )}>
                            {c.source === 'candidate' ? 'Full candidate' : 'Entry Record'}
                          </span>
                          <ChevronRight size={14} className="text-text-tertiary group-hover:text-primary transition-transform duration-150 group-hover:translate-x-0.5" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Candidate Badge */}
              {selectedCandidate && (
                <div className="flex items-center justify-between p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl animate-scale-pop">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-indigo-600 shrink-0" size={18} />
                    <div>
                      <p className="text-xs font-bold text-indigo-900">LINKED CANDIDATE ACTIVE</p>
                      <p className="text-sm font-semibold text-indigo-950 mt-0.5">
                        {selectedCandidate.fullName} ({selectedCandidate.passportNumber})
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-xs font-bold text-red-600 hover:text-red-800 transition-colors uppercase tracking-wider shrink-0 ml-4 hover:underline"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Manual Entry Hint */}
              {!selectedCandidate && searchQuery.trim().length >= 2 && searchResults.length === 0 && !isSearching && (
                <div className="flex items-center gap-2 p-3 bg-amber-50/60 border border-amber-100 rounded-xl text-xs text-amber-800 animate-fade-in">
                  <PlusCircle size={14} className="text-amber-600 shrink-0" />
                  <span>
                    No matching candidate found. <strong>"{searchQuery.trim().toUpperCase()}"</strong> will be pre-registered when you submit.
                  </span>
                </div>
              )}
            </div>

            {/* Form Section 2: YouTube Video Link */}
            <div className="space-y-4 border-t border-border pt-6">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-50 text-primary text-xs font-bold">2</span>
                <h3 className="text-base font-semibold text-text-primary">Insert YouTube Video URL</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  YouTube Video Link
                </label>
                <div className="relative">
                  <Input
                    placeholder="e.g. https://www.youtube.com/watch?v=..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="pr-10"
                  />
                  <Video className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
                </div>
              </div>
            </div>

            {/* Alert / Notification Feedback */}
            {message && (
              <div className={cn(
                "p-4 rounded-xl text-sm border animate-scale-pop flex items-start gap-2.5",
                message.type === 'success' 
                  ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                  : "bg-red-50 text-red-800 border-red-100"
              )}>
                {message.type === 'success' ? (
                  <CheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                ) : (
                  <HelpCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
                )}
                <p className="font-medium leading-relaxed">{message.text}</p>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "w-full py-3 px-4 rounded-xl font-semibold text-sm text-white shadow-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer",
                  isSubmitting 
                    ? "bg-primary/70 cursor-not-allowed" 
                    : "bg-primary hover:bg-primary/95 active:scale-[0.98] hover:shadow-md"
                )}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Saving Video Link...
                  </>
                ) : (
                  <>
                    <FileVideo size={16} />
                    Push Video to Database
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Portal Guidelines Card */}
        <div className="space-y-6">
          
          {/* Quick Guide Card */}
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
              Uploader Quick Guidelines
            </h3>
            
            <ul className="space-y-3.5 text-xs text-text-secondary leading-relaxed">
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                <span>
                  <strong>Fuzzy Search First</strong>: Type the candidate's name in Step 1. If they appear in the search dropdown, click to link them.
                </span>
              </li>
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                <span>
                  <strong>Manual Pre-Registration Fallback</strong>: If the candidate isn't registered, write their full name manually. The recruiter's scanner will auto-match and link it during registration.
                </span>
              </li>
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                <span>
                  <strong>YouTube URL syntax</strong>: Copy the direct link from your browser URL bar or click Share on YouTube.
                </span>
              </li>
            </ul>

            <div className="border-t border-border/60 pt-4 flex justify-between items-center text-xs text-text-tertiary">
              <span>Need help? Contact Admin</span>
              <a 
                href="https://youtube.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-1 text-primary hover:underline font-medium"
              >
                Go to YouTube <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
