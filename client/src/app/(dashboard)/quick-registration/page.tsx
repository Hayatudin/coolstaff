'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import PassportUploader from '@/components/registration/PassportUploader';
import PassportDataFields from '@/components/registration/PassportDataFields';
import { PassportData, WorkExperienceEntry, Broker } from '@/types';
import { Save, Loader2, Trash2, Plus, Phone, Video } from 'lucide-react';
import { allCountries } from '@/data/countries';
import Select from '@/components/ui/Select';
import BrokerSelect from '@/components/ui/BrokerSelect';
import Input from '@/components/ui/Input';
import FileUpload from '@/components/ui/FileUpload';
import MultiSelect from '@/components/ui/MultiSelect';
import { languageOptions } from '@/data/mockData';

const emptyPassportData: PassportData = {
  passportNumber: '', surname: '', givenNames: '', dateOfBirth: '',
  gender: '', nationality: '', issuingCountry: '',
  dateOfIssue: '', dateOfExpiry: '', placeOfBirth: '',
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

      // Resize image to standard width (e.g. 1600px) maintaining aspect ratio
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

export default function QuickRegistrationPage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Passport state
  const [passportImage, setPassportImage] = useState<string | null>(null);
  const [passportData, setPassportData] = useState<PassportData>(emptyPassportData);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Passport full name state
  const [fullName, setFullName] = useState('');

  // Extra fields
  const [maritalStatus, setMaritalStatus] = useState('');
  const [numberOfChildren, setNumberOfChildren] = useState(0);
  const [religion, setReligion] = useState('');
  const [selectedBrokerId, setSelectedBrokerId] = useState('');

  // Document states
  const [cocDocumentUrl, setCocDocumentUrl] = useState<string | null>(null);
  const [labourIdUrl, setLabourIdUrl] = useState<string | null>(null);
  const [candidateIdImageUrl, setCandidateIdImageUrl] = useState<string | null>(null);
  const [relativeIdImageUrl, setRelativeIdImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [allowVideo, setAllowVideo] = useState(false);
  const [agency, setAgency] = useState('');
  const [passportType, setPassportType] = useState('original');

  // Broker list
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [brokersLoading, setBrokersLoading] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calling role custom state variables
  const [facePhotoUrl, setFacePhotoUrl] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [additionalPhones, setAdditionalPhones] = useState<string[]>([]);

  // Pre-registered video auto-fill
  const [matchedVideoBadge, setMatchedVideoBadge] = useState<string | null>(null);

  useEffect(() => {
    const passportNumber = passportData.passportNumber?.trim();
    if (!passportNumber || passportNumber.length < 5) {
      setMatchedVideoBadge(null);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/video-uploads/match?passportNumber=${encodeURIComponent(passportNumber)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.matchFound && data.videoUrl) {
            setVideoUrl(data.videoUrl);
            setMatchedVideoBadge(`🎥 Pre-registered Video Auto-Matched!`);
          }
        }
      } catch (err) {
        console.error('Failed to match pre-registered video:', err);
      }
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [passportData.passportNumber]);

  // Sync passportData givenNames/surname into local fullName state
  useEffect(() => {
    const parts = [];
    if (passportData.surname) parts.push(passportData.surname);
    if (passportData.givenNames) parts.push(passportData.givenNames);

    // Join Surname and GivenNames with a space
    const combined = passportData.surname && passportData.givenNames
      ? `${passportData.surname} ${passportData.givenNames}`
      : parts.join(' ');

    // Only update if it represents a different parsed state to avoid cursor jumping
    const parsedParts = fullName.split(' ');
    let parsedCombined = '';
    if (parsedParts.length > 1) {
      parsedCombined = fullName.trim();
    } else {
      parsedCombined = fullName.trim();
    }

    if (combined.toUpperCase() !== parsedCombined.toUpperCase()) {
      setFullName(combined);
    }
  }, [passportData.givenNames, passportData.surname]);

  // Fetch brokers on mount
  useEffect(() => {
    const fetchBrokers = async () => {
      try {
        const res = await api('/api/brokers');
        const data = await res.json();
        if (Array.isArray(data)) setBrokers(data);
      } catch (err) {
        console.error('Failed to fetch brokers', err);
      } finally {
        setBrokersLoading(false);
      }
    };
    fetchBrokers();
  }, []);

  const handleCreateBroker = async (name: string) => {
    try {
      const res = await api('/api/brokers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const newBroker = await res.json();
        setBrokers(prev => [...prev, newBroker].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedBrokerId(newBroker.id);
      } else {
        alert('Failed to create broker');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating broker');
    }
  };

  // ── OCR Logic (exact copy from registration page) ──
  const performOCR = useCallback(async (imageUrl: string) => {
    setPassportImage(imageUrl);
    setIsProcessing(true);
    setProcessingComplete(false);
    setError(null);
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
      setPassportData(prev => ({
        ...prev,
        ...data,
        surname: data.surname ? data.surname.toUpperCase() : '',
        givenNames: data.givenNames ? data.givenNames.toUpperCase() : ''
      }));
      setProcessingComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan passport');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleFileAsDataURL = (file: File, callback: (base64: string) => void, maxBytes = 50 * 1024 * 1024) => {
    if (file.size > maxBytes) {
      alert(`Max file size is ${maxBytes / (1024 * 1024)}MB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        callback(ev.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePassportChange = (field: keyof PassportData, value: string) => {
    const uppercaseValue = (field === 'surname' || field === 'givenNames') ? value.toUpperCase() : value;
    setPassportData(prev => ({ ...prev, [field]: uppercaseValue }));
  };

  const onFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFullName(val);

    const parts = val.split(',');
    let surname = '';
    let givenNames = '';
    if (parts.length > 1) {
      surname = parts[0].trim();
      givenNames = parts.slice(1).join(',').trim();
    } else {
      // fallback splitting by space
      const spaceParts = val.trim().split(/\s+/);
      if (spaceParts.length > 1) {
        surname = spaceParts[0];
        givenNames = spaceParts.slice(1).join(' ');
      } else {
        surname = spaceParts[0] || '';
        givenNames = '';
      }
    }
    setPassportData(prev => ({
      ...prev,
      givenNames: givenNames.toUpperCase(),
      surname: surname.toUpperCase()
    }));
  };

  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  const handleSave = async () => {
    if (!passportImage) {
      setError('Passport photo upload is required.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!fullName.trim() || !passportData.passportNumber || !passportData.surname) {
      setError('Full Name and Passport Number are required.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!passportType) {
      setError('Passport Type is required.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (selectedLanguages.length === 0) {
      setError('At least one language must be selected.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const isCalling = (session?.user as any)?.role === 'calling';
    if (isCalling && !facePhotoUrl) {
      setError('Face Photo upload is required.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (isCalling && !phone.trim()) {
      setError('Primary Phone Number is required.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!isCalling && !selectedBrokerId) {
      setError('Broker selection is required.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!religion) {
      setError('Religion is required.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!maritalStatus) {
      setError('Marital Status is required.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (selectedLanguages.length === 0) {
      setError('At least one language must be selected.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!cocDocumentUrl || !labourIdUrl || !candidateIdImageUrl || !relativeIdImageUrl || !videoUrl) {
      setError('All documents (COC, Labour ID, Candidate ID, Relative ID, and Video) are required.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!agency) {
      setError('Agency selection is required.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const url = isCalling ? '/api/candidates' : '/api/quick-registrations';
      const bodyPayload = isCalling
        ? {
            passportData: {
              passportNumber: passportData.passportNumber,
              surname: passportData.surname,
              givenNames: passportData.givenNames,
              dateOfBirth: passportData.dateOfBirth,
              gender: passportData.gender,
              nationality: passportData.nationality,
              issuingCountry: passportData.issuingCountry,
              dateOfIssue: passportData.dateOfIssue || new Date().toISOString(),
              dateOfExpiry: passportData.dateOfExpiry,
              placeOfBirth: passportData.placeOfBirth || passportData.nationality || '',
            },
            personalInfo: {
              maritalStatus,
              numberOfChildren,
              religion,
              bloodType: 'O+',
              phone,
              additionalPhones: additionalPhones.filter(Boolean),
              languages: selectedLanguages,
              brokerId: 'calling-broker', // Backend handles auto-connecting to 'Calling' broker
              cocDocumentUrl,
              labourIdUrl,
              candidateIdImageUrl,
              relativeIdImageUrl,
              medicalStatus: 'Pending',
              biometricStatus: 'Pending',
              job: 'Calling',
              educationLevel: 'None',
              skills: [],
              workExperience: [],
            },
            passportImageUrl: passportImage,
            facePhotoUrl: facePhotoUrl,
            videoUrl,
            allowVideo,
            agency,
            status: 'pending',
            registeredById: session?.user?.id || null,
          }
        : {
            passportNumber: passportData.passportNumber,
            surname: passportData.surname,
            givenNames: passportData.givenNames,
            dateOfBirth: passportData.dateOfBirth,
            gender: passportData.gender,
            nationality: passportData.nationality,
            dateOfExpiry: passportData.dateOfExpiry,
            issuingCountry: passportData.issuingCountry,
            placeOfBirth: passportData.placeOfBirth,
            educationLevel: null,
            jobExperience: null,
            maritalStatus,
            numberOfChildren,
            passportImageUrl: passportImage,
            religion,
            brokerId: selectedBrokerId || null,
            relativePhones: null,
            cocDocumentUrl,
            labourIdUrl,
            candidateIdImageUrl,
            relativeIdImageUrl,
            videoUrl,
            allowVideo,
            agency,
            passportType,
            registeredById: session?.user?.id || null,
            languages: selectedLanguages,
          };

      const response = await api(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save');
      }

      const data = await response.json();
      if (isCalling) {
        router.push(`/candidates/${data.id}`);
      } else {
        router.push(`/quick-registration/preview/${data.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">Quick Registration</h1>
            {((session?.user as any)?.role === 'calling') && (
              <span className="px-3 py-1 bg-teal-500/10 text-teal-600 text-xs font-black rounded-full border border-teal-500/20 uppercase tracking-wider animate-pulse">
                Calling Portal
              </span>
            )}
          </div>
          <p className="text-text-tertiary mt-1 text-sm">Scan passport & fill minimal info for Musaned entry.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm font-medium flex flex-col gap-2">
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
                Fill the form manually (keeps passport image)
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 1: Scan Passport */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="bg-gray-50 border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold text-text-primary">1. Scan Passport <span className="text-red-500">*</span></h2>
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
                Fill the form manually
              </button>
            </div>
          )}
          <div className="mt-6 border-t border-border pt-6">
            <div className="animate-fade-in-up">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-1 h-6 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold text-text-primary">Extracted Passport Data</h3>
                {processingComplete && (
                  <span className="px-2.5 py-0.5 bg-success-light text-green-700 text-xs font-medium rounded-full animate-scale-pop">
                    Auto-filled
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <Input
                  label="FULL NAME"
                  value={fullName}
                  onChange={onFullNameChange}
                  placeholder="Enter full name"
                  required
                />
                <Input
                  label="Passport Number"
                  value={passportData.passportNumber}
                  onChange={(e) => handlePassportChange('passportNumber', e.target.value)}
                  placeholder="Enter passport number"
                  required
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 2: Additional Info */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm">
        <div className="bg-gray-50 border-b border-border px-5 py-3 rounded-t-2xl">
          <h2 className="text-base font-semibold text-text-primary">2. Additional Information <span className="text-red-500">*</span></h2>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Passport Type */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Passport Type <span className="text-red-500">*</span></label>
              <div className="flex gap-2 pt-1">
                {['original', 'scan'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPassportType(type)}
                    className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl border transition-all capitalize ${passportType === type
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-white text-text-secondary border-border hover:border-primary/30 hover:bg-primary/5'
                      }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Broker */}
            <div className="flex flex-col relative z-10">
              {((session?.user as any)?.role === 'calling') ? (
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Broker</label>
                  <Input
                    value="Calling"
                    disabled
                    className="bg-gray-100/80 cursor-not-allowed font-bold"
                  />
                </div>
              ) : (
                <BrokerSelect
                  label="Broker"
                  brokers={brokers}
                  value={selectedBrokerId}
                  onChange={setSelectedBrokerId}
                  disabled={brokersLoading}
                  placeholder="Select or add broker..."
                  onCreate={handleCreateBroker}
                  required
                />
              )}
            </div>


            {/* Religion */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Religion <span className="text-red-500">*</span></label>
              <div className="flex gap-2 pt-1">
                {['Muslim', 'Non muslim'].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReligion(r)}
                    className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl border transition-all ${religion === r
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-white text-text-secondary border-border hover:border-primary/30 hover:bg-primary/5'
                      }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>


            {/* Marital Status */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Marital Status <span className="text-red-500">*</span></label>
              <div className="flex gap-3 pt-1">
                {['Single', 'Married'].map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" name="marital" value={s} checked={maritalStatus === s} onChange={() => setMaritalStatus(s)} className="accent-primary w-4 h-4" />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            {/* Number of Children */}
            {maritalStatus === 'Married' && (
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

            {/* Languages Section */}
            <div className="sm:col-span-2 pt-4 border-t border-border/60">
              <MultiSelect
                label="Languages"
                options={languageOptions.map(l => ({ value: l.toUpperCase(), label: l.toUpperCase() }))}
                value={selectedLanguages}
                onChange={setSelectedLanguages}
                placeholder="Select languages"
                searchable
                allowAddCustom
                customStorageKey="custom_languages"
                required
              />
            </div>

            {/* Phone numbers (only for Calling role) */}
            {((session?.user as any)?.role === 'calling') && (
              <div className="sm:col-span-2 space-y-3 pt-4 border-t border-border/60">
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">Phone Numbers <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Primary Phone Number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdditionalPhones(prev => [...prev, ''])}
                    className="px-4 py-2.5 bg-primary/10 text-primary font-bold text-xs rounded-xl hover:bg-primary/20 transition-all flex items-center gap-1.5 border border-primary/20 cursor-pointer"
                  >
                    <Plus size={14} /> Add Phone
                  </button>
                </div>

                {additionalPhones.map((phoneVal, idx) => (
                  <div key={idx} className="flex gap-2 items-center animate-fade-in">
                    <div className="relative flex-1">
                      <Input
                        placeholder={`Additional Phone ${idx + 1}`}
                        value={phoneVal}
                        onChange={(e) => {
                          const newPhones = [...additionalPhones];
                          newPhones[idx] = e.target.value;
                          setAdditionalPhones(newPhones);
                        }}
                      />
                      <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newPhones = additionalPhones.filter((_, i) => i !== idx);
                        setAdditionalPhones(newPhones);
                      }}
                      className="p-2.5 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-150 rounded-xl transition-all border border-red-200 cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STEP 3: Documents */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="bg-gray-50 border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold text-text-primary">3. Documents <span className="text-red-500">*</span></h2>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {((session?.user as any)?.role === 'calling') && (
              <FileUpload
                label="Face Photo"
                shape="rect"
                compact
                preview={facePhotoUrl}
                onFileSelect={(file) => handleFileAsDataURL(file, (base64) => setFacePhotoUrl(base64))}
                onClear={() => setFacePhotoUrl(null)}
                helperText="Face Photo Image — Max 50MB"
                required
              />
            )}
            <FileUpload
              label="COC (Certificate of Competence)"
              shape="rect"
              compact
              preview={cocDocumentUrl}
              onFileSelect={(file) => handleFileAsDataURL(file, (base64) => setCocDocumentUrl(base64))}
              onClear={() => setCocDocumentUrl(null)}
              helperText="COC Document — Max 50MB"
              required
            />
            <FileUpload
              label="Labour ID"
              shape="rect"
              compact
              preview={labourIdUrl}
              onFileSelect={(file) => handleFileAsDataURL(file, (base64) => setLabourIdUrl(base64))}
              onClear={() => setLabourIdUrl(null)}
              helperText="Labour ID Image — Max 50MB"
              required
            />
            <FileUpload
              label="Candidate ID"
              shape="rect"
              compact
              preview={candidateIdImageUrl}
              onFileSelect={(file) => handleFileAsDataURL(file, (base64) => setCandidateIdImageUrl(base64))}
              onClear={() => setCandidateIdImageUrl(null)}
              helperText="Candidate ID Image — Max 50MB"
              required
            />
            <FileUpload
              label="Relative ID"
              shape="rect"
              compact
              preview={relativeIdImageUrl}
              onFileSelect={(file) => handleFileAsDataURL(file, (base64) => setRelativeIdImageUrl(base64))}
              onClear={() => setRelativeIdImageUrl(null)}
              helperText="Relative ID Image — Max 50MB"
              required
            />
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">Candidate Video <span className="text-red-500">*</span></label>
              {videoUrl && (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      placeholder="YouTube Video URL"
                      value={videoUrl}
                      onChange={e => setVideoUrl(e.target.value)}
                      className="pr-10"
                    />
                    <Video className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
                  </div>
                  {matchedVideoBadge && (
                    <p className="text-xs font-semibold text-emerald-600 animate-scale-pop">
                      {matchedVideoBadge}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setVideoUrl(null);
                      setMatchedVideoBadge(null);
                    }}
                    className="text-xs font-bold text-red-600 hover:text-red-800 transition-colors uppercase tracking-wider hover:underline block"
                  >
                    Clear Link & Upload File Instead
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <FileUpload
                    label="Candidate Video"
                    accept="video/*"
                    shape="rect"
                    compact
                    preview={videoUrl}
                    onFileSelect={(file) => handleFileAsDataURL(file, (base64) => setVideoUrl(base64), 50 * 1024 * 1024)}
                    onClear={() => setVideoUrl(null)}
                    helperText="MP4, WebM or MOV — Max 50MB"
                    required
                  />
                </div>
              )}

            </div>

            <div className="md:col-span-2 pt-4 border-t border-border/60">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Agency <span className="text-red-500">*</span></label>
              <select
                value={agency}
                onChange={e => setAgency(e.target.value)}
                className="w-full h-12 px-4 py-2.5 text-sm rounded-xl border border-border bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
              >
                <option value="" disabled>Select Agency...</option>
                <option value="daera">Daera</option>
                <option value="coolstaff">Coolstaff</option>
                <option value="boss">Boss</option>
              </select>
            </div>
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
