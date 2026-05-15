'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Download, ChevronDown, FileText, FileImage, File, Check } from 'lucide-react';
import { DownloadFormat } from '@/types';

interface DownloadButtonProps {
  onDownload: (format: DownloadFormat) => void;
  disabled?: boolean;
}

const formats: { value: DownloadFormat; label: string; icon: React.ReactNode }[] = [
  { value: 'pdf', label: 'PDF Document', icon: <FileText size={14} className="text-red-500" /> },
  { value: 'doc', label: 'Word Document', icon: <File size={14} className="text-blue-500" /> },
  { value: 'jpg', label: 'JPG Image', icon: <FileImage size={14} className="text-green-500" /> },
];

export default function DownloadButton({ onDownload, disabled = false }: DownloadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [downloading, setDownloading] = useState<DownloadFormat | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDownload = async (format: DownloadFormat) => {
    setDownloading(format);
    setIsOpen(false);
    onDownload(format);
    setTimeout(() => setDownloading(null), 2000);
  };

  return (
    <div ref={ref} className="relative inline-flex">
      <div className="inline-flex rounded-xl overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => handleDownload('pdf')}
          disabled={disabled || downloading !== null}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 cursor-pointer',
            'bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {downloading ? (
            <><svg className="animate-spin-slow h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Downloading...</>
          ) : (
            <><Download size={16} />Download CV</>
          )}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'flex items-center px-2.5 border-l border-primary-dark text-white transition-all duration-200 cursor-pointer',
            'bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <ChevronDown size={14} className={cn('transition-transform', isOpen && 'rotate-180')} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1.5 w-48 bg-surface border border-border rounded-xl shadow-xl z-50 animate-dropdown overflow-hidden py-1">
          {formats.map(f => (
            <button key={f.value} type="button" onClick={() => handleDownload(f.value)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-primary-50 transition-colors cursor-pointer">
              {f.icon}<span>{f.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
