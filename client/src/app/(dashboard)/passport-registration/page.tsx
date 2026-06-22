'use client';

import React, { useState } from 'react';
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

  // Handlers for manual passport image upload (No OCR)
  const handleImageUploaded = (imageUrl: string) => {
    setPassportImage(imageUrl);
    setForm(prev => ({ ...prev, passportImageUrl: imageUrl }));
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
          passportImageUrl: passportImage, // passport image is optional and can be null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save passport');
      }

      setSuccess(true);
      setForm(emptyForm);
      setPassportImage(null);
      
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
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl border border-emerald-100 text-sm font-medium animate-scale-pop">
          <div>Passport registered successfully! You can register another one or view it in the Available Passports page.</div>
        </div>
      )}

      {/* Passport Image Upload (Optional) */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="bg-gray-50 border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold text-text-primary">1. Passport Image (Optional)</h2>
        </div>
        <div className="p-4 sm:p-6">
          <PassportUploader
            onImageUploaded={handleImageUploaded}
            isProcessing={false}
            processingComplete={!!passportImage}
            passportImage={passportImage}
          />
        </div>
      </div>

      {/* Form Details */}
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
