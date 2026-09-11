import React from 'react';
import { getFileUrl } from '@/lib/utils';
import { Candidate } from '@/types';
import CVVideoFooter from '../CVVideoFooter';
import { resolveCandidateNationality, resolveCandidateWorkExperience } from '@/lib/cvHelpers';

interface CVTemplateProps {
  candidate: Candidate;
  facePhoto: string | null;
  fullBodyPhoto: string | null;
}

export default function MATemplate({ candidate, facePhoto, fullBodyPhoto }: CVTemplateProps) {
  // Reuse ALM layout with MA header
  const ALMTemplate = require('./ALMTemplate').default;
  // We render ALM but swap the header
  return <ALMLayoutWithHeader candidate={candidate} facePhoto={facePhoto} fullBodyPhoto={fullBodyPhoto} headerImage="/MA.png" />;
}

// Shared ALM-style layout with configurable header
function ALMLayoutWithHeader({ candidate, facePhoto, fullBodyPhoto, headerImage }: CVTemplateProps & { headerImage: string }) {
  const resolvedExps = resolveCandidateWorkExperience(candidate);
  const resolvedNationality = resolveCandidateNationality(candidate);

  const calculateAge = (dob: string | undefined) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const isExperienced = resolvedExps.length > 0;
  const hasLang = (lang: string) => candidate.personalInfo?.languages?.includes(lang) ? 'YES' : 'NO';
  const hasSkill = (skill: string) => {
    const s = skill.toUpperCase();
    if (s === 'COOKING' || s === 'ARABIC COOKING') {
      return isExperienced ? 'YES' : 'NO';
    }
    if (s === 'IRONING') {
      return isExperienced ? (candidate.personalInfo?.skills?.includes(skill) ? 'YES' : 'NO') : 'NO';
    }
    if (s === 'CLEANING' || s === 'WASHING' || s === 'BABY' || s === 'BABY SITTING' || s === 'BABY_SITTING' || s === 'CHILDREN CARE' || s === 'CHILDREN_CARE') {
      return 'YES';
    }
    return candidate.personalInfo?.skills?.includes(skill) ? 'YES' : 'NO';
  };

  const fullName = `${candidate.passportData?.givenNames || ''} ${candidate.passportData?.surname || ''}`.trim();
  const age = calculateAge(candidate.passportData?.dateOfBirth);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    } catch { return dateString; }
  };

  let expPeriod = '-';
  let expCountry = '-';
  let expPosition = '-';
  if (resolvedExps.length > 0) {
    expPeriod = resolvedExps.map(e => e.yearsOfExperience + ' YRS').join(' + ');
    expCountry = resolvedExps.map(e => e.country).join(', ');
    expPosition = resolvedExps.map(e => e.position || candidate.personalInfo?.job || 'HOUSE MAID').join(', ');
  }

  return (
    <div className="w-full max-w-[210mm] mx-auto bg-white text-black font-sans shadow-lg print:shadow-none" dir="ltr">
      <div className="p-[10mm] min-h-[297mm] box-border relative">
        {/* Header Image - CONFIGURABLE */}
        <div className="w-full h-[120px] mb-4 border border-gray-200">
          <img src={headerImage} alt="Agency Header" className="w-full h-full object-contain object-center" />
        </div>

        <div className="flex gap-2 mb-2">
          <div className="w-[160px] shrink-0">
            <div className="border-[1.5px] border-black h-[190px] w-full p-1 bg-white">
              {facePhoto ? (
                <img src={facePhoto} className="w-full h-full object-cover border border-gray-200" alt="Face" />
              ) : (
                <div className="w-full h-full bg-[#f3f4f6] flex items-center justify-center text-xs text-[#9ca3af] text-center">Face Photo</div>
              )}
            </div>
          </div>

          <div className="flex-1">
            <table className="w-full border-collapse border-[1.5px] border-black text-[13.5px] leading-tight">
              <thead>
                <tr>
                  <th colSpan={3} className="border-[1.5px] border-black text-center text-[#0066cc] font-black text-[19px] py-1.5 uppercase">
                    APPLICATION FOR EMPLOYMENT
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-extrabold w-[25%]">Full Name</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 font-black text-center w-[50%] uppercase text-[15px]">{fullName}</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-extrabold w-[25%]" dir="rtl">الاسم الكامل</td>
                </tr>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-extrabold">Telephone</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-center font-bold">{candidate.personalInfo?.phone} {candidate.personalInfo?.emergencyContactPhone ? `/ ${candidate.personalInfo?.emergencyContactPhone}` : ''}</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-extrabold" dir="rtl">رقم هاتف</td>
                </tr>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-extrabold">Position</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-center uppercase font-black text-[14px]">{candidate.personalInfo?.job || 'HOUSE MAID'}</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-extrabold" dir="rtl">موضع</td>
                </tr>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-extrabold">Age</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-center font-bold">{age}</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-extrabold" dir="rtl">عمر</td>
                </tr>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-extrabold">Date of Expiry</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-center font-bold">{formatDate(candidate.passportData?.dateOfExpiry)}</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-extrabold" dir="rtl">تاريخ الانتهاء</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-2 items-stretch">
          <div className="w-[270px] shrink-0 flex flex-col">
            <div className="border-[1.5px] border-black p-0 bg-white flex-1 relative min-h-0 overflow-hidden">
              {fullBodyPhoto ? (
                <img src={fullBodyPhoto} className="w-full h-full object-cover" alt="Full Body" />
              ) : (
                <div className="w-full h-full bg-[#f3f4f6] flex items-center justify-center text-xs text-[#9ca3af] text-center font-bold">Full Body Photo</div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-0">
            <table className="w-full border-collapse border-[1.5px] border-black text-[13.5px] leading-tight mb-[-1.5px]">
              <thead><tr className="bg-[#b0c4de]"><th colSpan={3} className="border-[1.5px] border-black text-center font-black py-1.5 text-[14px]">Details of Applicant <span dir="rtl" className="ml-2 font-black">بيانات مقدم الطلب</span></th></tr></thead>
              <tbody>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-extrabold w-[30%]">Nationality</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center w-[45%] uppercase font-bold">{resolvedNationality}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-extrabold w-[25%]" dir="rtl">الجنسيه</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1 text-[#0066cc] font-black">Passport No.</td><td className="border-[1.5px] border-black px-2 py-1 text-center font-black font-roboto text-[21px] tracking-wider text-[#d32f2f]" style={{ fontFamily: "'Roboto', sans-serif", fontWeight: '900', fontSize: '21px' }}>{candidate.passportData?.passportNumber}</td><td className="border-[1.5px] border-black px-2 py-1 text-right font-black" dir="rtl">رقم جواز السفر</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-extrabold">Religion</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center uppercase font-bold">{candidate.personalInfo?.religion}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-extrabold" dir="rtl">الديانة</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-extrabold">Date of Birth</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center font-bold">{formatDate(candidate.passportData?.dateOfBirth)}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-extrabold" dir="rtl">تاريخ الولادة</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-extrabold">Place of Birth</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center uppercase font-bold">{candidate.passportData?.placeOfBirth}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-extrabold" dir="rtl">مكان الولادة</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-extrabold">Complete Address</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center uppercase text-[12px] font-bold">{candidate.personalInfo?.city}, {candidate.personalInfo?.city}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-extrabold" dir="rtl">العنوان الكامل</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-extrabold">Marital Status</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center uppercase font-bold">{candidate.personalInfo?.maritalStatus}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-extrabold" dir="rtl">الحاله الزوجية</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-extrabold">No. of Children</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center font-bold">{candidate.personalInfo?.numberOfChildren}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-extrabold" dir="rtl">عدد الاطفال</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-extrabold">Height</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center font-bold">{candidate.personalInfo?.height ? `${candidate.personalInfo.height} CM` : ''}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-extrabold" dir="rtl">ارتفاع</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-extrabold">Weight</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center font-bold">{candidate.personalInfo?.weight ? `${candidate.personalInfo.weight} KG` : ''}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-extrabold" dir="rtl">وزن</td></tr>
              </tbody>
            </table>

            <table className="w-full border-collapse border-[1.5px] border-black text-[13.5px] leading-tight mb-[-1.5px]">
              <thead><tr className="bg-[#b0c4de]"><th colSpan={3} className="border-[1.5px] border-black text-center font-black py-1.5 text-[14px]">Languages & Education <span dir="rtl" className="ml-2 font-black">اللغة والتعليم</span></th></tr></thead>
              <tbody>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-extrabold w-[30%]">English</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center w-[45%] font-bold">{hasLang('ENGLISH')}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-extrabold w-[25%]" dir="rtl">الإنجليزيه</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-extrabold">Arabic</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center font-bold">{hasLang('ARABIC')}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-extrabold" dir="rtl">العربيه</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-extrabold">Education</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center uppercase text-[12px] font-bold">{candidate.personalInfo?.educationLevel}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-extrabold" dir="rtl">المستوي</td></tr>
              </tbody>
            </table>

            <table className="w-full border-collapse border-[1.5px] border-black text-[13.5px] leading-tight">
              <thead><tr className="bg-[#b0c4de]"><th colSpan={3} className="border-[1.5px] border-black text-center font-black py-1.5 text-[14px]">Previous Employment Abroad <span dir="rtl" className="ml-2 font-black">خبره خارج البلاد</span></th></tr></thead>
              <tbody>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-extrabold w-[30%]">Period</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center w-[45%] uppercase font-bold">{expPeriod}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-extrabold w-[25%]" dir="rtl">المده</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-extrabold">Country</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center uppercase font-bold">{expCountry}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-extrabold" dir="rtl">البلد</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-extrabold">Position</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center uppercase font-bold">{expPosition}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-extrabold" dir="rtl">المهنة</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <table className="w-full border-collapse border-[1.5px] border-black text-[12.5px] mt-2">
          <thead><tr className="bg-[#b0c4de]"><th colSpan={6} className="border-[1.5px] border-black text-center font-black py-1 text-[13.5px]">Skills & Experience <span dir="rtl" className="ml-2 font-black">خبرة العمل</span></th></tr></thead>
          <tbody>
            <tr><td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-extrabold">Ironing</td><td className="border-[1.5px] border-black px-1.5 py-1 text-center font-bold">{hasSkill('IRONING')}</td><td className="border-[1.5px] border-black px-1.5 py-1 text-right font-extrabold" dir="rtl">الكوي</td><td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-extrabold">Baby Sitting</td><td className="border-[1.5px] border-black px-1.5 py-1 text-center font-bold">{hasSkill('BABY SITTING')}</td><td className="border-[1.5px] border-black px-1.5 py-1 text-right font-extrabold" dir="rtl">عناية الرضيع</td></tr>
            <tr><td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-extrabold">Cooking</td><td className="border-[1.5px] border-black px-1.5 py-1 text-center font-bold">{hasSkill('COOKING')}</td><td className="border-[1.5px] border-black px-1.5 py-1 text-right font-extrabold" dir="rtl">الطبخ</td><td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-extrabold">Children Care</td><td className="border-[1.5px] border-black px-1.5 py-1 text-center font-bold">{hasSkill('CHILDREN CARE')}</td><td className="border-[1.5px] border-black px-1.5 py-1 text-right font-extrabold" dir="rtl">عناية الاطفال</td></tr>
            <tr><td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-extrabold">Arabic Cooking</td><td className="border-[1.5px] border-black px-1.5 py-1 text-center font-bold">{hasSkill('ARABIC COOKING')}</td><td className="border-[1.5px] border-black px-1.5 py-1 text-right font-extrabold" dir="rtl">الطبخ العربي</td><td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-extrabold">Tutoring</td><td className="border-[1.5px] border-black px-1.5 py-1 text-center font-bold">{hasSkill('TUTORING')}</td><td className="border-[1.5px] border-black px-1.5 py-1 text-right font-extrabold" dir="rtl">تعليم الأطفال</td></tr>
            <tr><td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-extrabold">Sewing</td><td className="border-[1.5px] border-black px-1.5 py-1 text-center font-bold">{hasSkill('SEWING')}</td><td className="border-[1.5px] border-black px-1.5 py-1 text-right font-extrabold" dir="rtl">خياطة</td><td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-extrabold">Cleaning</td><td className="border-[1.5px] border-black px-1.5 py-1 text-center font-bold">{hasSkill('CLEANING')}</td><td className="border-[1.5px] border-black px-1.5 py-1 text-right font-extrabold" dir="rtl">التنظيف</td></tr>
            <tr><td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-extrabold">Computer</td><td className="border-[1.5px] border-black px-1.5 py-1 text-center font-bold">{hasSkill('COMPUTER')}</td><td className="border-[1.5px] border-black px-1.5 py-1 text-right font-extrabold" dir="rtl">استخدام الكمبيوتر</td><td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-extrabold">Washing</td><td className="border-[1.5px] border-black px-1.5 py-1 text-center font-bold">{hasSkill('WASHING')}</td><td className="border-[1.5px] border-black px-1.5 py-1 text-right font-extrabold" dir="rtl">الغسيل</td></tr>
            <tr><td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-extrabold">Remarks</td><td className="border-[1.5px] border-black px-1.5 py-1 text-center font-bold" colSpan={5}></td></tr>
          </tbody>
        </table>

        {candidate.videoUrl && (
          <div className="mt-4">
            <CVVideoFooter videoUrl={candidate.videoUrl} />
          </div>
        )}

      </div>
    </div>
  );
}
