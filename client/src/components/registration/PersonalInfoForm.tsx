'use client';

import React from 'react';
import Image from 'next/image';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import MultiSelect from '@/components/ui/MultiSelect';
import { CandidatePersonalInfo, PassportData, WorkExperienceEntry } from '@/types';
import {
  educationLevels, languageOptions, skillOptions, religionOptions
} from '@/data/mockData';
import { allCountries } from '@/data/countries';
import { Plus, Trash2, Calendar, Upload } from 'lucide-react';
import { getFileUrl, cn } from '@/lib/utils';
import FileUpload from '@/components/ui/FileUpload';

const jobOptions = ['House Maid', 'Driver', 'Babysitter', 'Cook', 'Nurse', 'Cleaner', 'Caregiver'];

interface PersonalInfoFormProps {
  data: CandidatePersonalInfo;
  onChange: (field: keyof CandidatePersonalInfo, value: any) => void;
  passportData: PassportData;
  onPassportChange: (field: keyof PassportData, value: string) => void;
  passportImage: string | null;
  onPassportImageChange?: (url: string) => void;
  facePhoto?: string | null;
  onFacePhotoChange?: (url: string) => void;
  brokers: { id: string, name: string }[];
  onBrokerCreate?: (name: string) => void;
  fullBodyPhoto?: string | null;
  onFullBodyPhotoChange?: (url: string) => void;
  videoUrl?: string;
  onVideoUrlChange?: (url: string) => void;
}

