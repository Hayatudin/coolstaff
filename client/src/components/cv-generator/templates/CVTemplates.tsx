'use client';

import React from 'react';
import { Candidate } from '@/types';
import { formatDate } from '@/lib/utils';

interface TemplateProps { candidate: Candidate; facePhoto: string | null; fullBodyPhoto: string | null; }

export function TemplateClassic({ candidate, facePhoto }: TemplateProps) {
  const { passportData: p, personalInfo: pi } = candidate;
  return (
    <div className="bg-white w-full aspect-[210/297] p-8 text-[10px] leading-relaxed" style={{fontFamily:'Georgia, serif'}}>
      <div className="border-b-2 border-gray-800 pb-4 mb-4 flex items-start gap-4">
        {facePhoto && <img src={facePhoto} alt="Photo" className="w-20 h-24 object-cover border border-gray-300" crossOrigin="anonymous" />}
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{p.givenNames} {p.surname}</h1>
          <p className="text-gray-600 mt-1">{pi.phone} • {pi.email}</p>
          <p className="text-gray-600">{pi.city}, {pi.country}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><h3 className="font-bold text-gray-800 border-b border-gray-300 pb-1 mb-2">PERSONAL INFORMATION</h3>
          <p><strong>Date of Birth:</strong> {formatDate(p.dateOfBirth)}</p><p><strong>Gender:</strong> {p.gender}</p>
          <p><strong>Nationality:</strong> {p.nationality}</p><p><strong>Marital Status:</strong> {pi.maritalStatus}</p>
          <p><strong>Religion:</strong> {pi.religion}</p><p><strong>Passport No:</strong> {p.passportNumber}</p>
        </div>
        <div><h3 className="font-bold text-gray-800 border-b border-gray-300 pb-1 mb-2">PHYSICAL DETAILS</h3>
          <p><strong>Height:</strong> {pi.height}</p><p><strong>Weight:</strong> {pi.weight}</p>
          <p><strong>Blood Type:</strong> {pi.bloodType}</p><p><strong>Medical Status:</strong> {pi.medicalStatus}</p>
        </div>
      </div>
      <div className="mt-4"><h3 className="font-bold text-gray-800 border-b border-gray-300 pb-1 mb-2">EDUCATION & LANGUAGES</h3>
        <p><strong>Education:</strong> {pi.educationLevel}</p><p><strong>Languages:</strong> {pi.languages.join(', ')}</p>
      </div>
      <div className="mt-4"><h3 className="font-bold text-gray-800 border-b border-gray-300 pb-1 mb-2">WORK EXPERIENCE</h3><p>{pi.workExperience.map(e => `${e.experienceStatus} - ${e.country} (${e.yearsOfExperience})`).join(', ') || 'N/A'}</p></div>
      <div className="mt-4"><h3 className="font-bold text-gray-800 border-b border-gray-300 pb-1 mb-2">SKILLS</h3><p>{pi.skills.join(' • ')}</p></div>
    </div>
  );
}

