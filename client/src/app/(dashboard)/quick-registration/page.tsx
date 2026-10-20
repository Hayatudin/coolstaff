'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { getApiBaseUrl } from '@/lib/utils';
import PassportUploader from '@/components/registration/PassportUploader';
import PassportDataFields from '@/components/registration/PassportDataFields';
import { PassportData, WorkExperienceEntry, Broker } from '@/types';
import { Save, Loader2, Trash2, Plus, Phone } from 'lucide-react';
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

const OFFICES = [
  { id: 'ussus', name: 'USSUS' },
  { id: 'al-shablan', name: 'AL-Shablan' },
  { id: 'alm', name: 'ALMERSAH' },
  { id: 'almala', name: 'ALMALA' },
  { id: 'ka7', name: 'KAAFAAT' },
  { id: 'ku2', name: 'KHUZAM' },
  { id: 'ma', name: 'MA Standard' },
  { id: 'ra', name: 'RAYAAT' },
  { id: 'vision', name: 'Vision Layout' },
];

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
  const isCalling = (session?.user as any)?.role === 'calling';

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
  const [allowVideo, setAllowVideo] = useState(false);
  const [laborID, setLaborID] = useState('');
  const [agency, setAgency] = useState('');
  const [office, setOffice] = useState('');
  const [passportType, setPassportType] = useState('original');

  // Broker list
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [brokersLoading, setBrokersLoading] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calling role custom state variables
  const [facePhotoUrl, setFacePhotoUrl] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [additionalPhones, setAdditionalPhones] = useState<string[]>([]);

  // Work Experience entries
  const [experiences, setExperiences] = useState<WorkExperienceEntry[]>([
    { experienceStatus: 'New', country: '', yearsOfExperience: '' }
  ]);

  const addExperience = () => {
    const newExp: WorkExperienceEntry = { experienceStatus: 'Have experience', country: '', yearsOfExperience: '' };
    setExperiences(prev => [...prev, newExp]);
  };

  const updateExperience = (index: number, field: keyof WorkExperienceEntry, value: string) => {
    setExperiences(prev => {
      const currentList = prev.length > 0 ? prev : [{ experienceStatus: 'New', country: '', yearsOfExperience: '' }];
      return currentList.map((item, idx) => {
        if (idx === index) {
          const newItem = { ...item, [field]: field === 'country' ? value.toUpperCase() : value };
          if (field === 'experienceStatus' && (value === 'New' || value === 'No experience')) {
            newItem.country = '';
            newItem.yearsOfExperience = '';
          }
          return newItem;
        }
        return item;
      });
    });
  };

  const removeExperience = (index: number) => {
    setExperiences(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated.length > 0 ? updated : [{ experienceStatus: 'New', country: '', yearsOfExperience: '' }];
    });
  };

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

  const handleFileAsDataURL = (file: File, callback: (base64: string) => void, maxBytes = 50 * 1024 * 1024) => {
    if (file.size > maxBytes) {
      alert(`Max file size is ${maxBytes / (1024 * 1024)}MB`);
      return;
    }

    const fileType = (file.type || '').toLowerCase();
    const fileName = (file.name || '').toLowerCase();
    const isVideo = fileType.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv|m4v|3gp|wmv)$/i.test(fileName);
    if (isVideo) {
      alert('Videos are not allowed here. Please upload an image file (JPG, PNG, WebP).');
      return;
    }

    const isImage = fileType.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp|gif|avif)$/i.test(fileName) || fileType === 'application/pdf' || /\.pdf$/i.test(fileName);
    if (!isImage) {
      alert('Please upload an image file (JPG, PNG, WebP).');
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

  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  const handleSave = async () => {
    if (!passportImage) {
      setError('Passport photo upload is required.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!fullName.trim() || !passportData.passportNumber) {
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

    const invalidExp = experiences.find(e => e.experienceStatus === 'Have experience' && (!e.country || !e.yearsOfExperience?.trim()));
    if (invalidExp) {
      setError('Please specify both Country and Years of experience for your work experience entry.');
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

    if (!isCalling) {
      if (!laborID || !candidateIdImageUrl || !relativeIdImageUrl) {
        setError('Documents (Labor ID, Candidate ID, and Relative ID) are required.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    if (!agency) {
      setError('Agency selection is required.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (isCalling && !office) {
      setError('Office selection is required.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const nameParts = fullName.trim().split(/\s+/);
      let payloadGivenNames = '';
      let payloadSurname = '';
      if (nameParts.length >= 3) {
        payloadGivenNames = nameParts.slice(0, 2).join(' ');
        payloadSurname = nameParts.slice(2).join(' ');
      } else if (nameParts.length === 2) {
        payloadGivenNames = nameParts[0];
        payloadSurname = nameParts[1];
      } else {
        payloadGivenNames = nameParts[0] || '';
        payloadSurname = '';
      }

      const url = isCalling ? '/api/candidates' : '/api/quick-registrations';
      const bodyPayload = isCalling
        ? {
            passportData: {
              passportNumber: passportData.passportNumber,
              surname: payloadSurname.toUpperCase().trim(),
              givenNames: payloadGivenNames.toUpperCase().trim(),
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
              laborID: laborID || null,
              candidateIdImageUrl,
              relativeIdImageUrl,
              medicalStatus: 'Pending',
              biometricStatus: 'Pending',
              job: 'Calling',
              educationLevel: 'None',
              skills: [],
              workExperience: experiences.map(e => ({
                experienceStatus: e.experienceStatus,
                country: e.country ? e.country.toUpperCase() : '',
                yearsOfExperience: e.yearsOfExperience || '0'
              })),
            },
            laborID: laborID || null,
            passportImageUrl: passportImage,
            facePhotoUrl: facePhotoUrl,
            videoUrl: null,
            allowVideo,
            agency,
            office,
            isCalling: true,
            status: 'pending',
            registeredById: session?.user?.id || null,
          }
        : {
            passportNumber: passportData.passportNumber,
            surname: payloadSurname.toUpperCase().trim(),
            givenNames: payloadGivenNames.toUpperCase().trim(),
            dateOfBirth: passportData.dateOfBirth,
            gender: passportData.gender,
            nationality: passportData.nationality,
            dateOfExpiry: passportData.dateOfExpiry,
            issuingCountry: passportData.issuingCountry,
            placeOfBirth: passportData.placeOfBirth,
            educationLevel: null,
            jobExperience: JSON.stringify(experiences.map(e => ({
              experienceStatus: e.experienceStatus,
              country: e.country ? e.country.toUpperCase() : '',
              yearsOfExperience: e.yearsOfExperience || '0'
            }))),
            maritalStatus,
            numberOfChildren,
            passportImageUrl: passportImage,
            religion,
            brokerId: selectedBrokerId || null,
            relativePhones: null,
            cocDocumentUrl,
            labourIdUrl: null,
            laborID,
            candidateIdImageUrl,
            relativeIdImageUrl,
            videoUrl: null,
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

      {/* STEP 1: Passport Information */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="bg-gray-50 border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold text-text-primary">
            1. Passport Information <span className="text-red-500">*</span>
          </h2>
        </div>
        <div className="p-4 sm:p-6">
          <div className="animate-fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <Input
                label="FULL NAME"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
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

            {/* Work Experience Section */}
            <div className="sm:col-span-2 space-y-4 pt-4 border-t border-border/60">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Work Experience
              </label>

              <div className="space-y-4">
                {experiences.map((exp, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-xl border border-border/50 bg-gray-50/50 relative animate-fade-in">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                        Experience
                      </label>
                      <select
                        value={exp.experienceStatus}
                        onChange={e => updateExperience(index, 'experienceStatus', e.target.value)}
                        className="w-full h-11 px-3 py-2 text-sm rounded-xl border border-border bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                      >
                        <option value="New">New</option>
                        <option value="Have experience">Have experience</option>
                      </select>
                    </div>

                    {exp.experienceStatus === 'Have experience' && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                            Country <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={exp.country}
                            onChange={e => updateExperience(index, 'country', e.target.value)}
                            className="w-full h-11 px-3 py-2 text-sm rounded-xl border border-border bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                            required
                          >
                            <option value="" disabled>Select Country...</option>
                            {allCountries.map(c => (
                              <option key={c} value={c.toUpperCase()}>{c.toUpperCase()}</option>
                            ))}
                          </select>
                        </div>

                        <div className="relative">
                          <Input
                            label="Years Of Experience"
                            type="number"
                            min="1"
                            value={exp.yearsOfExperience}
                            onChange={e => updateExperience(index, 'yearsOfExperience', e.target.value)}
                            placeholder="e.g. 2"
                            required
                          />
                          {experiences.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeExperience(index)}
                              className="absolute right-0 -top-6 text-red-500 hover:text-red-700 p-1 cursor-pointer"
                              title="Remove Experience"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addExperience}
                  className="flex items-center gap-1.5 text-primary hover:underline text-xs font-bold pt-1 cursor-pointer"
                >
                  <Plus size={14} /> Add another experience
                </button>
              </div>
            </div>
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
            {isCalling && (
              <FileUpload
                label="Face Photo"
                shape="rect"
                compact
                accept="image/*"
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
              accept="image/*,application/pdf"
              preview={cocDocumentUrl}
              onFileSelect={(file) => handleFileAsDataURL(file, (base64) => setCocDocumentUrl(base64))}
              onClear={() => setCocDocumentUrl(null)}
              helperText="COC Document — Max 50MB (Optional)"
              required={false}
            />
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col gap-2">
              <label className="text-xs font-bold text-text-primary uppercase tracking-wider">Labor ID</label>
              <input
                type="text"
                value={laborID}
                onChange={(e) => setLaborID(e.target.value)}
                placeholder="Enter Labor ID"
                className="px-4 py-3 rounded-xl border border-gray-200/80 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 w-full"
                required={!isCalling}
              />
              <p className="text-[10px] text-text-tertiary font-bold tracking-tight">Labor ID of Candidate — Text Field</p>
            </div>
            <FileUpload
              label="Candidate ID"
              shape="rect"
              compact
              accept="image/*"
              preview={candidateIdImageUrl}
              onFileSelect={(file) => handleFileAsDataURL(file, (base64) => setCandidateIdImageUrl(base64))}
              onClear={() => setCandidateIdImageUrl(null)}
              helperText="Candidate ID Image — Max 50MB"
              required={!isCalling}
            />
            <FileUpload
              label="Relative ID"
              shape="rect"
              compact
              accept="image/*"
              preview={relativeIdImageUrl}
              onFileSelect={(file) => handleFileAsDataURL(file, (base64) => setRelativeIdImageUrl(base64))}
              onClear={() => setRelativeIdImageUrl(null)}
              helperText="Relative ID Image — Max 50MB"
              required={!isCalling}
            />
            <FileUpload
              label="Passport Image"
              shape="rect"
              compact
              accept="image/*"
              preview={passportImage}
              onFileSelect={(file) => handleFileAsDataURL(file, (base64) => setPassportImage(base64))}
              onClear={() => setPassportImage(null)}
              helperText="Passport Image — Max 50MB"
              required={!isCalling}
            />

            {isCalling ? (
              <>
                <div className="md:col-span-1 pt-4 border-t border-border/60">
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
                <div className="md:col-span-1 pt-4 border-t border-border/60">
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Office <span className="text-red-500">*</span></label>
                  <select
                    value={office}
                    onChange={e => setOffice(e.target.value)}
                    className="w-full h-12 px-4 py-2.5 text-sm rounded-xl border border-border bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
                  >
                    <option value="" disabled>Select Office...</option>
                    {OFFICES.map(off => (
                      <option key={off.id} value={off.id}>{off.name}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
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
