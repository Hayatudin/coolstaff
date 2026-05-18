import React from 'react';
import { getFileUrl } from '@/lib/utils';
import { Candidate } from '@/types';
import CVVideoFooter from '../CVVideoFooter';

interface CVTemplateProps {
  candidate: Candidate;
  facePhoto: string | null;
  fullBodyPhoto: string | null;
}

export default function ALMTemplate({ candidate, facePhoto, fullBodyPhoto }: CVTemplateProps) {
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

  // Format dates cleanly
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    } catch {
      return dateString;
    }
  };

  // Get experience summary
  let expPeriod = '-';
  let expCountry = '-';
  let expPosition = '-';
  if (candidate.personalInfo?.workExperience && candidate.personalInfo.workExperience.length > 0) {
    const exps = candidate.personalInfo.workExperience.filter(e => e.experienceStatus === 'Have experience');
    if (exps.length > 0) {
      expPeriod = exps.map(e => e.yearsOfExperience + ' YRS').join(' + ');
      expCountry = exps.map(e => e.country).join(', ');
      expPosition = exps.map(e => (e as any).position || candidate.personalInfo?.job || '').join(', ');
    }
  }

  return (
    <div className="w-full max-w-[210mm] mx-auto bg-white text-black font-sans shadow-lg print:shadow-none" dir="ltr">

      {/* PAGE 1: Profile Sheet */}
      <div className="p-[10mm] min-h-[297mm] box-border relative page-break-after-always">

        {/* Header Image */}
        <div className="w-full h-[120px] mb-4 border border-gray-200">
          <img src="/header.png" alt="Coolstaff Foreign Employment Agency" className="w-full h-full object-contain object-center" />
        </div>

        {/* Top Section: Photo + Application Details */}
        <div className="flex gap-2 mb-2">
          {/* Face Photo */}
          <div className="w-[160px] shrink-0">
            <div className="border-[1.5px] border-black h-[190px] w-full p-1 bg-white">
              {facePhoto ? (
                <img src={facePhoto} className="w-full h-full object-cover border border-gray-200" alt="Face" />
              ) : (
                <div className="w-full h-full bg-[#f3f4f6] flex items-center justify-center text-xs text-[#9ca3af] text-center">Face Photo<br />(160x190)</div>
              )}
            </div>
          </div>

          {/* Application for Employment Table */}
          <div className="flex-1">
            <table className="w-full border-collapse border-[1.5px] border-black text-[13px] leading-tight">
              <thead>
                <tr>
                  <th colSpan={3} className="border-[1.5px] border-black text-center text-[#0066cc] font-bold text-[18px] py-1.5 uppercase">
                    APPLICATION FOR EMPLOYMENT
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold w-[25%]">Full Name</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 font-bold text-center w-[50%] uppercase">{fullName}</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold w-[25%]" dir="rtl">الاسم الكامل</td>
                </tr>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Telephone</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-center font-medium">
                    {candidate.personalInfo?.phone} {candidate.personalInfo?.emergencyContactPhone ? `/ ${candidate.personalInfo?.emergencyContactPhone}` : ''}
                  </td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">رقم هاتف</td>
                </tr>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Position</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-center uppercase font-bold">{candidate.personalInfo?.job || 'HOUSE MAID'}</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">موضع</td>
                </tr>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Age</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-center font-medium">{age}</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">عمر</td>
                </tr>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Date of Expiry</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-center font-medium">{formatDate(candidate.passportData?.dateOfExpiry)}</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">تاريخ الانتهاء</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Section: Full body photo + Remaining Tables */}
        <div className="flex gap-2 items-stretch">
          {/* Full body photo */}
          <div className="w-[190px] shrink-0 flex flex-col">
            <div className="border-[1.5px] border-black p-1 bg-white flex-1 relative min-h-0">
              {fullBodyPhoto ? (
                <img src={fullBodyPhoto} className="absolute top-1 left-1 w-[calc(100%-8px)] h-[calc(100%-8px)] object-contain border border-gray-200" alt="Full Body" />
              ) : (
                <div className="w-full h-full bg-[#f3f4f6] flex items-center justify-center text-xs text-[#9ca3af] text-center">Full Body Photo<br />(190x565)</div>
              )}
            </div>
          </div>

          {/* Right column tables */}
          <div className="flex-1 flex flex-col gap-0">
            {/* Details of Applicant */}
            <table className="w-full border-collapse border-[1.5px] border-black text-[13px] leading-tight mb-[-1.5px]">
              <thead>
                <tr className="bg-[#b0c4de] !print:color-adjust-exact">
                  <th colSpan={3} className="border-[1.5px] border-black text-center font-bold py-1.5">
                    Details of Applicant <span dir="rtl" className="ml-2 font-bold">بيانات مقدم الطلب</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold w-[30%]">Nationality</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-center w-[45%] uppercase">{candidate.passportData?.nationality}</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold w-[25%]" dir="rtl">الجنسيه</td>
                </tr>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Passport No.</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-center font-bold">{candidate.passportData?.passportNumber}</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">رقم جواز السفر</td>
                </tr>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Religion</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-center uppercase">{candidate.personalInfo?.religion}</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">الديانة</td>
                </tr>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Date of Birth</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-center font-medium">{formatDate(candidate.passportData?.dateOfBirth)}</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">تاريخ الولادة</td>
                </tr>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Place of Birth</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-center uppercase">{candidate.passportData?.placeOfBirth}</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">مكان الولادة</td>
                </tr>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Complete Address</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-center uppercase text-[11px]">{candidate.personalInfo?.address}, {candidate.personalInfo?.city}</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">العنوان الكامل</td>
                </tr>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Marital Status</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-center uppercase">{candidate.personalInfo?.maritalStatus}</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">الحاله الزوجية</td>
                </tr>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">No. of Children</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-center">{candidate.personalInfo?.numberOfChildren}</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">عدد الاطفال</td>
                </tr>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Height</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-center">{candidate.personalInfo?.height ? `${candidate.personalInfo?.height} CM` : ''}</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">ارتفاع</td>
                </tr>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Weight</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-center">{candidate.personalInfo?.weight ? `${candidate.personalInfo?.weight} KG` : ''}</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">وزن</td>
                </tr>
              </tbody>
            </table>

            {/* Languages & Education */}
            <table className="w-full border-collapse border-[1.5px] border-black text-[13px] leading-tight mb-[-1.5px]">
              <thead>
                <tr className="bg-[#b0c4de] !print:color-adjust-exact">
                  <th colSpan={3} className="border-[1.5px] border-black text-center font-bold py-1.5">
                    Languages & Education <span dir="rtl" className="ml-2 font-bold">اللغة والتعليم</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold w-[30%]">English</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-center w-[45%] font-medium">{hasLang('ENGLISH')}</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold w-[25%]" dir="rtl">الإنجليزيه</td>
                </tr>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Arabic</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-center font-medium">{hasLang('ARABIC')}</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">العربيه</td>
                </tr>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Education</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-center uppercase text-[11px] font-medium">{candidate.personalInfo?.educationLevel}</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">المستوي</td>
                </tr>
              </tbody>
            </table>

            {/* Previous Employment Abroad */}
            <table className="w-full border-collapse border-[1.5px] border-black text-[13px] leading-tight">
              <thead>
                <tr className="bg-[#b0c4de] !print:color-adjust-exact">
                  <th colSpan={3} className="border-[1.5px] border-black text-center font-bold py-1.5">
                    Previous Employment Abroad <span dir="rtl" className="ml-2 font-bold">خبره خارج البلاد</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold w-[30%]">Period</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-center w-[45%] uppercase">{expPeriod}</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold w-[25%]" dir="rtl">المده</td>
                </tr>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Country</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-center uppercase">{expCountry}</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">البلد</td>
                </tr>
                <tr>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Position</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-center uppercase">{expPosition}</td>
                  <td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">المهنة</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Skills & Experience */}
        <table className="w-full border-collapse border-[1.5px] border-black text-[12px] mt-2">
          <thead>
            <tr className="bg-[#b0c4de] !print:color-adjust-exact">
              <th colSpan={6} className="border-[1.5px] border-black text-center font-bold py-1">
                Skills & Experience <span dir="rtl" className="ml-2 font-bold">خبرة العمل</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-bold w-[16.6%]">Ironing</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-center w-[16.6%]">{hasSkill('IRONING')}</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-right font-bold w-[16.6%]" dir="rtl">الكوي</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-bold w-[16.6%]">Baby Sitting</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-center w-[16.6%]">{hasSkill('BABY SITTING')}</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-right font-bold w-[16.6%]" dir="rtl">عناية الرضيع</td>
            </tr>
            <tr>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-bold">Cooking</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-center">{hasSkill('COOKING')}</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-right font-bold" dir="rtl">الطبخ</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-bold">Children Care</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-center">{hasSkill('CHILDREN CARE')}</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-right font-bold" dir="rtl">عناية الاطفال</td>
            </tr>
            <tr>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-bold">Arabic Cooking</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-center">{hasSkill('ARABIC COOKING')}</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-right font-bold" dir="rtl">الطبخ العربي</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-bold">Tutoring</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-center">{hasSkill('TUTORING')}</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-right font-bold" dir="rtl">تعليم الأطفال</td>
            </tr>
            <tr>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-bold">Sewing</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-center">{hasSkill('SEWING')}</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-right font-bold" dir="rtl">خياطة</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-bold">Cleaning</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-center">{hasSkill('CLEANING')}</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-right font-bold" dir="rtl">التنظيف</td>
            </tr>
            <tr>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-bold">Computer</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-center">{hasSkill('COMPUTER')}</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-right font-bold" dir="rtl">استخدام الكمبيوتر</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-bold">Washing</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-center">{hasSkill('WASHING')}</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-right font-bold" dir="rtl">الغسيل</td>
            </tr>
            <tr>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-bold">Other skills</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-center">NO</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-right font-bold" dir="rtl">خبرات أخري</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-bold"></td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-center"></td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-right font-bold" dir="rtl"></td>
            </tr>
            <tr>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-bold">Remarks</td>
              <td className="border-[1.5px] border-black px-1.5 py-1 text-center" colSpan={5}></td>
            </tr>
          </tbody>
        </table>

      </div>

      {/* PAGE 2: Passport Scan */}
      <div className="w-[794px] h-[1123px] relative flex items-center justify-center break-before-page p-8 bg-white">
        {candidate.passportImageUrl ? (
          <img src={getFileUrl(candidate.passportImageUrl)} alt="Passport" className="w-[500px] h-[350px] object-contain border border-gray-150 shadow-sm" />
        ) : (
          <div className="text-gray-400 text-sm border-2 border-dashed border-gray-200 w-[500px] h-[350px] flex items-center justify-center">
            Passport Image Not Available
          </div>
        )}
      </div>

    </div>
  );
}