export function TemplateModern({ candidate, facePhoto }: TemplateProps) {
  const { passportData: p, personalInfo: pi } = candidate;
  return (
    <div className="bg-white w-full aspect-[210/297] text-[10px] leading-relaxed overflow-hidden" style={{fontFamily:'Inter, sans-serif'}}>
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-6 flex items-center gap-4">
        {facePhoto && <img src={facePhoto} alt="Photo" className="w-20 h-24 object-cover rounded-lg border-2 border-white/30" crossOrigin="anonymous" />}
        <div><h1 className="text-xl font-bold">{p.givenNames} {p.surname}</h1><p className="text-indigo-100 mt-1">{p.nationality} • {p.gender}</p><p className="text-indigo-200 text-[9px]">{pi.phone} | {pi.email}</p></div>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[{l:'DOB',v:formatDate(p.dateOfBirth)},{l:'Marital',v:pi.maritalStatus},{l:'Children',v:String(pi.numberOfChildren)},{l:'Education',v:pi.educationLevel},{l:'Blood Type',v:pi.bloodType},{l:'Religion',v:pi.religion}].map(i=>(
            <div key={i.l} className="bg-gray-50 rounded-lg p-2"><p className="text-[8px] text-gray-400 uppercase">{i.l}</p><p className="font-semibold text-gray-800">{i.v}</p></div>
          ))}
        </div>
        <div><h3 className="text-xs font-bold text-indigo-600 uppercase mb-1">Languages</h3><div className="flex flex-wrap gap-1">{pi.languages.map(l=><span key={l} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[9px]">{l}</span>)}</div></div>
        <div><h3 className="text-xs font-bold text-indigo-600 uppercase mb-1">Skills</h3><div className="flex flex-wrap gap-1">{pi.skills.map(s=><span key={s} className="px-2 py-0.5 bg-violet-50 text-violet-600 rounded-full text-[9px]">{s}</span>)}</div></div>
        <div><h3 className="text-xs font-bold text-indigo-600 uppercase mb-1">Experience</h3><p className="text-gray-700">{pi.workExperience.map(e => `${e.experienceStatus} - ${e.country} (${e.yearsOfExperience})`).join(', ') || 'N/A'}</p></div>
        <div><h3 className="text-xs font-bold text-indigo-600 uppercase mb-1">Passport</h3><p className="text-gray-700">No: {p.passportNumber} | Issued: {formatDate(p.dateOfIssue)} | Expires: {formatDate(p.dateOfExpiry)}</p></div>
      </div>
    </div>
  );
}

export function TemplateProfessional({ candidate, facePhoto, fullBodyPhoto }: TemplateProps) {
  const { passportData: p, personalInfo: pi } = candidate;
  return (
    <div className="bg-white w-full aspect-[210/297] flex text-[10px] leading-relaxed overflow-hidden" style={{fontFamily:'Inter, sans-serif'}}>
      <div className="w-1/3 bg-gray-900 text-white p-5 flex flex-col items-center">
        {facePhoto && <img src={facePhoto} alt="Photo" className="w-24 h-28 object-cover rounded-xl mb-3 border-2 border-gray-700" crossOrigin="anonymous" />}
        <h2 className="text-sm font-bold text-center">{p.givenNames}</h2><p className="text-gray-400 text-center">{p.surname}</p>
        <div className="w-full mt-4 space-y-3">
          <div><p className="text-[8px] text-gray-500 uppercase">Phone</p><p>{pi.phone}</p></div>
          <div><p className="text-[8px] text-gray-500 uppercase">Email</p><p className="break-all">{pi.email}</p></div>
          <div><p className="text-[8px] text-gray-500 uppercase">Location</p><p>{pi.city}, {pi.country}</p></div>
          <div><p className="text-[8px] text-gray-500 uppercase">Languages</p>{pi.languages.map(l=><p key={l} className="text-gray-300">{l}</p>)}</div>
        </div>
        {fullBodyPhoto && <img src={fullBodyPhoto} alt="Full body" className="w-full h-32 object-cover rounded-lg mt-auto border border-gray-700" crossOrigin="anonymous" />}
      </div>
      <div className="flex-1 p-6 space-y-4">
        <h1 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2">CURRICULUM VITAE</h1>
        <div><h3 className="text-xs font-bold text-gray-800 mb-2">PERSONAL DETAILS</h3>
          <div className="grid grid-cols-2 gap-2"><p><strong>DOB:</strong> {formatDate(p.dateOfBirth)}</p><p><strong>Gender:</strong> {p.gender}</p><p><strong>Nationality:</strong> {p.nationality}</p><p><strong>Marital:</strong> {pi.maritalStatus}</p><p><strong>Religion:</strong> {pi.religion}</p><p><strong>Blood Type:</strong> {pi.bloodType}</p></div>
        </div>
        <div><h3 className="text-xs font-bold text-gray-800 mb-2">EDUCATION</h3><p>{pi.educationLevel}</p></div>
        <div><h3 className="text-xs font-bold text-gray-800 mb-2">EXPERIENCE</h3><p>{pi.workExperience.map(e => `${e.experienceStatus} - ${e.country} (${e.yearsOfExperience})`).join(', ') || 'N/A'}</p></div>
        <div><h3 className="text-xs font-bold text-gray-800 mb-2">SKILLS</h3><div className="flex flex-wrap gap-1">{pi.skills.map(s=><span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[9px]">{s}</span>)}</div></div>
        <div><h3 className="text-xs font-bold text-gray-800 mb-2">PASSPORT</h3><p>No: {p.passportNumber} | Valid: {formatDate(p.dateOfIssue)} - {formatDate(p.dateOfExpiry)}</p></div>
      </div>
    </div>
  );
}

export function TemplateMinimal({ candidate, facePhoto }: TemplateProps) {
  const { passportData: p, personalInfo: pi } = candidate;
  return (
    <div className="bg-white w-full aspect-[210/297] p-10 text-[10px] leading-loose" style={{fontFamily:'Inter, sans-serif'}}>
      <div className="flex items-center gap-5 mb-6">
        {facePhoto && <img src={facePhoto} alt="Photo" className="w-16 h-20 object-cover rounded-md" crossOrigin="anonymous" />}
        <div><h1 className="text-2xl font-light text-gray-900 tracking-wide">{p.givenNames} {p.surname}</h1><p className="text-gray-400 mt-1">{pi.email} • {pi.phone}</p></div>
      </div>
      <div className="h-px bg-gray-200 mb-6" />
      <div className="space-y-5">
        {[{t:'Personal',c:`${formatDate(p.dateOfBirth)} • ${p.gender} • ${p.nationality} • ${pi.maritalStatus} • ${pi.religion}`},{t:'Education',c:pi.educationLevel},{t:'Languages',c:pi.languages.join(', ')},{t:'Experience',c:pi.workExperience.map(e => `${e.experienceStatus} - ${e.country} (${e.yearsOfExperience})`).join(', ') || 'N/A'},{t:'Skills',c:pi.skills.join(', ')},{t:'Passport',c:`${p.passportNumber} — Valid until ${formatDate(p.dateOfExpiry)}`}].map(s=>(
          <div key={s.t}><h3 className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{s.t}</h3><p className="text-gray-700">{s.c}</p></div>
        ))}
      </div>
    </div>
  );
}

export function TemplateElegant({ candidate, facePhoto, fullBodyPhoto }: TemplateProps) {
  const { passportData: p, personalInfo: pi } = candidate;
  return (
    <div className="bg-white w-full aspect-[210/297] text-[10px] leading-relaxed overflow-hidden" style={{fontFamily:'Georgia, serif'}}>
      <div className="h-3 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500" />
      <div className="p-7">
        <div className="text-center border-b-2 border-amber-500/30 pb-4 mb-5">
          <div className="flex justify-center gap-4 mb-3">
            {facePhoto && <img src={facePhoto} alt="Photo" className="w-20 h-24 object-cover rounded-lg border-2 border-amber-200" crossOrigin="anonymous" />}
            {fullBodyPhoto && <img src={fullBodyPhoto} alt="Full body" className="w-20 h-24 object-cover rounded-lg border-2 border-amber-200" crossOrigin="anonymous" />}
          </div>
          <h1 className="text-xl font-bold text-gray-900">{p.givenNames} {p.surname}</h1>
          <p className="text-amber-600 mt-1">{p.nationality} • {pi.educationLevel}</p>
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-3">
            <div><h3 className="text-xs font-bold text-amber-700 border-b border-amber-200 pb-1 mb-2">Personal Information</h3>
              <p>Date of Birth: {formatDate(p.dateOfBirth)}</p><p>Gender: {p.gender}</p><p>Marital Status: {pi.maritalStatus}</p><p>Religion: {pi.religion}</p><p>Children: {pi.numberOfChildren}</p>
            </div>
            <div><h3 className="text-xs font-bold text-amber-700 border-b border-amber-200 pb-1 mb-2">Contact</h3><p>{pi.phone}</p><p>{pi.email}</p><p>{pi.city}, {pi.country}</p></div>
          </div>
          <div className="space-y-3">
            <div><h3 className="text-xs font-bold text-amber-700 border-b border-amber-200 pb-1 mb-2">Languages & Skills</h3><p><em>Languages:</em> {pi.languages.join(', ')}</p><p><em>Skills:</em> {pi.skills.join(', ')}</p></div>
            <div><h3 className="text-xs font-bold text-amber-700 border-b border-amber-200 pb-1 mb-2">Experience</h3><p>{pi.workExperience.map(e => `${e.experienceStatus} - ${e.country} (${e.yearsOfExperience})`).join(', ') || 'N/A'}</p></div>
            <div><h3 className="text-xs font-bold text-amber-700 border-b border-amber-200 pb-1 mb-2">Passport Details</h3><p>No: {p.passportNumber}</p><p>Issued: {formatDate(p.dateOfIssue)}</p><p>Expires: {formatDate(p.dateOfExpiry)}</p></div>
          </div>
        </div>
      </div>
      <div className="h-3 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 mt-auto" />
    </div>
  );
}
