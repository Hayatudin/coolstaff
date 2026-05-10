import React, { useRef } from 'react';
import { UploadCloud, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { PassportData, CandidatePersonalInfo } from '@/types';
import { ExtractedMusanedData } from '@/lib/parsers/musaned';

interface MusanedUploaderProps {
  onDataExtracted: (data: ExtractedMusanedData) => void;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
}

export default function MusanedUploader({ onDataExtracted, isProcessing, setIsProcessing }: MusanedUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<boolean>(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a valid PDF document.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/extract/musaned', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to process PDF');
      }

      onDataExtracted(result.data);
      setSuccess(true);
      
      // Reset after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during extraction');
    } finally {
      setIsProcessing(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="bg-surface rounded-2xl border border-dashed border-primary/40 p-8 text-center transition-all hover:bg-primary/5">
      <input 
        type="file" 
        accept="application/pdf" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange}
      />

      <div className="max-w-md mx-auto">
        {isProcessing ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Loader2 size={32} className="text-primary animate-spin" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">Extracting Data...</p>
              <p className="text-sm text-text-tertiary">Reading Musaned CV PDF</p>
            </div>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center gap-4 py-6 animate-scale-pop">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle2 size={32} className="text-success" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">Extraction Successful!</p>
              <p className="text-sm text-text-tertiary">Form fields have been populated</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText size={32} className="text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary mb-1">Import from Musaned</p>
              <p className="text-sm text-text-tertiary mb-6">Upload a Musaned Candidate CV (PDF) to automatically fill the registration form</p>
              <button className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
                Select PDF File
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl text-left flex items-start gap-3 animate-fade-in-up">
            <div className="text-red-500 mt-0.5">!</div>
            <div>
              <p className="text-sm font-bold text-red-800">Extraction Error</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
