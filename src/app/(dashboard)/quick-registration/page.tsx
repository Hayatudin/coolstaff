'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PassportUploader from '@/components/registration/PassportUploader';
import PassportDataFields from '@/components/registration/PassportDataFields';
import { PassportData, WorkExperienceEntry } from '@/types';
import { Save, Loader2, Trash2, Plus } from 'lucide-react';
import { allCountries } from '@/data/countries';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';

const emptyPassportData: PassportData = {
  passportNumber: '', surname: '', givenNames: '', dateOfBirth: '',
  gender: '', nationality: '', issuingCountry: '',
  dateOfIssue: '', dateOfExpiry: '', placeOfBirth: '',
};

export default function QuickRegistrationPage() {
  const router = useRouter();

  // Passport state
  const [passportImage, setPassportImage] = useState<string | null>(null);
  const [passportData, setPassportData] = useState<PassportData>(emptyPassportData);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Extra fields
  const [educationLevel, setEducationLevel] = useState('');
  const [workExperience, setWorkExperience] = useState<WorkExperienceEntry[]>([{ experienceStatus: 'New', country: '', yearsOfExperience: '' }]);
  const [maritalStatus, setMaritalStatus] = useState('');
  const [numberOfChildren, setNumberOfChildren] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── OCR Logic (exact copy from registration page) ──
  const performOCR = useCallback(async (imageUrl: string) => {
    setPassportImage(imageUrl);
    setIsProcessing(true);
    setProcessingComplete(false);
    setError(null);
    setOcrProgress(0);
    try {
      const Tesseract = await import('tesseract.js');
      setOcrProgress(10);
      const result = await Tesseract.recognize(imageUrl, 'eng', {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') setOcrProgress(10 + m.progress * 80);
        },
      });
      setOcrProgress(90);
      const ocrText = result.data.text;
      const response = await fetch('/api/ocr/passport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ocrText }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to parse passport data');
      setOcrProgress(100);
      setPassportData(prev => ({ ...prev, ...data }));
      setProcessingComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan passport');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handlePassportChange = (field: keyof PassportData, value: string) => {
    setPassportData(prev => ({ ...prev, [field]: value }));
  };

  const updateExperience = (index: number, field: keyof WorkExperienceEntry, value: string) => {
    const updated = [...workExperience];
    updated[index] = { ...updated[index], [field]: field === 'country' ? value.toUpperCase() : value };
    setWorkExperience(updated);
  };

  const removeExperience = (index: number) => {
    const updated = [...workExperience];
    updated.splice(index, 1);
    setWorkExperience(updated);
  };

  const addExperience = () => {
    const newExp: WorkExperienceEntry = { experienceStatus: 'Have experience', country: '', yearsOfExperience: '' };
    setWorkExperience([...workExperience, newExp]);
  };

  const handleSave = async () => {
    if (!passportData.passportNumber && !passportData.surname) {
      setError('Please scan a passport or fill in at least the Passport Number and Surname.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/quick-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passportNumber: passportData.passportNumber,
          surname: passportData.surname,
          givenNames: passportData.givenNames,
          dateOfBirth: passportData.dateOfBirth,
          gender: passportData.gender,
          nationality: passportData.nationality,
          dateOfExpiry: passportData.dateOfExpiry,
          issuingCountry: passportData.issuingCountry,
          placeOfBirth: passportData.placeOfBirth,
          educationLevel,
          jobExperience: JSON.stringify(workExperience),
          maritalStatus,
          numberOfChildren,
          passportImageUrl: passportImage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save');
      }

      const data = await response.json();
      router.push(`/quick-registration/preview/${data.id}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">Quick Registration</h1>
        <p className="text-text-tertiary mt-1 text-sm">Scan passport & fill minimal info for Musaned entry.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm font-medium">
          {error}
        </div>
      )}

      {/* STEP 1: Scan Passport */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="bg-gray-50 border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold text-text-primary">1. Scan Passport</h2>
        </div>
        <div className="p-4 sm:p-6">
          <PassportUploader
            onImageUploaded={performOCR}
            isProcessing={isProcessing}
            processingComplete={processingComplete}
            passportImage={passportImage}
            ocrProgress={ocrProgress}
          />
          {passportImage && (
            <div className="mt-6 border-t border-border pt-6">
              <PassportDataFields
                data={passportData}
                onChange={handlePassportChange}
                animatingFields={new Set()}
                isExtracted={processingComplete}
              />
            </div>
          )}
        </div>
      </div>

      {/* STEP 2: Additional Info */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="bg-gray-50 border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold text-text-primary">2. Additional Information</h2>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Education Level */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Education Level</label>
              <select
                value={educationLevel}
                onChange={e => setEducationLevel(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
              >
                <option value="">Select...</option>
                <option value="No Education">No Education</option>
                <option value="Primary">Primary</option>
                <option value="Secondary">Secondary</option>
                <option value="High School">High School</option>
                <option value="Diploma">Diploma</option>
                <option value="Degree">Degree</option>
              </select>
            </div>

            {/* Job Experience */}
            <div className="sm:col-span-2 space-y-4 pt-4 border-t border-border mt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">Job / Experience</label>
              </div>
              
              <div className="space-y-4">
                {workExperience.map((exp, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 relative p-4 bg-gray-50/50 rounded-xl border border-border/50">
                    <Select
                      label="Experience"
                      required
                      options={[{ value: 'Have experience', label: 'Have experience' }, { value: 'New', label: 'New' }]}
                      value={exp.experienceStatus}
                      onChange={v => updateExperience(index, 'experienceStatus', v)}
                    />

                    {exp.experienceStatus === 'Have experience' && (
                      <>
                        <Select
                          label="Country"
                          required
                          searchable
                          options={allCountries.map(c => ({ value: c.toUpperCase(), label: c.toUpperCase() }))}
                          value={exp.country}
                          onChange={v => updateExperience(index, 'country', v)}
                          placeholder="Select country"
                        />
                        <div className="relative">
                          <Input
                            label="Years Of Experience"
                            type="number"
                            required
                            value={exp.yearsOfExperience}
                            onChange={e => updateExperience(index, 'yearsOfExperience', e.target.value)}
                          />
                          {workExperience.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeExperience(index)}
                              className="absolute right-0 -top-8 text-danger hover:bg-danger/10 p-1.5 rounded-md transition-colors"
                              title="Remove Experience"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                <div className="flex justify-start">
                   <button
                     type="button"
                     onClick={addExperience}
                     className="text-sm text-primary font-semibold flex items-center gap-1.5 hover:underline"
                   >
                     <Plus size={16} /> Add Another Experience
                   </button>
                </div>
              </div>
            </div>

            {/* Marital Status */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Marital Status</label>
              <div className="flex gap-3 pt-1">
                {['Single', 'Married', 'Divorced'].map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" name="marital" value={s} checked={maritalStatus === s} onChange={() => setMaritalStatus(s)} className="accent-primary w-4 h-4" />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            {/* Number of Children */}
            {(maritalStatus === 'Married' || maritalStatus === 'Divorced') && (
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Number of Children</label>
                <input
                  type="number"
                  min={0}
                  value={numberOfChildren}
                  onChange={e => setNumberOfChildren(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface/80 backdrop-blur-md border-t border-border p-3 sm:p-4 z-30 lg:pl-64">
        <div className="max-w-3xl mx-auto flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="px-5 sm:px-6 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
          >
            {isSubmitting ? (
              <><Loader2 size={18} className="animate-spin" /> Saving...</>
            ) : (
              <><Save size={18} /> Save & View Copy Page</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
