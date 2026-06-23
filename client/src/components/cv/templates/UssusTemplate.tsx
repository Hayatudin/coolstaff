import React from 'react';
import { Candidate } from '@/types';
import CVVideoFooter from '../CVVideoFooter';
import { getFileUrl } from '@/lib/utils';

interface CVTemplateProps {
  candidate: Candidate;
  facePhoto: string | null;
  fullBodyPhoto: string | null;
}

export default function UssusTemplate({ candidate, facePhoto, fullBodyPhoto }: CVTemplateProps) {
  // Helper functions for data mapping
  const calculateAge = (dob: string | undefined) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const fullName = `${candidate.passportData?.givenNames || ''} ${candidate.passportData?.surname || ''}`.trim();
  const age = calculateAge(candidate.passportData?.dateOfBirth);

  const hasExperience = () => {
    const exps = candidate.personalInfo?.workExperience?.filter(e => e.experienceStatus === 'Have experience') || [];
    return exps.length > 0 ? 'YES' : 'NO';
  };

  const getSkillsText = () => {
    const dbSkills = candidate.personalInfo?.skills || [];
    const skillsSet = new Set(dbSkills.map(s => s.toLowerCase().replace('_', ' ')));
    skillsSet.add('cooking');
    skillsSet.add('cleaning');
    skillsSet.add('washing');
    skillsSet.add('babysitting');
    
    const skills = Array.from(skillsSet);
    if (skills.length === 0) return 'No specific skills listed.';
    if (skills.length === 1) return `Good at ${skills[0]}.`;
    
    const lastSkill = skills.pop();
    return `Good at ${skills.join(', ')}, and ${lastSkill}.`;
  };

  return (
    <div className="w-[794px] mx-auto bg-white text-black font-sans shadow-lg print:shadow-none relative" dir="ltr">
      
      {/* PAGE 1: Only one page for Ussus */}
      <div className="w-[794px] h-[1123px] relative overflow-hidden page-break-after-always">
        
        {/* Background Composite Image */}
        <img 
          src="/Ussus.png" 
          alt="Ussus Background" 
          className="absolute inset-0 w-full h-full object-fill z-0" 
        />

        {/* Content Overlay */}
        <div className="relative z-10 w-full h-full text-[17px] font-medium text-[#1c2a39]">
          
          {/* Top Left: Basic Information */}
          <div className="absolute top-[180px] left-[75px] flex flex-col gap-[28px] uppercase">
            <div>
              <span className="font-bold">NAME: </span>
              {fullName}
            </div>
            <div>
              <span className="font-bold">AGE: </span>
              {age} YEARS
            </div>
            <div>
              <span className="font-bold">NATIONALITY: </span>
              {candidate.passportData?.nationality || 'ETHIOPIAN'}
            </div>
            <div>
              <span className="font-bold">RELIGION: </span>
              {candidate.personalInfo?.religion}
            </div>
            <div>
              <span className="font-bold">PASSPORT NUMBER: </span>
              {candidate.passportData?.passportNumber}
            </div>
          </div>

          {/* Top Right: Face Photo */}
          <div className="absolute top-[160px] right-[85px] w-[210px] h-[240px] bg-white flex items-center justify-center p-0 shadow-sm overflow-hidden">
            {facePhoto ? (
              <img src={facePhoto} className="w-full h-full object-cover" alt="Face" />
            ) : (
              <div className="text-gray-400 text-sm">Face Photo</div>
            )}
          </div>

          {/* Bottom Left: Full Body Photo */}
          <div className="absolute bottom-[90px] left-[75px] w-[290px] h-[480px] bg-white flex items-center justify-center shadow-sm p-0 overflow-hidden">
            {fullBodyPhoto ? (
              <img src={fullBodyPhoto} className="h-full w-auto mx-auto block max-w-none" alt="Full Body" />
            ) : (
              <div className="text-gray-400 text-sm">Full Body Photo</div>
            )}
          </div>

          {/* Middle/Bottom Right: Details */}
          <div className="absolute top-[430px] left-[420px] w-[320px] flex flex-col gap-[22px] uppercase">
            <div>
              <span className="font-bold">LANGUAGE: </span>
              {candidate.personalInfo?.languages?.join(', ') || 'NONE'}
            </div>
            <div>
              <span className="font-bold">MONTHLY SALARY: </span>
              <span className="font-extrabold text-black uppercase">{candidate.salary || candidate.personalInfo?.salary || '1000 SAR'}</span>
            </div>
            <div>
              <span className="font-bold">PHONE NUMBER: </span>
              <span className="font-extrabold text-black">{candidate.personalInfo?.phone}</span>
            </div>
            <div>
              <span className="font-bold">MARITAL STATUS: </span>
              {candidate.personalInfo?.maritalStatus}
            </div>
            <div>
              <span className="font-bold">NUMBER OF KIDS: </span>
              {candidate.personalInfo?.numberOfChildren || 0} KIDS
            </div>
            <div>
              <span className="font-bold">HEIGHT: </span>
              {candidate.personalInfo?.height ? `${candidate.personalInfo?.height}cm` : ''}
            </div>
            <div>
              <span className="font-bold">WEIGHT: </span>
              {candidate.personalInfo?.weight ? `${candidate.personalInfo?.weight}kg` : ''}
            </div>
            
            <div className="mt-2">
              <div className="font-bold">EXPERIENCE</div>
              <div className="mt-1 font-extrabold text-xl text-black">
                ➢ {hasExperience()}
              </div>
            </div>

            <div className="mt-4 normal-case">
              <div className="font-bold uppercase text-center mb-2">SKILLS</div>
              <p className="text-[15px] leading-relaxed text-center">
                {getSkillsText()}
              </p>
            </div>
          </div>

          {/* Footer: QR Code & Branding */}
          <div className="absolute bottom-[20px] left-[75px] right-[75px] h-[60px] flex items-center justify-between z-20">
            {/* Daera branding */}
            <div className="text-[16px] font-bold text-[#1c2a39] tracking-wide uppercase">
             Coolstaff Foreign Employment Agency
            </div>
            
            {/* QR code */}
            {candidate.videoUrl && (
              <div className="flex items-center gap-2 bg-white/90 p-1 rounded shadow-sm border border-gray-100">
                <span className="text-[9px] font-bold text-[#1c2a39] tracking-wider uppercase">INTRO VIDEO</span>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(candidate.videoUrl)}`} 
                  alt="Video QR" 
                  className="w-10 h-10"
                />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