export default function PersonalInfoForm({ data, onChange, passportData, onPassportChange, passportImage, onPassportImageChange, facePhoto, onFacePhotoChange, brokers, onBrokerCreate, fullBodyPhoto, onFullBodyPhotoChange, videoUrl, onVideoUrlChange }: PersonalInfoFormProps) {
  const handleFileAsDataURL = (file: File, callback: (base64: string) => void) => {
    if (file.size > 10 * 1024 * 1024) {
      alert('Max file size is 10MB');
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

  // Work Experience Handlers
  const addExperience = () => {
    const newExp: WorkExperienceEntry = { experienceStatus: 'Have experience', country: '', yearsOfExperience: '' };
    onChange('workExperience', [...(data.workExperience || []), newExp]);
  };

  const updateExperience = (index: number, field: keyof WorkExperienceEntry, value: string) => {
    const updated = [...(data.workExperience || [])];
    updated[index] = { ...updated[index], [field]: field === 'country' ? value.toUpperCase() : value };
    onChange('workExperience', updated);
  };

  const removeExperience = (index: number) => {
    const updated = [...(data.workExperience || [])];
    updated.splice(index, 1);
    onChange('workExperience', updated);
  };

  // Ensure there's at least one empty experience object to render the fields
  const experiences = data.workExperience?.length > 0 ? data.workExperience : [{ experienceStatus: 'New', country: '', yearsOfExperience: '' }];

  // Helper for capitalization
  const handleChangeUpper = (field: keyof CandidatePersonalInfo, value: string) => {
    const upperValue = value.toUpperCase();
    onChange(field, upperValue);
    if (field === 'city') {
      onPassportChange('placeOfBirth', upperValue);
    }
  };
  const handlePassportChangeUpper = (field: keyof PassportData, value: string) => onPassportChange(field, value.toUpperCase());

  const [isCocDragOver, setIsCocDragOver] = React.useState(false);
  const [isMedicalDragOver, setIsMedicalDragOver] = React.useState(false);
  const [isCandidateIdDragOver, setIsCandidateIdDragOver] = React.useState(false);
  const [isRelativeIdDragOver, setIsRelativeIdDragOver] = React.useState(false);
  const [isLabourIdDragOver, setIsLabourIdDragOver] = React.useState(false);

  // Education level handler
  const handleEducationChange = (values: string[]) => {
    onChange('educationLevel', values.join(', '));
  };
  const selectedEducation = data.educationLevel ? data.educationLevel.split(',').map(s => s.trim()).filter(Boolean) : [];

  // Multiple Phone Handlers
  const addPhone = () => {
    const updated = [...(data.additionalPhones || []), ''];
    onChange('additionalPhones', updated);
  };

  const updatePhone = (index: number, value: string) => {
    const updated = [...(data.additionalPhones || [])];
    updated[index] = value;
    onChange('additionalPhones', updated);
  };

  const removePhone = (index: number) => {
    const updated = [...(data.additionalPhones || [])];
    updated.splice(index, 1);
    onChange('additionalPhones', updated);
  };


  return (
    <div className="space-y-10 animate-slide-in-right max-w-5xl mx-auto">

      {/* 1. Personal Information */}
      <section>
        <h3 className="text-xl font-bold text-text-primary mb-6">Personal Information</h3>

        {/* Profile Photos - Face & Full Body */}
        <div className="flex flex-col sm:flex-row items-start gap-8 mb-8">
          {/* Face Photo */}
          <FileUpload
            label="Face Photo *"
            shape="circle"
            preview={facePhoto ? getFileUrl(facePhoto) : null}
            onFileSelect={(file) => handleFileAsDataURL(file, (base64) => onFacePhotoChange?.(base64))}
            onClear={onFacePhotoChange ? () => onFacePhotoChange('') : undefined}
            helperText="Circle — Max 10MB"
          />

          {/* Full Body Photo */}
          <FileUpload
            label="Full Body Photo *"
            shape="rect"
            compact
            preview={fullBodyPhoto ? getFileUrl(fullBodyPhoto) : null}
            onFileSelect={(file) => handleFileAsDataURL(file, (base64) => onFullBodyPhotoChange?.(base64))}
            onClear={onFullBodyPhotoChange ? () => onFullBodyPhotoChange('') : undefined}
            helperText="Rectangle — Max 10MB"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
          {/* Row 1 */}
          <Input label="Surname" value={passportData.surname} onChange={e => handlePassportChangeUpper('surname', e.target.value)} required />
          <Input label="Given Names" value={passportData.givenNames} onChange={e => handlePassportChangeUpper('givenNames', e.target.value)} required />
          <Input label="Date of Birth" type="date" value={passportData.dateOfBirth} onChange={e => onPassportChange('dateOfBirth', e.target.value)} required />

          {/* Row 2: Gender, Marital Status, Religion (Radios) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Gender <span className="text-danger">*</span></label>
            <div className="flex gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" name="gender" value="Female" checked={passportData.gender === 'Female'} onChange={() => onPassportChange('gender', 'Female')} className="accent-primary w-4 h-4" /> Female
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" name="gender" value="Male" checked={passportData.gender === 'Male'} onChange={() => onPassportChange('gender', 'Male')} className="accent-primary w-4 h-4" /> Male
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Marital Status <span className="text-danger">*</span></label>
            <div className="flex gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" name="marital" value="Single" checked={data.maritalStatus === 'Single'} onChange={() => onChange('maritalStatus', 'Single')} className="accent-primary w-4 h-4" /> Single
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" name="marital" value="Married" checked={data.maritalStatus === 'Married'} onChange={() => onChange('maritalStatus', 'Married')} className="accent-primary w-4 h-4" /> Married
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Select
              label="Religion"
              required
              options={religionOptions.map(r => ({ value: r, label: r }))}
              value={data.religion}
              onChange={v => onChange('religion', v)}
              placeholder="Select religion"
            />
          </div>

          {/* Row 3 */}
          <Select label="Job" required options={jobOptions.map(j => ({ value: j.toUpperCase(), label: j.toUpperCase() }))} value={data.job} onChange={v => onChange('job', v)} placeholder="Select job" />
          <MultiSelect label="Education level" options={educationLevels.map(e => ({ value: e.toUpperCase(), label: e.toUpperCase() }))} value={selectedEducation} onChange={handleEducationChange} placeholder="Select education" />
          <MultiSelect label="Skills" options={skillOptions.map(s => ({ value: s.toUpperCase(), label: s.toUpperCase() }))} value={data.skills || []} onChange={v => onChange('skills', v)} placeholder="Select skills" />

          {/* Row 4 */}
          <MultiSelect label="Languages" options={languageOptions.map(l => ({ value: l.toUpperCase(), label: l.toUpperCase() }))} value={data.languages || []} onChange={v => onChange('languages', v)} placeholder="Select languages" />
          <Input label="ID Number" value={data.idNumber || passportData.passportNumber} onChange={e => handleChangeUpper('idNumber', e.target.value)} required />

          {/* Main Mobile Number */}
          <div className="space-y-2">
            <Input label="Mobile Number" type="tel" value={data.phone} onChange={e => onChange('phone', e.target.value)} placeholder="+251 9..." required />

            {/* Additional Mobile Numbers */}
            {(data.additionalPhones || []).map((phone, idx) => (
              <div key={idx} className="flex gap-2 animate-slide-in-right">
                <div className="flex-1">
                  <Input
                    value={phone}
                    onChange={e => updatePhone(idx, e.target.value)}
                    placeholder="Another mobile number..."
                    type="tel"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePhone(idx)}
                  className="mt-1 p-2 text-danger hover:bg-red-50 rounded-lg self-start"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addPhone}
              className="text-xs text-primary font-medium flex items-center gap-1 hover:underline mt-1"
            >
              <Plus size={14} /> Add another phone number
            </button>
          </div>

          {/* Row 5 */}
          <Input label="Height (cm)" type="text" value={data.height || ''} onChange={e => onChange('height', e.target.value)} placeholder="e.g. 160" />
          <Input label="Weight (kg)" type="text" value={data.weight || ''} onChange={e => onChange('weight', e.target.value)} placeholder="e.g. 55" />
          <Input label="Salary" type="text" value={data.salary || '1000SR'} onChange={e => onChange('salary', e.target.value)} placeholder="e.g. 1000SR" />

          {/* Row 6 */}
          <Input label="Number Of Children" type="number" value={String(data.numberOfChildren || '')} onChange={e => onChange('numberOfChildren', parseInt(e.target.value) || 0)} required />
          <Input label="E-Mail" type="email" value={data.email} onChange={e => onChange('email', e.target.value.toLowerCase())} placeholder="email@example.com" required />

          {/* Broker Dropdown */}
          <Select
            label="Broker / Source"
            required
            options={brokers.map(b => ({ value: b.id, label: b.name }))}
            value={data.brokerId || ''}
            onChange={v => onChange('brokerId', v)}
            placeholder="Select broker"
            searchable
            onCreate={onBrokerCreate}
          />
        </div>
      </section>

      {/* 2. Work Experience */}
      <section className="pt-4 border-t border-slate-100">
        <h3 className="text-xl font-bold text-text-primary mb-6">Work Experience</h3>

        <div className="space-y-6">
          {experiences.map((exp, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 relative group">
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
                    {experiences.length > 1 && (
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

          <button
            type="button"
            onClick={addExperience}
            className="flex items-center gap-2 text-primary hover:underline text-sm font-medium mt-2"
          >
            <Plus size={16} /> Add another experience
          </button>
        </div>
      </section>

      {/* 3. Passport */}
      <section className="pt-4 border-t border-slate-100">
        <h3 className="text-xl font-bold text-text-primary mb-6">Passport</h3>

        <div className="mb-8 max-w-md">
          <FileUpload
            label="Passport Scan"
            shape="rect"
            compact
            preview={passportImage ? getFileUrl(passportImage) : null}
            onFileSelect={(file) => handleFileAsDataURL(file, (base64) => onPassportImageChange?.(base64))}
            onClear={onPassportImageChange ? () => onPassportImageChange('') : undefined}
            helperText="Passport Image — Max 10MB"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
          <Input label="Passport Number" value={passportData.passportNumber} onChange={e => handlePassportChangeUpper('passportNumber', e.target.value)} required />
          <Input label="Place of Birth" value={passportData.placeOfBirth} onChange={e => handlePassportChangeUpper('placeOfBirth', e.target.value)} required />
          <Input label="Passport Issue Place" value={passportData.issuingCountry} onChange={e => handlePassportChangeUpper('issuingCountry', e.target.value)} required />
          <Input label="Passport Issue Date" type="date" value={passportData.dateOfIssue} onChange={e => onPassportChange('dateOfIssue', e.target.value)} required />
          <Input label="Passport Expiry Date" type="date" value={passportData.dateOfExpiry} onChange={e => onPassportChange('dateOfExpiry', e.target.value)} required />
        </div>
      </section>

      {/* 4. Address */}
      <section className="pt-4 border-t border-slate-100">
        <h3 className="text-xl font-bold text-text-primary mb-6">Address</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
          <Select label="Country" searchable options={allCountries.map(c => ({ value: c.toUpperCase(), label: c.toUpperCase() }))} value={data.country} onChange={v => onChange('country', v)} placeholder="Select country" />
          <Input label="City" value={data.city} onChange={e => handleChangeUpper('city', e.target.value)} required />
          <Input label="Address" value={data.address} onChange={e => handleChangeUpper('address', e.target.value)} required />
        </div>
      </section>

      {/* 6. Relative Contact Necessity */}
      <section className="pt-4 border-t border-slate-100">
        <h3 className="text-xl font-bold text-text-primary mb-6">Relative Contact Necessity</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 max-w-2xl">
          <Input label="Relative name" value={data.emergencyContactName} onChange={e => handleChangeUpper('emergencyContactName', e.target.value)} required />
          <Input label="Relative kinship" value={data.emergencyContactRelation} onChange={e => handleChangeUpper('emergencyContactRelation', e.target.value)} required placeholder="e.g. FATHER" />
          <Input label="Relative phone" type="tel" value={data.emergencyContactPhone} onChange={e => onChange('emergencyContactPhone', e.target.value)} required />
          <Input label="Relative address" value={data.emergencyContactAddress} onChange={e => handleChangeUpper('emergencyContactAddress', e.target.value)} required />
        </div>
      </section>

      {/* 7. Video Link for QR Code */}
      <section className="pt-4 border-t border-slate-100">
        <h3 className="text-xl font-bold text-text-primary mb-2">Video Link</h3>
        <p className="text-sm text-text-secondary mb-4">Add a video URL for this candidate. A QR code will be automatically generated on the CV.</p>
        <div className="max-w-xl">
          <Input 
            label="Video URL" 
            type="url"
            value={videoUrl || ''} 
            onChange={e => onVideoUrlChange?.(e.target.value)} 
            placeholder="https://youtube.com/watch?v=..." 
          />
        </div>
      </section>

      <div className="pt-6 border-t border-slate-100 flex items-start gap-3">
        <input type="checkbox" id="acknowledge" className="mt-1 w-4 h-4 accent-primary rounded cursor-pointer" />
        <label htmlFor="acknowledge" className="text-sm text-text-secondary cursor-pointer leading-relaxed">
          I acknowledge that the candidate&apos;s data entered is correct, in the event of a dispute, I will bear the procedures followed, which may lead to suspension.
        </label>
      </div>
    </div>
  );
}
