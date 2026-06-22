'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import FileUpload from '@/components/ui/FileUpload';
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

export default function PassportRegistrationPage() {
  const router = useRouter();
  const [form, setForm] = useState<PassportForm>(emptyForm);
  const [passportImage, setPassportImage] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleFieldChange = (field: 'passportNumber' | 'fullName', value: string) => {
    const cleanValue = value.toUpperCase();
    setForm(prev => ({ ...prev, [field]: cleanValue }));
  };

  // Auto-lookup Candidate by Passport Number
  useEffect(() => {
    const passportNo = form.passportNumber.trim();
    if (!passportNo || passportNo.length < 5) return;

    const delayDebounceFn = setTimeout(async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const response = await fetch(`${baseUrl}/api/candidates/by-passport/${encodeURIComponent(passportNo)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.found && data.fullName) {
            setForm(prev => ({
              ...prev,
              fullName: data.fullName
            }));
          }
        }
      } catch (err) {
        console.error('Failed to lookup candidate name:', err);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [form.passportNumber]);

  const handleFileSelect = (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      alert('File is too large. Max size is 50MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const base64 = e.target.result as string;
        setPassportImage(base64);
        setForm(prev => ({ ...prev, passportImageUrl: base64 }));
      }
    };
    reader.readAsDataURL(file);
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
      
      // Smooth scroll to top
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
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl border border-emerald-100 text-sm font-medium animate-scale-pop">
          <div>Passport registered successfully! You can register another one or view it in the Available Passports page.</div>
        </div>
      )}

      {/* Form Details */}
      <form onSubmit={handleSave} className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="bg-gray-50 border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold text-text-primary">Passport Information</h2>
        </div>
        <div className="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <Input
              label="Passport Number"
              value={form.passportNumber}
              onChange={(e) => handleFieldChange('passportNumber', e.target.value)}
              placeholder="Enter passport number"
              required
            />

            <Input
              label="Full Name"
              value={form.fullName}
              onChange={(e) => handleFieldChange('fullName', e.target.value)}
              placeholder="Enter full name"
              required
            />

            {/* Compact File Upload at the bottom */}
            <div className="sm:col-span-2 pt-4 border-t border-border">
              <FileUpload
                label="Passport Image (Optional)"
                compact
                preview={passportImage}
                onFileSelect={handleFileSelect}
                onClear={() => setPassportImage(null)}
                helperText="JPG or PNG — Max 50MB"
              />
            </div>
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
