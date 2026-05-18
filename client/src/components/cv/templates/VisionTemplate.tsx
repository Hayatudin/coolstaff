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

          {/* Unified Core Details Table */}
          <div className="flex-grow min-h-0">
            <table className={`w-full border-collapse border-[1.5px] ${borderTeal} text-[11px] leading-tight text-black`}>
              <tbody>
                {/* 1. APPLICATION FOR EMPLOYMENT HEADER ROW */}
                <tr className="h-[32px]">
                  <td colSpan={7} className="border-b border-[#0a5c4e] text-center font-extrabold text-[14px] uppercase text-black" style={{ background: 'linear-gradient(to right, #8a6f27, #c5a85c, #8a6f27)' }}>
                    APPLICATION FOR EMPLOYMENT
                  </td>
                </tr>

                {/* 2. CORE DETAILS & PHOTO IN SINGLE TABLE BODY */}
                <tr>
                  {/* LEFT PHOTO COLUMN (rowspan spanning all 22 right-side rows!) */}
                  <td rowSpan={22} className="border-r border-[#0a5c4e] p-2 bg-slate-50 w-[270px] align-top text-center">
                    <div className="flex flex-col gap-2 items-center">
                      {/* Face Photo */}
                      <div className={`border-2 ${borderTeal} w-[210px] h-[250px] p-0.5 bg-white relative flex items-center justify-center`}>
                        {facePhoto ? (
                          <img src={facePhoto} className="w-full h-full object-cover" alt="Candidate Face" />
                        ) : (
                          <div className="text-gray-400 text-xs text-center font-bold">Face Photo</div>
                        )}
                      </div>
                      
                      {/* Spacer to push Contact Us Card to bottom */}
                      <div className="h-[210px]"></div>

                      {/* Contact Us Card */}
                      <div className={`w-[220px] ${bgTeal} text-white p-2.5 rounded-sm border border-white shadow-sm flex flex-col gap-2 text-left`}>
                        <div className="text-center font-bold text-[11px] border-b border-white/30 pb-1 flex flex-col leading-tight">
                          <span>CONTACT US</span>
                          <span dir="rtl" className="text-[10px] font-medium font-serif">تواصل معنا</span>
                        </div>
                        <div className="flex flex-col gap-1.5 text-[10px] font-bold">
                          <div className="flex items-center gap-1.5">
                            <span>📧</span>
                            <span className="truncate">Alrooaya@gmail.com</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span>📞</span>
                            <span>0550022505</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span>📞</span>
                            <span>0570060006</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* RIGHT DATA COLUMNS (each right row has 6 cells of equal width, colspanned as needed) */}
                  {/* Row 1: Full Name */}
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1.5 font-extrabold text-[10.5px] text-black bg-[#e8f5e9] w-[20%]">FULL NAME</td>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1.5 text-center font-extrabold text-[13px] text-black uppercase w-[60%]">{fullName}</td>
                  <td colSpan={2} className="border-b border-[#0a5c4e] px-2 py-1.5 text-right font-extrabold text-[11px] text-black font-serif bg-[#e8f5e9] w-[20%]" dir="rtl">الإسم الكامل</td>
                </tr>

                {/* Row 2: Monthly Salary & Contract Period */}
                <tr>
                  <td className="border-b border-r border-[#0a5c4e] px-2 py-1.5 font-bold text-black bg-slate-50 w-[15%]">Monthly Salary</td>
                  <td className="border-b border-r border-[#0a5c4e] px-2 py-1.5 text-center font-extrabold text-black bg-[#e8f5e9] w-[15%]">
                    {candidate.salary || candidate.personalInfo?.salary || '1000SAR'}
                  </td>
                  <td className="border-b border-r border-[#0a5c4e] px-2 py-1.5 text-right font-bold text-black bg-slate-50 font-serif w-[15%]" dir="rtl">الراتب الشهري</td>
                  <td className="border-b border-r border-[#0a5c4e] px-2 py-1.5 font-bold text-black bg-slate-50 w-[18%]">Contract Period</td>
                  <td className="border-b border-r border-[#0a5c4e] px-2 py-1.5 text-center font-bold text-black w-[15%]">2 YEARS</td>
                  <td className="border-b border-[#0a5c4e] px-2 py-1.5 text-right font-bold text-black bg-slate-50 font-serif w-[22%]" dir="rtl">مدة العقد</td>
                </tr>

                {/* Row 3: LANGUAGES & EDUCATION Header */}
                <tr className="bg-[#0a5c4e] text-white font-bold text-[11px] h-[24px]">
                  <td colSpan={6} className="px-2 border-b border-[#0a5c4e]">
                    <div className="flex justify-between items-center">
                      <span>LANGUAGES & EDUCATION</span>
                      <span dir="rtl" className="font-serif">اللغة والتعليم</span>
                    </div>
                  </td>
                </tr>

                {/* Row 4: English */}
                <tr>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 font-bold text-black bg-slate-50">English</td>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 text-center font-bold text-black">{hasLang('ENGLISH')}</td>
                  <td colSpan={2} className="border-b border-[#0a5c4e] px-2 py-1 text-right font-bold text-black bg-slate-50 font-serif" dir="rtl">الإنجليزية</td>
                </tr>

                {/* Row 5: Arabic */}
                <tr>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 font-bold text-black bg-slate-50">Arabic</td>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 text-center font-bold text-black">{hasLang('ARABIC')}</td>
                  <td colSpan={2} className="border-b border-[#0a5c4e] px-2 py-1 text-right font-bold text-black bg-slate-50 font-serif" dir="rtl">العربية</td>
                </tr>

                {/* Row 6: Education (Course) */}
                <tr>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 font-bold text-black bg-slate-50">Education (Course)</td>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 text-center font-bold text-black uppercase">{candidate.personalInfo?.educationLevel || 'SECONDARY'}</td>
                  <td colSpan={2} className="border-b border-[#0a5c4e] px-2 py-1 text-right font-bold text-black bg-slate-50 font-serif" dir="rtl">المستوى التعليمي</td>
                </tr>

                {/* Row 7: Passport Number */}
                <tr>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 font-bold text-black bg-slate-50">Passport Number</td>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 text-center font-extrabold text-[#d32f2f] uppercase">{candidate.passportData?.passportNumber}</td>
                  <td colSpan={2} className="border-b border-[#0a5c4e] px-2 py-1 text-right font-bold text-black bg-slate-50 font-serif" dir="rtl">رقم الجواز</td>
                </tr>

                {/* Row 8: Previous Employment */}
                <tr>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 font-bold text-black bg-slate-50">Previous Employment</td>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 text-center font-bold text-black uppercase">{expCountry !== '-' ? `${expCountry} (${expPeriod})` : 'NONE'}</td>
                  <td colSpan={2} className="border-b border-[#0a5c4e] px-2 py-1 text-right font-bold text-black bg-slate-50 font-serif" dir="rtl">خبرة خارج البلاد</td>
                </tr>

                {/* Row 9: PERSONAL DATA Header */}
                <tr className="bg-[#0a5c4e] text-white font-bold text-[11px] h-[24px]">
                  <td colSpan={6} className="px-2 border-b border-[#0a5c4e]">
                    <div className="flex justify-between items-center">
                      <span>PERSONAL DATA</span>
                      <span dir="rtl" className="font-serif">معلومات</span>
                    </div>
                  </td>
                </tr>

                {/* Row 10: Nationality */}
                <tr>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 font-bold text-black bg-slate-50">Nationality</td>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 text-center font-bold text-black uppercase">{candidate.passportData?.nationality || 'ETHIOPIAN'}</td>
                  <td colSpan={2} className="border-b border-[#0a5c4e] px-2 py-1 text-right font-bold text-black bg-slate-50 font-serif" dir="rtl">الجنسية</td>
                </tr>

                {/* Row 11: Religion */}
                <tr>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 font-bold text-black bg-slate-50">Religion</td>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 text-center font-bold text-black uppercase">{candidate.personalInfo?.religion || 'MUSLIM'}</td>
                  <td colSpan={2} className="border-b border-[#0a5c4e] px-2 py-1 text-right font-bold text-black bg-slate-50 font-serif" dir="rtl">الديانة</td>
                </tr>

                {/* Row 12: Marital Status */}
                <tr>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 font-bold text-black bg-slate-50">Marital Status</td>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 text-center font-bold text-black uppercase">{candidate.personalInfo?.maritalStatus || 'SINGLE'}</td>
                  <td colSpan={2} className="border-b border-[#0a5c4e] px-2 py-1 text-right font-bold text-black bg-slate-50 font-serif" dir="rtl">الحالة الاجتماعية</td>
                </tr>

                {/* Row 13: No. of Children */}
                <tr>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 font-bold text-black bg-slate-50">No. of Children</td>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 text-center font-bold text-black">{candidate.personalInfo?.numberOfChildren || 0}</td>
                  <td colSpan={2} className="border-b border-[#0a5c4e] px-2 py-1 text-right font-bold text-black bg-slate-50 font-serif" dir="rtl">عدد الأطفال</td>
                </tr>

                {/* Row 14: Age */}
                <tr>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 font-bold text-black bg-slate-50">Age</td>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 text-center font-bold text-black">{age}</td>
                  <td colSpan={2} className="border-b border-[#0a5c4e] px-2 py-1 text-right font-bold text-black bg-slate-50 font-serif" dir="rtl">العمر</td>
                </tr>

                {/* Row 15: Weight */}
                <tr>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 font-bold text-black bg-slate-50">Weight</td>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 text-center font-bold text-black">{candidate.personalInfo?.weight ? `${candidate.personalInfo.weight} KG` : '-'}</td>
                  <td colSpan={2} className="border-b border-[#0a5c4e] px-2 py-1 text-right font-bold text-black bg-slate-50 font-serif" dir="rtl">الوزن</td>
                </tr>

                {/* Row 16: Height */}
                <tr>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 font-bold text-black bg-slate-50">Height</td>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 text-center font-bold text-black">{candidate.personalInfo?.height ? `${candidate.personalInfo.height} CM` : '-'}</td>
                  <td colSpan={2} className="border-b border-[#0a5c4e] px-2 py-1 text-right font-bold text-black bg-slate-50 font-serif" dir="rtl">الطول</td>
                </tr>

                {/* Row 17: Place of Birth */}
                <tr>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 font-bold text-black bg-slate-50">Place of Birth</td>
                  <td colSpan={2} className="border-b border-r border-[#0a5c4e] px-2 py-1 text-center font-extrabold text-black uppercase">{candidate.passportData?.placeOfBirth || candidate.personalInfo?.city || '-'}</td>
                  <td colSpan={2} className="border-b border-[#0a5c4e] px-2 py-1 text-right font-bold text-black bg-slate-50 font-serif" dir="rtl">مكان الميلاد</td>
                </tr>

                {/* Row 18: SKILLS & EXPERIENCES Header */}
                <tr className="bg-[#0a5c4e] text-white font-bold text-[11px] h-[24px]">
                  <td colSpan={6} className="px-2 border-b border-[#0a5c4e]">
                    <div className="flex justify-between items-center">
                      <span>SKILLS & EXPERIENCES</span>
                      <span dir="rtl" className="font-serif">خبرة العمل</span>
                    </div>
                  </td>
                </tr>

                {/* Row 19: Total Experience highlight row */}
                <tr className="h-[22px] bg-[#fcf9f0]">
                  <td colSpan={6} className="text-center font-extrabold text-[11px] text-[#a68a3c] border-b border-[#0a5c4e]">
                    {totalYears > 0 ? `${totalYears} YEARS TOTAL EXPERIENCE` : '0 YEAR EXPERIENCE'}
                  </td>
                </tr>

                {/* Skills Grid Rows */}
                {/* Row 20: Children Care & Washing */}
                <tr>
                  <td className="border-b border-r border-[#0a5c4e] px-1.5 py-1 font-bold text-black text-[9.5px] w-[18%]">Children Care</td>
                  <td className={`border-b border-r border-[#0a5c4e] px-1 py-1 text-center font-extrabold text-[9.5px] w-[10%] ${hasSkill('CHILDREN_CARE') === 'YES' || hasSkill('BABY_SITTING') === 'YES' ? 'text-emerald-800 bg-[#e8f5e9]' : 'text-red-700 bg-red-50'}`}>{hasSkill('CHILDREN_CARE') === 'YES' || hasSkill('BABY_SITTING') === 'YES' ? 'YES' : 'NO'}</td>
                  <td className="border-b border-r border-[#0a5c4e] px-1.5 py-1 text-right font-bold text-black text-[9.5px] font-serif w-[22%]" dir="rtl">عناية الأطفال</td>
                  
                  <td className="border-b border-r border-[#0a5c4e] px-1.5 py-1 font-bold text-black text-[9.5px] w-[18%]">Washing</td>
                  <td className={`border-b border-r border-[#0a5c4e] px-1 py-1 text-center font-extrabold text-[9.5px] w-[10%] ${hasSkill('WASHING') === 'YES' ? 'text-emerald-800 bg-[#e8f5e9]' : 'text-red-700 bg-red-50'}`}>{hasSkill('WASHING')}</td>
                  <td className="border-b border-[#0a5c4e] px-1.5 py-1 text-right font-bold text-black text-[9.5px] font-serif w-[22%]" dir="rtl">الغسيل</td>
                </tr>

                {/* Row 21: Tutoring & Ironing */}
                <tr>
                  <td className="border-b border-r border-[#0a5c4e] px-1.5 py-1 font-bold text-black text-[9.5px]">Tutoring</td>
                  <td className={`border-b border-r border-[#0a5c4e] px-1 py-1 text-center font-bold text-[9.5px] ${hasSkill('TUTORING') === 'YES' ? 'text-emerald-800 bg-[#e8f5e9]' : 'text-red-700 bg-red-50'}`}>{hasSkill('TUTORING')}</td>
                  <td className="border-b border-r border-[#0a5c4e] px-1.5 py-1 text-right font-bold text-black text-[9.5px] font-serif" dir="rtl">تعليم الأطفال</td>
                  
                  <td className="border-b border-r border-[#0a5c4e] px-1.5 py-1 font-bold text-black text-[9.5px]">Ironing</td>
                  <td className={`border-b border-r border-[#0a5c4e] px-1 py-1 text-center font-bold text-[9.5px] ${hasSkill('IRONING') === 'YES' ? 'text-emerald-800 bg-[#e8f5e9]' : 'text-red-700 bg-red-50'}`}>{hasSkill('IRONING')}</td>
                  <td className="border-b border-[#0a5c4e] px-1.5 py-1 text-right font-bold text-black text-[9.5px] font-serif" dir="rtl">الكوي</td>
                </tr>

                {/* Row 22: Disabled Care & Cooking */}
                <tr>
                  <td className="border-b border-r border-[#0a5c4e] px-1.5 py-1 font-bold text-black text-[9.5px]">Disabled Care</td>
                  <td className={`border-b border-r border-[#0a5c4e] px-1 py-1 text-center font-bold text-[9.5px] ${hasSkill('DISABLED_CARE') === 'YES' || hasSkill('CAREGIVER') === 'YES' ? 'text-emerald-800 bg-[#e8f5e9]' : 'text-red-700 bg-red-50'}`}>{hasSkill('DISABLED_CARE') === 'YES' || hasSkill('CAREGIVER') === 'YES' ? 'YES' : 'NO'}</td>
                  <td className="border-b border-r border-[#0a5c4e] px-1.5 py-1 text-right font-bold text-black text-[9.5px] font-serif" dir="rtl">عناية العجزة</td>
                  
                  <td className="border-b border-r border-[#0a5c4e] px-1.5 py-1 font-bold text-black text-[9.5px]">Cooking</td>
                  <td className={`border-b border-r border-[#0a5c4e] px-1 py-1 text-center font-extrabold text-[9.5px] ${hasSkill('COOKING') === 'YES' ? 'text-emerald-800 bg-[#e8f5e9]' : 'text-red-700 bg-red-50'}`}>{hasSkill('COOKING')}</td>
                  <td className="border-b border-[#0a5c4e] px-1.5 py-1 text-right font-bold text-black text-[9.5px] font-serif" dir="rtl">الطبخ</td>
                </tr>

                {/* Row 23: Cleaning & Baby Sitting */}
                <tr>
                  <td className="border-b border-r border-[#0a5c4e] px-1.5 py-1 font-bold text-black text-[9.5px]">Cleaning</td>
                  <td className={`border-b border-r border-[#0a5c4e] px-1 py-1 text-center font-extrabold text-[9.5px] ${hasSkill('CLEANING') === 'YES' ? 'text-emerald-800 bg-[#e8f5e9]' : 'text-red-700 bg-red-50'}`}>{hasSkill('CLEANING')}</td>
                  <td className="border-b border-r border-[#0a5c4e] px-1.5 py-1 text-right font-bold text-black text-[9.5px] font-serif" dir="rtl">التنظيف</td>
                  
                  <td className="border-b border-r border-[#0a5c4e] px-1.5 py-1 font-bold text-black text-[9.5px]">Baby Sitting</td>
                  <td className={`border-b border-r border-[#0a5c4e] px-1 py-1 text-center font-extrabold text-[9.5px] ${hasSkill('BABY_SITTING') === 'YES' ? 'text-emerald-800 bg-[#e8f5e9]' : 'text-red-700 bg-red-50'}`}>{hasSkill('BABY_SITTING')}</td>
                  <td className="border-b border-[#0a5c4e] px-1.5 py-1 text-right font-bold text-black text-[9.5px] font-serif" dir="rtl">عناية الرضع</td>
                </tr>
              </tbody>
            </table>
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
