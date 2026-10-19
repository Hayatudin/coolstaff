'use client';

import React, { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface FileUploadProps {
  label?: string;
  accept?: string;
  onFileSelect: (file: File) => void;
  preview?: string | null;
  onClear?: () => void;
  compact?: boolean;
  shape?: 'rect' | 'circle';
  helperText?: string;
  icon?: React.ReactNode;
  required?: boolean;
}

function validateUploadedFile(file: File, accept: string): { valid: boolean; error?: string } {
  const isVideoAccept = accept.includes('video');
  const isImageAccept = accept.includes('image');

  const fileType = (file.type || '').toLowerCase();
  const fileName = (file.name || '').toLowerCase();

  const isVideo = fileType.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv|m4v|3gp|wmv)$/i.test(fileName);
  const isImage = fileType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|avif|svg)$/i.test(fileName);
  const isPdf = fileType === 'application/pdf' || /\.pdf$/i.test(fileName);

  if (isVideoAccept && !isImageAccept) {
    if (!isVideo) {
      return { valid: false, error: 'Only video files (MP4, WebM, MOV) are allowed for this upload.' };
    }
    return { valid: true };
  }

  if (isImageAccept && !isVideoAccept) {
    if (isVideo) {
      return { valid: false, error: 'Videos are not allowed here. Please upload an image file (JPG, PNG, WebP).' };
    }
    if (!isImage && !(accept.includes('pdf') && isPdf)) {
      return { valid: false, error: 'Please upload an image file (JPG, PNG, WebP).' };
    }
    return { valid: true };
  }

  return { valid: true };
}

export default function FileUpload({
  label,
  accept = 'image/*',
  onFileSelect,
  preview,
  onClear,
  compact = false,
  shape = 'rect',
  helperText,
  icon,
  required = false,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const check = validateUploadedFile(file, accept);
    if (!check.valid) {
      alert(check.error);
      return;
    }
    onFileSelect(file);
  }, [accept, onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateUploadedFile(file, accept);
    if (!check.valid) {
      alert(check.error);
      if (e.target) e.target.value = '';
      return;
    }
    onFileSelect(file);
    if (e.target) e.target.value = '';
  }, [accept, onFileSelect]);

  const isVideoField = accept.includes('video');

  if (preview) {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-text-secondary">{label} {required && <span className="text-red-500">*</span>}</label>
        )}
        <div className={cn(
          'relative group overflow-hidden border-2 border-border bg-surface',
          shape === 'circle' ? 'w-32 h-32 rounded-full' : 'rounded-lg',
          compact && shape !== 'circle' && 'h-40',
          !compact && shape !== 'circle' && 'h-52'
        )}>
          {isVideoField ? (
            <video
              src={preview}
              controls
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={preview}
              alt={label || 'Uploaded file'}
              className="w-full h-full object-cover"
            />
          )}
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="absolute top-2 right-2 p-1.5 bg-danger text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer hover:bg-red-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    );
  }

  const resolvedAccept = accept === 'image/*' 
    ? 'image/png,image/jpeg,image/jpg,image/webp,image/*' 
    : accept === 'video/*' 
    ? 'video/mp4,video/webm,video/quicktime,video/*' 
    : accept;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-text-secondary">{label} {required && <span className="text-red-500">*</span>}</label>
      )}
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-3 border-2 border-dashed cursor-pointer',
          'transition-all duration-300',
          shape === 'circle' ? 'w-32 h-32 rounded-full' : 'rounded-lg',
          compact && shape !== 'circle' ? 'py-6 px-4' : 'py-10 px-6',
          isDragOver
            ? 'border-primary bg-primary-50/50 scale-[1.02]'
            : 'border-border hover:border-primary/50 hover:bg-primary-50/20 bg-surface'
        )}
      >
        <input
          type="file"
          accept={resolvedAccept}
          onChange={handleFileInput}
          className="hidden"
        />
        <div className={cn(
          'p-3 rounded-full transition-colors duration-200',
          isDragOver ? 'bg-primary/10' : 'bg-lavender-dark'
        )}>
          {icon || (compact ? <ImageIcon size={20} className="text-primary" /> : <Upload size={24} className="text-primary" />)}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-text-primary">
            {compact ? 'Upload' : 'Drag & drop or click to upload'}
          </p>
          {helperText && (
            <p className="text-xs text-text-tertiary mt-1">{helperText}</p>
          )}
        </div>
      </label>
    </div>
  );
}
