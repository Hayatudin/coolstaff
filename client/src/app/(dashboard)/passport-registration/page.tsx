'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import PassportUploader from '@/components/registration/PassportUploader';
import { Save, Loader2 } from 'lucide-react';
import Input from '@/components/ui/Input';

interface PassportForm {
  passportNumber: string;
  fullName: string;
  passportImageUrl: string;
}

const emptyForm: PassportForm = {
  passportNumber: '',
  fullName: '',
  passportImageUrl: '',
};

const preprocessImageForOcr = (dataUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      const maxDim = 1600;
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

export default function PassportRegistrationPage() {
  const router = useRouter();
  const [form, setForm] = useState<PassportForm>(emptyForm);
  
  // OCR Scan states
  const [passportImage, setPassportImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleFieldChange = (field: 'passportNumber' | 'fullName', value: string) => {
    const cleanValue = value.toUpperCase();
    setForm(prev => ({ ...prev, [field]: cleanValue }));
  };

  // Perform OCR Scanning
  const performOCR = useCallback(async (imageUrl: string) => {
    setPassportImage(imageUrl);
    setIsProcessing(true);
    setProcessingComplete(false);
    setError(null);
    setSuccess(false);
    setOcrProgress(0);
    try {
      const preprocessedUrl = await preprocessImageForOcr(imageUrl);
      setPassportImage(preprocessedUrl);

      const Tesseract = await import('tesseract.js');
      setOcrProgress(10);
      const result = await Tesseract.recognize(preprocessedUrl, 'eng', {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') setOcrProgress(10 + m.progress * 80);
        },
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789< '
      } as any);
      
      setOcrProgress(90);
      const ocrText = result.data.text;
      const response = await api('/api/ocr/passport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ocrText }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to parse passport data');
      
      setOcrProgress(100);
      
      // Compute fullName from surname and givenNames if available
      const parts = [];
      if (data.surname) parts.push(data.surname.trim());
      if (data.givenNames) parts.push(data.givenNames.trim());
      const computedName = parts.join(' ').toUpperCase();

      // Auto-fill form fields
      setForm({
        passportNumber: data.passportNumber ? data.passportNumber.toUpperCase() : '',
        fullName: computedName,
        passportImageUrl: preprocessedUrl,
      });
      setProcessingComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan passport');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Handlers for manual passport image upload
  const handleImageUploaded = (imageUrl: string) => {
    setPassportImage(imageUrl);
    setForm(prev => ({ ...prev, passportImageUrl: imageUrl }));
    setProcessingComplete(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.passportNumber.trim()) {
      setError('Passport Number is required.');
      return;
    }
    if (!form.fullName.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!passportImage) {
      setError('Passport Image is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await api('/api/passports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passportNumber: form.passportNumber,
          fullName: form.fullName,
          passportImageUrl: passportImage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save passport');
      }

      setSuccess(true);
      setForm(emptyForm);
      setPassportImage(null);
      setProcessingComplete(false);
      
      // Smooth scroll to top to see success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">Passport Registration</h1>
        <p className="text-text-tertiary mt-1 text-sm">Register passport records for quick management and tracking.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm font-medium flex flex-col gap-2 animate-scale-pop">
          <div>{error}</div>
          {passportImage && (
            <div>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setProcessingComplete(true);
                }}
                className="text-xs font-bold text-primary hover:underline uppercase tracking-wider block"
              >
                Fill form manually (keeps passport image)
              </button>
            </div>
          )}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl border border-emerald-100 text-sm font-medium animate-scale-pop">
          <div>Passport registered successfully! You can register another one or view it in the Available Passports page.</div>
        </div>
      )}

      {/* STEP 1: Scan Passport */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="bg-gray-50 border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold text-text-primary">1. Passport Image <span className="text-red-500">*</span></h2>
        </div>
        <div className="p-4 sm:p-6">
          <PassportUploader
            onImageUploaded={performOCR}
            isProcessing={isProcessing}
            processingComplete={processingComplete}
            passportImage={passportImage}
            ocrProgress={ocrProgress}
          />
          {passportImage && !processingComplete && !isProcessing && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setProcessingComplete(true);
                }}
                className="text-sm font-semibold text-primary hover:text-primary-dark underline"
              >
                Fill form manually
              </button>
            </div>
          )}
        </div>
      </div>

      {/* STEP 2: Form Details */}
      <form onSubmit={handleSave} className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="bg-gray-50 border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold text-text-primary">2. Passport Information</h2>
        </div>
        <div className="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <Input
              label="Full Name"
              value={form.fullName}
              onChange={(e) => handleFieldChange('fullName', e.target.value)}
              placeholder="Enter full name"
              required
            />
            
            <Input
              label="Passport Number"
              value={form.passportNumber}
              onChange={(e) => handleFieldChange('passportNumber', e.target.value)}
              placeholder="Enter passport number"
              required
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm cursor-pointer"
            >
              {isSubmitting ? (
                <><Loader2 size={18} className="animate-spin" /> Saving...</>
              ) : (
                <><Save size={18} /> Register Passport</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
