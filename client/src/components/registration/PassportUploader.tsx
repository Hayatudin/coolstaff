'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Upload, ScanLine, FileCheck } from 'lucide-react';

interface PassportUploaderProps {
  onImageUploaded: (imageUrl: string) => void;
  isProcessing: boolean;
  processingComplete: boolean;
  passportImage: string | null;
  ocrProgress?: number;
}

export default function PassportUploader({
  onImageUploaded,
  isProcessing,
  processingComplete,
  passportImage,
  ocrProgress = 0,
}: PassportUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      alert('Please upload an image with Max 50MB');
      return;
    }

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onImageUploaded(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageUploaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset value so the same file can be selected again
    if (e.target) e.target.value = '';
  }, [handleFile]);

  const handleScanAnother = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        id="passport-upload-input"
        type="file"
        ref={fileInputRef}
        accept="image/png,image/jpeg,image/jpg"
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Show passport image with scanning overlay */}
      {passportImage ? (
        <div className="animate-fade-in-up">
          <div className="relative rounded-2xl overflow-hidden border-2 border-primary/20 bg-surface max-w-2xl mx-auto">
            {/* Passport Image */}
            <div className="relative aspect-[3/2] max-h-[350px]">
              <img
                src={passportImage}
                alt="Uploaded passport"
                className="w-full h-full object-contain bg-gray-50 p-4"
              />

              {/* Scanning overlay */}
              {isProcessing && (
                <>
                  <div className="absolute inset-0 bg-primary/5" />
                  <div className="scan-animation" />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 w-full max-w-xs px-4">
                    <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg w-fit">
                      <ScanLine size={16} className="text-primary animate-pulse" />
                      <span className="text-sm font-medium text-primary">
                        {ocrProgress > 0 ? `Scanning: ${Math.round(ocrProgress)}%` : 'Scanning passport data...'}
                      </span>
                    </div>
                    {ocrProgress > 0 && (
                      <div className="w-full bg-white/50 backdrop-blur-sm rounded-full h-1.5 overflow-hidden border border-white/20">
                        <div 
                          className="bg-primary h-full transition-all duration-300"
                          style={{ width: `${ocrProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Complete overlay */}
              {processingComplete && !isProcessing && (
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-success/90 backdrop-blur-sm px-3 py-1.5 rounded-full animate-scale-pop">
                  <FileCheck size={14} className="text-white" />
                  <span className="text-xs font-medium text-white">Data Extracted</span>
                </div>
              )}
            </div>
            
            {/* Action Bar */}
            {processingComplete && !isProcessing && (
              <div className="bg-surface border-t border-border p-3 flex justify-center">
                <button
                  type="button"
                  onClick={handleScanAnother}
                  className="text-sm font-medium text-primary hover:text-primary-dark hover:underline flex items-center gap-2 transition-colors"
                >
                  <Upload size={16} /> Scan Another Passport
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Upload zone */
        <label
          htmlFor="passport-upload-input"
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-4 max-w-2xl mx-auto',
            'py-16 px-8 rounded-2xl border-2 border-dashed cursor-pointer',
            'transition-all duration-300 group',
            isDragOver
              ? 'border-primary bg-primary-50/60 scale-[1.01] shadow-xl shadow-primary/10'
              : 'border-border hover:border-primary/40 hover:bg-primary-50/20 bg-surface'
          )}
        >
          <div className={cn(
            'p-5 rounded-2xl transition-all duration-300',
            isDragOver ? 'bg-primary/10 scale-110' : 'bg-lavender-dark group-hover:bg-primary-50'
          )}>
            <Upload size={36} className={cn(
              'transition-colors duration-200',
              isDragOver ? 'text-primary' : 'text-primary/60 group-hover:text-primary'
            )} />
          </div>

          <div className="text-center">
            <p className="text-base font-semibold text-text-primary mb-1">
              Upload Passport Image or Take Photo
            </p>
            <p className="text-sm text-text-tertiary">
              Use camera, drag & drop, or <span className="text-primary font-medium">browse files</span>
            </p>
            <p className="text-xs text-text-tertiary mt-2">
              Supports JPG, PNG • Max 50MB
            </p>
          </div>
        </label>
      )}
    </>
  );
}
