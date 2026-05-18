import React from 'react';
import { Candidate } from '@/types';
import CVVideoFooter from '../CVVideoFooter';
import { getFileUrl } from '@/lib/utils';

interface CVTemplateProps {
  candidate: Candidate;
  facePhoto: string | null;
  fullBodyPhoto: string | null;
}

export default function VisionTemplate({ candidate, facePhoto, fullBodyPhoto }: CVTemplateProps) {
  // Helper for Age calculation
  const calculateAge = (dob: string | undefined) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const hasLang = (lang: string) => {
    return candidate.personalInfo?.languages?.some(l => l.toUpperCase().includes(lang.toUpperCase())) ? 'YES' : 'NO';
  };

  const hasSkill = (skillName: string) => {
    const skills = candidate.personalInfo?.skills || [];
    return skills.some(s => s.toUpperCase().includes(skillName.toUpperCase())) ? 'YES' : 'NO';
  };

  const fullName = `${candidate.passportData?.givenNames || ''} ${candidate.passportData?.surname || ''}`.trim();
  const age = calculateAge(candidate.passportData?.dateOfBirth);

  let expCountry = '-';
  let expPeriod = '-';
  let expPosition = '-';
  let totalYears = 0;

  if (candidate.personalInfo?.workExperience && candidate.personalInfo.workExperience.length > 0) {
    const exps = candidate.personalInfo.workExperience.filter(e => e.experienceStatus === 'Have experience');
    if (exps.length > 0) {
      expCountry = exps.map(e => e.country).join(', ');
      expPeriod = exps.map(e => e.yearsOfExperience + ' YRS').join(' + ');
      expPosition = exps.map(e => (e as any).position || candidate.personalInfo?.job || 'HOUSE MAID').join(', ');
      totalYears = exps.reduce((acc, curr) => acc + (parseInt(curr.yearsOfExperience) || 0), 0);
    }
  }

  // Visual Palette matching Vision Recruitment Office Logo (Gold, Deep Teal)
  const bgTeal = 'bg-[#0a5c4e]';
  const textTeal = 'text-[#0a5c4e]';
  const borderTeal = 'border-[#0a5c4e]';
  const goldGradient = 'bg-gradient-to-r from-[#8a6f27] via-[#c5a85c] to-[#8a6f27]';

  return (
    <div className="w-[794px] mx-auto bg-white text-black font-sans shadow-lg print:shadow-none" dir="ltr">
      
      {/* PAGE 1: Core CV Details */}
      <div className="w-[794px] h-[1123px] p-[6mm] box-border relative page-break-after-always flex flex-col justify-between overflow-hidden">
        
        <div className="flex flex-col flex-grow">
          {/* A. Top Header Banner */}
          <div className="w-full h-[100px] mb-2 shrink-0">
            <img src="/vision-header.png" alt="Vision Recruitment Office" className="w-full h-full object-contain" />
          </div>

          {/* B. Grid layout: Left Sidebar & Right details */}
          <div className="flex gap-3 items-stretch flex-grow min-h-0">
            
            {/* 1. LEFT SIDEBAR */}
            <div className="w-[200px] flex flex-col justify-between border border-[#0a5c4e] p-1 bg-slate-50 shrink-0">
              
              <div className="flex flex-col gap-2">
                {/* Photo Box - Constant fixed size, cannot extend or stretch */}
                <div className={`border-2 ${borderTeal} w-[190px] h-[240px] p-0.5 bg-white relative flex items-center justify-center`}>
                  {facePhoto ? (
                    <img src={facePhoto} className="w-full h-full object-cover" alt="Candidate Face" />
                  ) : (
                    <div className="text-gray-400 text-xs text-center font-bold">Face Photo</div>
                  )}
                </div>
              </div>

              {/* Spacer */}
              <div className="flex-grow"></div>

              {/* Contact Us Card */}
              <div className={`w-full ${bgTeal} text-white p-2 rounded-sm border border-white shadow-sm flex flex-col gap-2 mt-4`}>
                <div className="text-center font-bold text-[11px] border-b border-white/30 pb-1 flex flex-col leading-tight">
                  <span>CONTACT US</span>
                  <span dir="rtl" className="text-[10px] font-medium font-serif">تواصل معنا</span>
                </div>
                <div className="flex flex-col gap-1.5 text-[10px] font-bold">
                  <div className="flex items-center gap-1 hover:text-yellow-300 transition-colors">
                    <span>📧</span>
                    <span className="truncate">Alrooaya@gmail.com</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>📞</span>
                    <span>0550022505</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>📞</span>
                    <span>0570060006</span>
                  </div>
                </div>
              </div>

            </div>

            {/* 2. RIGHT MAIN UNIFIED CONTIGUOUS TABLE */}
            <div className="flex-grow min-w-0">
              <table className={`w-full border-collapse border-[1.5px] ${borderTeal} text-[11px] leading-tight`}>
                <tbody>
                  {/* B. Employment Title Bar inside table */}
                  <tr className="h-[28px]">
                    <td colSpan={6} className={`${goldGradient} text-white font-extrabold text-[13px] text-center uppercase tracking-wider border-b border-[#0a5c4e]`}>
                      APPLICATION FOR EMPLOYMENT
                    </td>
                  </tr>

                  {/* Row 1: FULL NAME */}
                  <tr className="h-[28px] bg-[#e8f5e9]">
                    <td colSpan={2} className={`border-b border-r border-[#0a5c4e] px-2 font-extrabold text-[10px] ${textTeal} w-[22%]`}>FULL NAME</td>
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 text-center font-extrabold text-[12px] text-gray-900 uppercase">{fullName}</td>
                    <td colSpan={2} className={`border-b border-[#0a5c4e] px-2 text-right font-extrabold text-[11px] ${textTeal} font-serif`} dir="rtl">الإسم الكامل</td>
                  </tr>

                  {/* Row 2: Monthly Salary and Contract Period */}
                  <tr className="h-[24px]">
                    <td colSpan={1} className="border-b border-r border-[#0a5c4e] px-2 font-bold text-gray-700 bg-slate-50 w-[18%]">Monthly Salary</td>
                    <td colSpan={1} className="border-b border-r border-[#0a5c4e] px-2 text-center font-extrabold text-emerald-800 bg-[#e8f5e9] w-[15%]">
                      {candidate.salary || candidate.personalInfo?.salary || '1000SAR'}
                    </td>
                    <td colSpan={1} className="border-b border-r border-[#0a5c4e] px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif w-[17%]" dir="rtl">الراتب الشهري</td>
                    <td colSpan={1} className="border-b border-r border-[#0a5c4e] px-2 font-bold text-gray-700 bg-slate-50 w-[18%]">Contract Period</td>
                    <td colSpan={1} className="border-b border-r border-[#0a5c4e] px-2 text-center font-bold text-gray-800 w-[15%]">2 YEARS</td>
                    <td colSpan={1} className="border-b border-[#0a5c4e] px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif w-[17%]" dir="rtl">مدة العقد</td>
                  </tr>

                  {/* Row 3: Section Header: LANGUAGES & EDUCATION */}
                  <tr className="bg-[#0a5c4e] text-white font-bold text-[11px] h-[24px]">
                    <td colSpan={6} className="px-2 border-b border-[#0a5c4e]">
                      <div className="flex justify-between items-center">
                        <span>LANGUAGES & EDUCATION</span>
                        <span dir="rtl" className="font-serif">اللغة والتعليم</span>
                      </div>
                    </td>
                  </tr>

                  {/* Languages and Education Rows */}
                  {/* Row: English */}
                  <tr className="h-[21px]">
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 font-bold text-gray-700 bg-slate-50">English</td>
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 text-center font-bold text-gray-800">{hasLang('ENGLISH')}</td>
                    <td colSpan={2} className="border-b border-[#0a5c4e] px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">الإنجليزية</td>
                  </tr>
                  {/* Row: Arabic */}
                  <tr className="h-[21px]">
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 font-bold text-gray-700 bg-slate-50">Arabic</td>
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 text-center font-bold text-gray-800">{hasLang('ARABIC')}</td>
                    <td colSpan={2} className="border-b border-[#0a5c4e] px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">العربية</td>
                  </tr>
                  {/* Row: Education Level */}
                  <tr className="h-[21px]">
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 font-bold text-gray-700 bg-slate-50">Education (Course)</td>
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 text-center font-bold text-gray-800 uppercase">{candidate.personalInfo?.educationLevel || 'SECONDARY'}</td>
                    <td colSpan={2} className="border-b border-[#0a5c4e] px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">المستوى التعليمي</td>
                  </tr>
                  {/* Row: Passport Number */}
                  <tr className="h-[21px]">
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 font-bold text-gray-700 bg-slate-50">Passport Number</td>
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 text-center font-extrabold text-[#d32f2f] uppercase">{candidate.passportData?.passportNumber}</td>
                    <td colSpan={2} className="border-b border-[#0a5c4e] px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">رقم الجواز</td>
                  </tr>
                  {/* Row: Previous Employment */}
                  <tr className="h-[21px]">
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 font-bold text-gray-700 bg-slate-50">Previous Employment</td>
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 text-center font-bold text-gray-800 uppercase">{expCountry !== '-' ? `${expCountry} (${expPeriod})` : 'NONE'}</td>
                    <td colSpan={2} className="border-b border-[#0a5c4e] px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">خبرة خارج البلاد</td>
                  </tr>

                  {/* Row 4: Section Header: PERSONAL DATA */}
                  <tr className="bg-[#0a5c4e] text-white font-bold text-[11px] h-[24px]">
                    <td colSpan={6} className="px-2 border-b border-[#0a5c4e]">
                      <div className="flex justify-between items-center">
                        <span>PERSONAL DATA</span>
                        <span dir="rtl" className="font-serif">معلومات</span>
                      </div>
                    </td>
                  </tr>

                  {/* Personal Data Rows */}
                  {/* Nationality */}
                  <tr className="h-[21px]">
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 font-bold text-gray-700 bg-slate-50">Nationality</td>
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 text-center font-bold text-gray-800 uppercase">{candidate.passportData?.nationality || 'ETHIOPIAN'}</td>
                    <td colSpan={2} className="border-b border-[#0a5c4e] px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">الجنسية</td>
                  </tr>
                  {/* Religion */}
                  <tr className="h-[21px]">
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 font-bold text-gray-700 bg-slate-50">Religion</td>
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 text-center font-bold text-gray-800 uppercase">{candidate.personalInfo?.religion || 'MUSLIM'}</td>
                    <td colSpan={2} className="border-b border-[#0a5c4e] px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">الديانة</td>
                  </tr>
                  {/* Marital Status */}
                  <tr className="h-[21px]">
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 font-bold text-gray-700 bg-slate-50">Marital Status</td>
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 text-center font-bold text-gray-800 uppercase">{candidate.personalInfo?.maritalStatus || 'SINGLE'}</td>
                    <td colSpan={2} className="border-b border-[#0a5c4e] px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">الحالة الاجتماعية</td>
                  </tr>
                  {/* No. of Children */}
                  <tr className="h-[21px]">
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 font-bold text-gray-700 bg-slate-50">No. of Children</td>
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 text-center font-bold text-gray-800">{candidate.personalInfo?.numberOfChildren || 0}</td>
                    <td colSpan={2} className="border-b border-[#0a5c4e] px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">عدد الأطفال</td>
                  </tr>
                  {/* Age */}
                  <tr className="h-[21px]">
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 font-bold text-gray-700 bg-slate-50">Age</td>
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 text-center font-bold text-gray-800">{age}</td>
                    <td colSpan={2} className="border-b border-[#0a5c4e] px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">العمر</td>
                  </tr>
                  {/* Weight */}
                  <tr className="h-[21px]">
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 font-bold text-gray-700 bg-slate-50">Weight</td>
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 text-center font-bold text-gray-800">{candidate.personalInfo?.weight ? `${candidate.personalInfo.weight} KG` : '-'}</td>
                    <td colSpan={2} className="border-b border-[#0a5c4e] px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">الوزن</td>
                  </tr>
                  {/* Height */}
                  <tr className="h-[21px]">
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 font-bold text-gray-700 bg-slate-50">Height</td>
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 text-center font-bold text-gray-800">{candidate.personalInfo?.height ? `${candidate.personalInfo.height} CM` : '-'}</td>
                    <td colSpan={2} className="border-b border-[#0a5c4e] px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">الطول</td>
                  </tr>
                  {/* Place of Birth */}
                  <tr className="h-[21px]">
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 font-bold text-gray-700 bg-slate-50">Place of Birth</td>
                    <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 text-center font-extrabold text-gray-800 uppercase">{candidate.passportData?.placeOfBirth || candidate.personalInfo?.city || '-'}</td>
                    <td colSpan={2} className="border-b border-[#0a5c4e] px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">مكان الميلاد</td>
                  </tr>

                  {/* Row 5: Section Header: SKILLS & EXPERIENCES */}
                  <tr className="bg-[#0a5c4e] text-white font-bold text-[11px] h-[24px]">
                    <td colSpan={6} className="px-2 border-b border-[#0a5c4e]">
                      <div className="flex justify-between items-center">
                        <span>SKILLS & EXPERIENCES</span>
                        <span dir="rtl" className="font-serif">خبرة العمل</span>
                      </div>
                    </td>
                  </tr>

                  {/* Total Experience highlight row */}
                  <tr className="h-[22px] bg-[#fcf9f0]">
                    <td colSpan={6} className="text-center font-extrabold text-[11px] text-[#a68a3c] border-b border-[#0a5c4e]">
                      {totalYears > 0 ? `${totalYears} YEARS TOTAL EXPERIENCE` : '0 YEAR EXPERIENCE'}
                    </td>
                  </tr>

                  {/* Skills Grid Rows */}
                  {/* Row 1: Children Care & Washing */}
                  <tr className="h-[21px]">
                    <td className="border-b border-r border-[#0a5c4e] px-1.5 font-bold text-gray-700 text-[9.5px] w-[18%]">Children Care</td>
                    <td className={`border-b border-r border-[#0a5c4e] px-1 text-center font-extrabold text-[9.5px] w-[10%] ${hasSkill('CHILDREN_CARE') === 'YES' || hasSkill('BABY_SITTING') === 'YES' ? 'text-emerald-800 bg-[#e8f5e9]' : 'text-red-700 bg-red-50'}`}>{hasSkill('CHILDREN_CARE') === 'YES' || hasSkill('BABY_SITTING') === 'YES' ? 'YES' : 'NO'}</td>
                    <td className="border-b border-r border-[#0a5c4e] px-1.5 text-right font-bold text-gray-700 text-[9.5px] font-serif w-[22%]" dir="rtl">عناية الأطفال</td>
                    
                    <td className="border-b border-r border-[#0a5c4e] px-1.5 font-bold text-gray-700 text-[9.5px] w-[18%]">Washing</td>
                    <td className={`border-b border-r border-[#0a5c4e] px-1 text-center font-extrabold text-[9.5px] w-[10%] ${hasSkill('WASHING') === 'YES' ? 'text-emerald-800 bg-[#e8f5e9]' : 'text-red-700 bg-red-50'}`}>{hasSkill('WASHING')}</td>
                    <td className="border-b border-[#0a5c4e] px-1.5 text-right font-bold text-gray-700 text-[9.5px] font-serif w-[22%]" dir="rtl">الغسيل</td>
                  </tr>
                  {/* Row 2: Tutoring & Ironing */}
                  <tr className="h-[21px]">
                    <td className="border-b border-r border-[#0a5c4e] px-1.5 font-bold text-gray-700 text-[9.5px]">Tutoring</td>
                    <td className={`border-b border-r border-[#0a5c4e] px-1 text-center font-bold text-[9.5px] ${hasSkill('TUTORING') === 'YES' ? 'text-emerald-800 bg-[#e8f5e9]' : 'text-red-700 bg-red-50'}`}>{hasSkill('TUTORING')}</td>
                    <td className="border-b border-r border-[#0a5c4e] px-1.5 text-right font-bold text-gray-700 text-[9.5px] font-serif" dir="rtl">تعليم الأطفال</td>
                    
                    <td className="border-b border-r border-[#0a5c4e] px-1.5 font-bold text-gray-700 text-[9.5px]">Ironing</td>
                    <td className={`border-b border-r border-[#0a5c4e] px-1 text-center font-bold text-[9.5px] ${hasSkill('IRONING') === 'YES' ? 'text-emerald-800 bg-[#e8f5e9]' : 'text-red-700 bg-red-50'}`}>{hasSkill('IRONING')}</td>
                    <td className="border-b border-[#0a5c4e] px-1.5 text-right font-bold text-gray-700 text-[9.5px] font-serif" dir="rtl">الكوي</td>
                  </tr>
                  {/* Row 3: Disabled Care & Cooking */}
                  <tr className="h-[21px]">
                    <td className="border-b border-r border-[#0a5c4e] px-1.5 font-bold text-gray-700 text-[9.5px]">Disabled Care</td>
                    <td className={`border-b border-r border-[#0a5c4e] px-1 text-center font-bold text-[9.5px] ${hasSkill('DISABLED_CARE') === 'YES' || hasSkill('CAREGIVER') === 'YES' ? 'text-emerald-800 bg-[#e8f5e9]' : 'text-red-700 bg-red-50'}`}>{hasSkill('DISABLED_CARE') === 'YES' || hasSkill('CAREGIVER') === 'YES' ? 'YES' : 'NO'}</td>
                    <td className="border-b border-r border-[#0a5c4e] px-1.5 text-right font-bold text-gray-700 text-[9.5px] font-serif" dir="rtl">عناية العجزة</td>
                    
                    <td className="border-b border-r border-[#0a5c4e] px-1.5 font-bold text-gray-700 text-[9.5px]">Cooking</td>
                    <td className={`border-b border-r border-[#0a5c4e] px-1 text-center font-extrabold text-[9.5px] ${hasSkill('COOKING') === 'YES' ? 'text-emerald-800 bg-[#e8f5e9]' : 'text-red-700 bg-red-50'}`}>{hasSkill('COOKING')}</td>
                    <td className="border-b border-[#0a5c4e] px-1.5 text-right font-bold text-gray-700 text-[9.5px] font-serif" dir="rtl">الطبخ</td>
                  </tr>
                  {/* Row 4: Cleaning & Baby Sitting */}
                  <tr className="h-[21px]">
                    <td className="border-b border-r border-[#0a5c4e] px-1.5 font-bold text-gray-700 text-[9.5px]">Cleaning</td>
                    <td className={`border-b border-r border-[#0a5c4e] px-1 text-center font-extrabold text-[9.5px] ${hasSkill('CLEANING') === 'YES' ? 'text-emerald-800 bg-[#e8f5e9]' : 'text-red-700 bg-red-50'}`}>{hasSkill('CLEANING')}</td>
                    <td className="border-b border-r border-[#0a5c4e] px-1.5 text-right font-bold text-gray-700 text-[9.5px] font-serif" dir="rtl">التنظيف</td>
                    
                    <td className="border-b border-r border-[#0a5c4e] px-1.5 font-bold text-gray-700 text-[9.5px]">Baby Sitting</td>
                    <td className={`border-b border-r border-[#0a5c4e] px-1 text-center font-extrabold text-[9.5px] ${hasSkill('BABY_SITTING') === 'YES' ? 'text-emerald-800 bg-[#e8f5e9]' : 'text-red-700 bg-red-50'}`}>{hasSkill('BABY_SITTING')}</td>
                    <td className="border-b border-[#0a5c4e] px-1.5 text-right font-bold text-gray-700 text-[9.5px] font-serif" dir="rtl">عناية الرضع</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>

        {/* Dynamic Video Footer QR Section */}
        {candidate.videoUrl && (
          <div className="mt-2 shrink-0 border-t border-slate-200 pt-2 flex items-center justify-between px-2 bg-slate-50 rounded-sm">
            <span className={`text-[10px] font-bold ${textTeal}`}>➢ SCAN QR CODE TO WATCH VIDEO INTRODUCTION</span>
            <div className="w-14 h-14 bg-white p-0.5 border border-slate-300 shadow-sm flex items-center justify-center">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(candidate.videoUrl)}`} 
                alt="Video QR" 
                className="w-full h-full"
              />
            </div>
          </div>
        )}

      </div>

      {/* PAGE 2: Scans Layout */}
      <div className="w-[794px] h-[1123px] p-[6mm] box-border relative break-before-page flex flex-col justify-between overflow-hidden">
        
        <div className="flex flex-col flex-grow">
          {/* A. Top Header Logo */}
          <div className="w-full h-[100px] mb-4 shrink-0">
            <img src="/vision-header-second-page.png" alt="Vision Recruitment Office" className="w-full h-full object-contain" />
          </div>

          {/* B. Visual Scans Title Banner */}
          <div className={`w-full ${goldGradient} text-white font-extrabold text-[14px] py-0.5 text-center uppercase mb-6 shadow-sm`}>
            CANDIDATE VISUAL DOCUMENT SCANS
          </div>

          {/* C. Dual side-by-side scans */}
          <div className="flex gap-4 items-stretch flex-grow min-h-0">
            {/* Left Side: Full Body Scan */}
            <div className="w-1/2 border-2 border-dashed border-slate-300 bg-slate-50 p-2 flex flex-col justify-between h-[650px]">
              <div className={`w-full ${bgTeal} text-white text-center font-bold py-1 text-[11px] mb-2`}>
                FULL BODY PHOTO
              </div>
              <div className="flex-grow w-full relative flex items-center justify-center bg-white border border-slate-200 p-1">
                {fullBodyPhoto ? (
                  <img src={fullBodyPhoto} className="max-w-full max-h-[580px] object-contain" alt="Full Body Photo" />
                ) : (
                  <div className="text-gray-400 text-xs font-bold">Full Body Photo Scan Not Available</div>
                )}
              </div>
            </div>

            {/* Right Side: Passport Scan */}
            <div className="w-1/2 border-2 border-dashed border-slate-300 bg-slate-50 p-2 flex flex-col justify-between h-[650px]">
              <div className={`w-full ${bgTeal} text-white text-center font-bold py-1 text-[11px] mb-2`}>
                PASSPORT DATA IMAGE
              </div>
              <div className="flex-grow w-full relative flex items-center justify-center bg-white border border-slate-200 p-1">
                {candidate.passportImageUrl ? (
                  <img src={getFileUrl(candidate.passportImageUrl)} className="max-w-full max-h-[580px] object-contain" alt="Passport Scan" />
                ) : (
                  <div className="text-gray-400 text-xs font-bold">Passport Scan Not Available</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Video Footer */}
        <CVVideoFooter videoUrl={candidate.videoUrl} />

      </div>

    </div>
  );
}
