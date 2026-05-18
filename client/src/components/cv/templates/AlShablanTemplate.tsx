import React from 'react';
import { Candidate } from '@/types';
import { getFileUrl } from '@/lib/utils';

interface CVTemplateProps {
  candidate: Candidate;
  facePhoto: string | null;
  fullBodyPhoto: string | null;
}

export default function AlShablanTemplate({ candidate, facePhoto, fullBodyPhoto }: CVTemplateProps) {
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

  const hasLang = (lang: string) => {
    return candidate.personalInfo?.languages?.includes(lang) ? 'YES' : 'NO';
  };

  const hasSkill = (skill: string) => {
    return candidate.personalInfo?.skills?.includes(skill) ? 'YES' : 'NO';
  };

  const fullName = `${candidate.passportData?.givenNames || ''} ${candidate.passportData?.surname || ''}`.trim();
  const age = calculateAge(candidate.passportData?.dateOfBirth);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    } catch {
      return dateString;
    }
  };

  let expPeriod = '0 YEAR';
  let expCountry = '';
  if (candidate.personalInfo?.workExperience && candidate.personalInfo.workExperience.length > 0) {
    const exps = candidate.personalInfo.workExperience.filter(e => e.experienceStatus === 'Have experience');
    if (exps.length > 0) {
      expPeriod = exps.map(e => e.yearsOfExperience + ' YRS').join(' + ');
      expCountry = exps.map(e => e.country).join(', ');
    }
  }

  const beigeBg = "bg-[#f4ebd0]";
  const headerBg = "bg-gray-100"; // Wait, in the image, the table headers like "Overseas Experience" have the same beige or white? They seem to have white or transparent bg, but the text "Overseas Experience" is bold on the top left of the table.

  // Let's create the JSX structure accurately.
  return (
    <div className="w-[794px] mx-auto bg-white text-black font-serif shadow-lg print:shadow-none relative" dir="ltr">
      
      {/* PAGE 1: Profile Sheet */}
      <div className="w-[794px] h-[1123px] relative overflow-hidden page-break-after-always">
        
        {/* Background Composite Image */}
        <img 
          src="/Al-shablan.png" 
          alt="Al Shablan Background" 
          className="absolute inset-0 w-full h-full object-fill z-0" 
        />

        {/* Content Overlay */}
        {/* Padding to fit inside the golden border and below the header */}
        <div className="relative z-10 w-full h-full px-[50px] pt-[180px] pb-[50px] flex flex-col gap-2">
          
          {/* Top Section: Photo and Basic Info */}
          <div className="flex gap-2">
            {/* Face Photo */}
            <div className="w-[220px] h-[220px] border border-black p-1 shrink-0 bg-white">
              {facePhoto ? (
                <img src={facePhoto} className="w-full h-full object-cover" alt="Face" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">Face Photo</div>
              )}
            </div>

            {/* Basic Info Table */}
            <div className="flex-1">
              <table className="w-full border-collapse border border-black text-[14px] leading-tight bg-white">
                <tbody>
                  <tr>
                    <td className={`border border-black px-2 py-1.5 font-bold w-[35%] ${beigeBg}`}>Reference No</td>
                    <td className="border border-black px-2 py-1.5 text-center font-bold">124764987</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1.5 font-bold ${beigeBg}`}>Full Name</td>
                    <td className="border border-black px-2 py-1.5 text-center font-bold uppercase">{fullName}</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1.5 font-bold ${beigeBg}`}>Religion</td>
                    <td className="border border-black px-2 py-1.5 text-center uppercase">{candidate.personalInfo?.religion}</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1.5 font-bold ${beigeBg}`}>Position Desired</td>
                    <td className="border border-black px-2 py-1.5 text-center uppercase">{candidate.personalInfo?.job || 'HOUSE MAID'}</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1.5 font-bold ${beigeBg}`}>Salary</td>
                    <td className="border border-black px-2 py-1.5 text-center font-bold">{candidate.salary || candidate.personalInfo?.salary || '1000SR'}</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1.5 font-bold ${beigeBg}`}>Age</td>
                    <td className="border border-black px-2 py-1.5 text-center">{age}</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1.5 font-bold ${beigeBg}`}>Sex</td>
                    <td className="border border-black px-2 py-1.5 text-center capitalize">{candidate.passportData?.gender || 'Female'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Middle Section: 2 Columns */}
          <div className="flex gap-2 flex-1">
            
            {/* Left Column */}
            <div className="w-[50%] flex flex-col gap-2">
              
              {/* Overseas Experience */}
              <table className="w-full border-collapse border border-black text-[13px] leading-tight bg-white">
                <thead>
                  <tr>
                    <th colSpan={3} className="border border-black text-left px-2 py-1 font-bold">Overseas Experience</th>
                  </tr>
                  <tr>
                    <th className="border border-black px-2 py-1 font-bold">country</th>
                    <th className="border border-black px-2 py-1 font-bold">Period</th>
                    <th className="border border-black px-2 py-1 font-bold">position</th>
                  </tr>
                </thead>
                <tbody>
                  {candidate.personalInfo?.workExperience && candidate.personalInfo.workExperience.filter(e => e.experienceStatus === 'Have experience').length > 0 ? (
                    candidate.personalInfo.workExperience.filter(e => e.experienceStatus === 'Have experience').map((exp, idx) => (
                      <tr key={idx}>
                        <td className="border border-black px-2 py-1 text-center capitalize">{exp.country}</td>
                        <td className="border border-black px-2 py-1 text-center">{exp.yearsOfExperience}</td>
                        <td className="border border-black px-2 py-1 text-center capitalize">{candidate.personalInfo?.job || 'House Maid'}</td>
                      </tr>
                    ))
                  ) : (
                    <>
                      <tr>
                        <td className="border border-black px-2 py-1 text-center h-6">-</td>
                        <td className="border border-black px-2 py-1 text-center">-</td>
                        <td className="border border-black px-2 py-1 text-center">-</td>
                      </tr>
                      <tr>
                        <td className="border border-black px-2 py-1 text-center h-6"></td>
                        <td className="border border-black px-2 py-1 text-center"></td>
                        <td className="border border-black px-2 py-1 text-center"></td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>

              {/* Personal Information */}
              <table className="w-full border-collapse border border-black text-[13px] leading-tight bg-white">
                <thead>
                  <tr>
                    <th colSpan={2} className="border border-black text-left px-2 py-1 font-bold">Personal Information</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-bold w-[45%] ${beigeBg}`}>Nationality</td>
                    <td className="border border-black px-2 py-1 text-center uppercase">{candidate.passportData?.nationality}</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-bold ${beigeBg}`}>Date of Birth</td>
                    <td className="border border-black px-2 py-1 text-center">{formatDate(candidate.passportData?.dateOfBirth)}</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-bold ${beigeBg}`}>Adress</td>
                    <td className="border border-black px-2 py-1 text-center uppercase">{candidate.personalInfo?.address || candidate.personalInfo?.city || ''}</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-bold ${beigeBg}`}>Marital Status</td>
                    <td className="border border-black px-2 py-1 text-center capitalize">{candidate.personalInfo?.maritalStatus}</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-bold ${beigeBg}`}>No of Children</td>
                    <td className="border border-black px-2 py-1 text-center">{candidate.personalInfo?.numberOfChildren}</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-bold ${beigeBg}`}>Height</td>
                    <td className="border border-black px-2 py-1 text-center">{candidate.personalInfo?.height}</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-bold ${beigeBg}`}>weight</td>
                    <td className="border border-black px-2 py-1 text-center">{candidate.personalInfo?.weight}</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-bold ${beigeBg}`}>Education Qualifications</td>
                    <td className="border border-black px-2 py-1 text-center capitalize">{candidate.personalInfo?.educationLevel}</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-bold ${beigeBg}`}>Tel.Number</td>
                    <td className="border border-black px-2 py-1 text-center">{candidate.personalInfo?.phone}</td>
                  </tr>
                </tbody>
              </table>

              {/* Languages */}
              <div className="w-[60%]">
                <table className="w-full border-collapse border border-black text-[13px] leading-tight bg-white">
                  <thead>
                    <tr>
                      <th colSpan={2} className="border border-black text-left px-2 py-1 font-bold">Languages</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={`border border-black px-2 py-1 font-bold w-[50%] ${beigeBg}`}>English</td>
                      <td className="border border-black px-2 py-1 text-center">{hasLang('ENGLISH')}</td>
                    </tr>
                    <tr>
                      <td className={`border border-black px-2 py-1 font-bold ${beigeBg}`}>Arabic</td>
                      <td className="border border-black px-2 py-1 text-center">{hasLang('ARABIC')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Skills */}
              <table className="w-full border-collapse border border-black text-[11px] leading-tight bg-white mt-auto">
                <thead>
                  <tr>
                    <th colSpan={4} className="border border-black text-left px-2 py-1 font-bold">Skills</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`border border-black px-1.5 py-1 ${beigeBg}`}>BABY SITTING</td>
                    <td className="border border-black px-1 py-1 text-center w-[20px]">{hasSkill('BABY SITTING') === 'YES' ? '✓' : '☐'}</td>
                    <td className={`border border-black px-1.5 py-1 ${beigeBg}`}>CHILDREN CARE</td>
                    <td className="border border-black px-1 py-1 text-center w-[20px]">{hasSkill('CHILDREN CARE') === 'YES' ? '✓' : '☐'}</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-1.5 py-1 ${beigeBg}`}>TUTORING</td>
                    <td className="border border-black px-1 py-1 text-center">{hasSkill('TUTORING') === 'YES' ? '✓' : '☐'}</td>
                    <td className={`border border-black px-1.5 py-1 ${beigeBg}`}>COMPUTER</td>
                    <td className="border border-black px-1 py-1 text-center">{hasSkill('COMPUTER') === 'YES' ? '✓' : '☐'}</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-1.5 py-1 ${beigeBg}`}>CLEANING</td>
                    <td className="border border-black px-1 py-1 text-center">{hasSkill('CLEANING') === 'YES' ? '✓' : '☐'}</td>
                    <td className={`border border-black px-1.5 py-1 ${beigeBg}`}>WASHING</td>
                    <td className="border border-black px-1 py-1 text-center">{hasSkill('WASHING') === 'YES' ? '✓' : '☐'}</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-1.5 py-1 ${beigeBg}`}>IRONING</td>
                    <td className="border border-black px-1 py-1 text-center">{hasSkill('IRONING') === 'YES' ? '✓' : '☐'}</td>
                    <td className={`border border-black px-1.5 py-1 ${beigeBg}`}>COOKING</td>
                    <td className="border border-black px-1 py-1 text-center">{hasSkill('COOKING') === 'YES' ? '✓' : '☐'}</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-1.5 py-1 ${beigeBg}`}>ARABIC COOKING</td>
                    <td className="border border-black px-1 py-1 text-center">{hasSkill('ARABIC COOKING') === 'YES' ? '✓' : '☐'}</td>
                    <td className={`border border-black px-1.5 py-1 ${beigeBg}`}>SEWING</td>
                    <td className="border border-black px-1 py-1 text-center">{hasSkill('SEWING') === 'YES' ? '✓' : '☐'}</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-1.5 py-1 ${beigeBg}`}>DRIVING</td>
                    <td className="border border-black px-1 py-1 text-center">{hasSkill('DRIVING') === 'YES' ? '✓' : '☐'}</td>
                    <td className={`border border-black px-1.5 py-1 ${beigeBg}`}>DISABLED CARING</td>
                    <td className="border border-black px-1 py-1 text-center">{hasSkill('DISABLED CARING') === 'YES' ? '✓' : '☐'}</td>
                  </tr>
                </tbody>
              </table>

            </div>

            {/* Right Column */}
            <div className="w-[50%] flex flex-col gap-2">
              
              {/* Passport Information */}
              <table className="w-full border-collapse border border-black text-[13px] leading-tight bg-white">
                <thead>
                  <tr>
                    <th colSpan={2} className="border border-black text-left px-2 py-1 font-bold">Passport Information</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-bold w-[45%] ${beigeBg}`}>Number</td>
                    <td className="border border-black px-2 py-1 text-center uppercase">{candidate.passportData?.passportNumber}</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-bold ${beigeBg}`}>Issue Date</td>
                    <td className="border border-black px-2 py-1 text-center">{formatDate(candidate.passportData?.dateOfIssue)}</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-bold ${beigeBg}`}>Expiry Date</td>
                    <td className="border border-black px-2 py-1 text-center">{formatDate(candidate.passportData?.dateOfExpiry)}</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-bold ${beigeBg}`}>Issue Place</td>
                    <td className="border border-black px-2 py-1 text-center uppercase">{candidate.passportData?.issuingCountry || 'Ethiopia'}</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-bold ${beigeBg}`}>Next of Kin Name</td>
                    <td className="border border-black px-2 py-1 text-center uppercase">{candidate.personalInfo?.emergencyContactName || ''}</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-bold ${beigeBg}`}>Next of Kin Number</td>
                    <td className="border border-black px-2 py-1 text-center">{candidate.personalInfo?.emergencyContactPhone || ''}</td>
                  </tr>
                </tbody>
              </table>

              {/* Full Body Photo */}
              <div className="flex-1 border border-black p-1 bg-white mt-2 relative min-h-0 flex items-center justify-center">
                {fullBodyPhoto ? (
                  <img src={fullBodyPhoto} className="absolute top-1 left-1 w-[calc(100%-8px)] h-[calc(100%-8px)] object-contain" alt="Full Body" />
                ) : (
                  <div className="text-gray-400 text-sm">Full Body Photo</div>
                )}
              </div>

              {/* QR Code Section */}
              {candidate.videoUrl && (
                <div className="mt-2 p-2 border border-black bg-white flex flex-col items-center gap-1">
                  <p className="text-[9px] font-bold uppercase">Candidate Video</p>
                  <div className="w-20 h-20 bg-white border border-gray-100 flex items-center justify-center">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(candidate.videoUrl)}`} 
                      alt="Video QR" 
                      className="w-full h-full"
                    />
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      </div>

      {/* PAGE 2: Passport Scan */}
      <div className="w-[794px] h-[1123px] relative flex items-center justify-center break-before-page p-8 bg-white">
        {candidate.passportImageUrl ? (
          <img src={getFileUrl(candidate.passportImageUrl)} alt="Passport" className="max-w-[480px] max-h-[680px] object-contain shadow-md border border-gray-100 bg-white" />
        ) : (
          <div className="text-gray-400 text-lg border-2 border-dashed border-gray-300 w-full h-full flex items-center justify-center">
            Passport Image Not Available
          </div>
        )}
      </div>

    </div>
  );
}
