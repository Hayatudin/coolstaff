'use client';

import React from 'react';
import { PassportData, CandidatePersonalInfo } from '@/types';
import { formatDate } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import { User, Plane, Heart, GraduationCap, Briefcase, Phone, MapPin } from 'lucide-react';

interface ReviewSubmitProps {
  passportData: PassportData;
  personalInfo: CandidatePersonalInfo;
  facePhoto?: string | null;
  passportImage?: string | null;
}

const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="border border-border rounded-xl p-5 hover:shadow-md transition-shadow duration-200">
    <div className="flex items-center gap-2 mb-4">
      <div className="p-1.5 rounded-lg bg-primary-50">{icon}</div>
      <h4 className="font-semibold text-text-primary">{title}</h4>
    </div>
    {children}
  </div>
);

const Field = ({ label, value }: { label: string; value: string | number | undefined }) => (
  <div>
    <p className="text-xs text-text-tertiary mb-0.5">{label}</p>
    <p className="text-sm font-medium text-text-primary">{value || '—'}</p>
  </div>
);

export default function ReviewSubmit({ passportData, personalInfo, facePhoto, passportImage }: ReviewSubmitProps) {


  return (
    <div className="space-y-6 animate-slide-in-right">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-6 bg-success rounded-full" />
        <h3 className="text-lg font-semibold text-text-primary">Review Information</h3>
        <Badge variant="warning">Please verify all details</Badge>
      </div>

      {/* Top Section: Photo & Core Identity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="border border-border rounded-xl overflow-hidden bg-surface h-full flex flex-col items-center justify-center p-6 hover:shadow-md transition-shadow duration-200">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/10 relative mb-4 bg-slate-100 flex items-center justify-center">
              {facePhoto ? (
                <img src={facePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : passportImage ? (
                <img src={passportImage} alt="Passport Scan" className="w-full h-full object-cover" />
              ) : (
                <User size={48} className="text-slate-300" />
              )}
            </div>
            <div className="text-center">
              <h4 className="font-bold text-lg text-text-primary mb-1">
                {passportData.givenNames} {passportData.surname}
              </h4>
              <p className="text-sm text-text-secondary font-medium">{personalInfo.job || 'Job Not Specified'}</p>
              <Badge variant="success" className="mt-3">Ready for submission</Badge>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Section title="Passport Details" icon={<Plane size={16} className="text-primary" />}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Passport Number" value={passportData.passportNumber} />
              <Field label="Nationality" value={passportData.nationality} />
              <Field label="Place of Birth" value={passportData.placeOfBirth || personalInfo.city} />
              <Field label="Date of Birth" value={formatDate(passportData.dateOfBirth)} />
              <Field label="Gender" value={passportData.gender} />
              <Field label="Issue Place" value={passportData.issuingCountry} />
              <Field label="Issue Date" value={formatDate(passportData.dateOfIssue)} />
              <Field label="Expiry Date" value={formatDate(passportData.dateOfExpiry)} />
            </div>
          </Section>
        </div>
      </div>

      {/* Middle Section: Personal & Contact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Personal Details" icon={<User size={16} className="text-primary" />}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="ID Number" value={personalInfo.idNumber || passportData.passportNumber} />
            <Field label="Religion" value={personalInfo.religion} />
            <Field label="Marital Status" value={personalInfo.maritalStatus} />
            <Field label="Number of Children" value={personalInfo.numberOfChildren} />
          </div>
        </Section>

        <Section title="Contact & Address" icon={<MapPin size={16} className="text-primary" />}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone Number" value={personalInfo.phone} />
            <Field label="Email Address" value={personalInfo.email} />
            <Field label="Country" value={personalInfo.country} />
            <Field label="City" value={personalInfo.city} />
            <div className="col-span-2">
              <Field label="Full Address" value={personalInfo.address} />
            </div>
          </div>
        </Section>
      </div>

      {/* Bottom Section: Experience, Education & Emergency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Education & Skills" icon={<GraduationCap size={16} className="text-primary" />}>
          <div className="space-y-4">
            <Field label="Education Level" value={personalInfo.educationLevel} />
            <div>
              <p className="text-xs text-text-tertiary mb-1.5">Languages</p>
              <div className="flex flex-wrap gap-1.5">
                {personalInfo.languages && personalInfo.languages.length > 0 ? (
                  personalInfo.languages.map(l => <span key={l} className="px-2.5 py-1 bg-primary-50 text-primary text-xs font-medium rounded-md">{l}</span>)
                ) : (
                  <span className="text-sm font-medium text-text-primary">—</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-text-tertiary mb-1.5">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {personalInfo.skills && personalInfo.skills.length > 0 ? (
                  personalInfo.skills.map(s => <span key={s} className="px-2.5 py-1 bg-accent/10 text-accent text-xs font-medium rounded-md">{s}</span>)
                ) : (
                  <span className="text-sm font-medium text-text-primary">—</span>
                )}
              </div>
            </div>
          </div>
        </Section>

        <div className="space-y-6">
          <Section title="Work Experience" icon={<Briefcase size={16} className="text-primary" />}>
            {personalInfo.workExperience && personalInfo.workExperience.length > 0 ? (
              <div className="space-y-3">
                {personalInfo.workExperience.map((exp, idx) => (
                  <div key={idx} className="flex justify-between items-center pb-2 border-b border-border last:border-0 last:pb-0">
                    <span className="text-sm font-medium text-text-primary">{exp.experienceStatus}</span>
                    {exp.experienceStatus === 'Have experience' && (
                      <span className="text-xs text-text-secondary bg-surface-hover px-2 py-1 rounded">
                        {exp.yearsOfExperience} yrs in {exp.country}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium text-text-primary">—</p>
            )}
          </Section>

          <Section title="Emergency Contact" icon={<Heart size={16} className="text-primary" />}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name" value={personalInfo.emergencyContactName} />
              <Field label="Relationship" value={personalInfo.emergencyContactRelation} />
              <Field label="Phone" value={personalInfo.emergencyContactPhone} />
              <div className="col-span-2 sm:col-span-1">
                <Field label="Address" value={personalInfo.emergencyContactAddress} />
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
