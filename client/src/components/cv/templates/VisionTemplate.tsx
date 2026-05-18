import React from 'react';
import { Candidate } from '@/types';
import CVVideoFooter from '../CVVideoFooter';

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

          {/* B. Employment Title Bar */}
          <div className={`w-full ${goldGradient} text-white font-extrabold text-[15px] py-1 text-center uppercase tracking-wider mb-2 shadow-sm border border-[#8a6f27]`}>
            APPLICATION FOR EMPLOYMENT
          </div>

          {/* C. Grid layout: Left Sidebar & Right details */}
          <div className="flex gap-2 items-stretch flex-grow">
            
            {/* 1. LEFT SIDEBAR */}
            <div className="w-[28%] flex flex-col justify-between border border-[#0a5c4e] p-1 bg-slate-50 shrink-0">
              
              {/* Photo Box */}
              <div className={`border-2 ${borderTeal} h-[210px] w-full p-1 bg-white relative flex items-center justify-center`}>
                {facePhoto ? (
                  <img src={facePhoto} className="w-full h-full object-cover" alt="Candidate Face" />
                ) : (
                  <div className="text-gray-400 text-xs text-center font-bold">Face Photo</div>
                )}
              </div>

              {/* Spacer */}
              <div className="flex-grow"></div>

              {/* Contact Us Card */}
              <div className={`w-full ${bgTeal} text-white p-2 rounded-sm border-2 border-white shadow-sm flex flex-col gap-2 mt-4`}>
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

            {/* 2. RIGHT MAIN TABLES */}
            <div className="flex-grow flex flex-col gap-2">
              
              {/* Full Name block */}
              <div className={`w-full border-[1.5px] ${borderTeal} flex items-center h-[38px] px-2 bg-[#e8f5e9] shrink-0`}>
                <span className={`font-extrabold text-[11px] ${textTeal} w-[22%]`}>FULL NAME</span>
                <span className="flex-grow text-center font-extrabold text-[13px] text-gray-900 uppercase truncate px-1">{fullName}</span>
                <span className={`font-extrabold text-[12px] ${textTeal} w-[22%] text-right font-serif`} dir="rtl">الإسم الكامل</span>
              </div>

              {/* Monthly Salary & Contract details */}
              <table className={`w-full border-collapse border-[1.5px] ${borderTeal} text-[11px] leading-tight shrink-0`}>
                <tbody>
                  <tr className="h-[24px]">
                    <td className={`border ${borderTeal} px-2 font-bold w-[30%] text-gray-700 bg-slate-50`}>Monthly Salary</td>
                    <td className="border ${borderTeal} px-2 text-center font-extrabold text-[12px] text-emerald-800 uppercase bg-[#e8f5e9]">
                      {candidate.salary || candidate.personalInfo?.salary || '1000SAR'}
                    </td>
                    <td className={`border ${borderTeal} px-2 text-right font-bold w-[30%] text-gray-700 bg-slate-50 font-serif`} dir="rtl">الراتب الشهري</td>
                  </tr>
                  <tr className="h-[24px]">
                    <td className={`border ${borderTeal} px-2 font-bold text-gray-700 bg-slate-50`}>Contract Period</td>
                    <td className="border ${borderTeal} px-2 text-center font-bold text-gray-800 uppercase">2 YEARS</td>
                    <td className={`border ${borderTeal} px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif`} dir="rtl">مدة العقد</td>
                  </tr>
                </tbody>
              </table>

              {/* Section 1: LANGUAGES & EDUCATION */}
              <div className="flex flex-col shrink-0">
                <div className={`w-full ${bgTeal} text-white font-bold text-[11px] py-0.5 px-2 flex justify-between items-center shadow-sm`}>
                  <span>LANGUAGES & EDUCATION</span>
                  <span dir="rtl" className="font-serif">اللغة والتعليم</span>
                </div>
                <table className={`w-full border-collapse border-[1.5px] ${borderTeal} text-[10px] leading-tight`}>
                  <tbody>
                    <tr className="h-[21px]">
                      <td className="border border-slate-300 px-2 font-bold w-[30%] text-gray-700 bg-slate-50">English</td>
                      <td className="border border-slate-300 px-2 text-center font-bold text-gray-800 w-[45%]">{hasLang('ENGLISH')}</td>
                      <td className="border border-slate-300 px-2 text-right font-bold w-[25%] text-gray-700 bg-slate-50 font-serif" dir="rtl">الإنجليزية</td>
                    </tr>
                    <tr className="h-[21px]">
                      <td className="border border-slate-300 px-2 font-bold text-gray-700 bg-slate-50">Arabic</td>
                      <td className="border border-slate-300 px-2 text-center font-bold text-gray-800">{hasLang('ARABIC')}</td>
                      <td className="border border-slate-300 px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">العربية</td>
                    </tr>
                    <tr className="h-[21px]">
                      <td className="border border-slate-300 px-2 font-bold text-gray-700 bg-slate-50">Education (Course)</td>
                      <td className="border border-slate-300 px-2 text-center font-bold text-gray-800 uppercase">{candidate.personalInfo?.educationLevel || 'SECONDARY'}</td>
                      <td className="border border-slate-300 px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">المستوى التعليمي</td>
                    </tr>
                    <tr className="h-[21px]">
                      <td className="border border-slate-300 px-2 font-bold text-gray-700 bg-slate-50">Passport Number</td>
                      <td className="border border-slate-300 px-2 text-center font-extrabold text-[#d32f2f] uppercase">{candidate.passportData?.passportNumber}</td>
                      <td className="border border-slate-300 px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">رقم الجواز</td>
                    </tr>
                    <tr className="h-[21px]">
                      <td className="border border-slate-300 px-2 font-bold text-gray-700 bg-slate-50">Previous Employment</td>
                      <td className="border border-slate-300 px-2 text-center font-bold text-gray-800 uppercase">{expCountry !== '-' ? `${expCountry} (${expPeriod})` : 'NONE'}</td>
                      <td className="border border-slate-300 px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">خبرة خارج البلاد</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Section 2: PERSONAL DATA */}
              <div className="flex flex-col shrink-0">
                <div className={`w-full ${bgTeal} text-white font-bold text-[11px] py-0.5 px-2 flex justify-between items-center shadow-sm`}>
                  <span>PERSONAL DATA</span>
                  <span dir="rtl" className="font-serif">معلومات</span>
                </div>
                <table className={`w-full border-collapse border-[1.5px] ${borderTeal} text-[10px] leading-tight`}>
                  <tbody>
                    <tr className="h-[21px]">
                      <td className="border border-slate-300 px-2 font-bold w-[30%] text-gray-700 bg-slate-50">Nationality</td>
                      <td className="border border-slate-300 px-2 text-center font-bold text-gray-800 w-[45%] uppercase">{candidate.passportData?.nationality || 'ETHIOPIAN'}</td>
                      <td className="border border-slate-300 px-2 text-right font-bold w-[25%] text-gray-700 bg-slate-50 font-serif" dir="rtl">الجنسية</td>
                    </tr>
                    <tr className="h-[21px]">
                      <td className="border border-slate-300 px-2 font-bold text-gray-700 bg-slate-50">Religion</td>
                      <td className="border border-slate-300 px-2 text-center font-bold text-gray-800 uppercase">{candidate.personalInfo?.religion || 'MUSLIM'}</td>
                      <td className="border border-slate-300 px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">الديانة</td>
                    </tr>
                    <tr className="h-[21px]">
                      <td className="border border-slate-300 px-2 font-bold text-gray-700 bg-slate-50">Marital Status</td>
                      <td className="border border-slate-300 px-2 text-center font-bold text-gray-800 uppercase">{candidate.personalInfo?.maritalStatus || 'SINGLE'}</td>
                      <td className="border border-slate-300 px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">الحالة الاجتماعية</td>
                    </tr>
                    <tr className="h-[21px]">
                      <td className="border border-slate-300 px-2 font-bold text-gray-700 bg-slate-50">No. of Children</td>
                      <td className="border border-slate-300 px-2 text-center font-bold text-gray-800">{candidate.personalInfo?.numberOfChildren || 0}</td>
                      <td className="border border-slate-300 px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">عدد الأطفال</td>
                    </tr>
                    <tr className="h-[21px]">
                      <td className="border border-slate-300 px-2 font-bold text-gray-700 bg-slate-50">Age</td>
                      <td className="border border-slate-300 px-2 text-center font-bold text-gray-800">{age}</td>
                      <td className="border border-slate-300 px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">العمر</td>
                    </tr>
                    <tr className="h-[21px]">
                      <td className="border border-slate-300 px-2 font-bold text-gray-700 bg-slate-50">Weight</td>
                      <td className="border border-slate-300 px-2 text-center font-bold text-gray-800">{candidate.personalInfo?.weight ? `${candidate.personalInfo.weight} KG` : '-'}</td>
                      <td className="border border-slate-300 px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">الوزن</td>
                    </tr>
                    <tr className="h-[21px]">
                      <td className="border border-slate-300 px-2 font-bold text-gray-700 bg-slate-50">Height</td>
                      <td className="border border-slate-300 px-2 text-center font-bold text-gray-800">{candidate.personalInfo?.height ? `${candidate.personalInfo.height} CM` : '-'}</td>
                      <td className="border border-slate-300 px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">الطول</td>
                    </tr>
                    <tr className="h-[21px]">
                      <td className="border border-slate-300 px-2 font-bold text-gray-700 bg-slate-50">Place of Birth</td>
                      <td className="border border-slate-300 px-2 text-center font-extrabold text-gray-800 uppercase">
                        {candidate.passportData?.placeOfBirth || candidate.personalInfo?.city || '-'}
                      </td>
                      <td className="border border-slate-300 px-2 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">مكان الميلاد</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Section 3: SKILLS & EXPERIENCES */}
              <div className="flex flex-col shrink-0">
                <div className={`w-full ${bgTeal} text-white font-bold text-[11px] py-0.5 px-2 flex justify-between items-center shadow-sm`}>
                  <span>SKILLS & EXPERIENCES</span>
                  <span dir="rtl" className="font-serif">خبرة العمل</span>
                </div>
                
                {/* Total Experience Highlight banner */}
                <div className="w-full text-center py-1 font-extrabold text-[12px] bg-amber-50 text-[#8a6f27] border-x-[1.5px] border-b border-[#0a5c4e]">
                  {totalYears > 0 ? `${totalYears} YEARS TOTAL EXPERIENCE` : '0 YEAR EXPERIENCE'}
                </div>

                <table className={`w-full border-collapse border-[1.5px] ${borderTeal} text-[10px] leading-[1.15]`}>
                  <tbody>
                    <tr className="h-[21px]">
                      <td className="border border-slate-300 px-1.5 py-0.5 font-bold w-[20%] text-gray-700 bg-slate-50">Children Care</td>
                      <td className="border border-slate-300 px-1.5 py-0.5 text-center font-extrabold w-[13%] text-emerald-800 bg-[#e8f5e9]">{hasSkill('CHILDREN_CARE') || hasSkill('BABY_SITTING')}</td>
                      <td className="border border-slate-300 px-1.5 py-0.5 text-right font-bold w-[17%] text-gray-700 bg-slate-50 font-serif" dir="rtl">عناية الأطفال</td>
                      <td className="border border-slate-300 px-1.5 py-0.5 font-bold w-[20%] text-gray-700 bg-slate-50">Washing</td>
                      <td className="border border-slate-300 px-1.5 py-0.5 text-center font-extrabold w-[13%] text-emerald-800 bg-[#e8f5e9]">{hasSkill('WASHING')}</td>
                      <td className="border border-slate-300 px-1.5 py-0.5 text-right font-bold w-[17%] text-gray-700 bg-slate-50 font-serif" dir="rtl">الغسيل</td>
                    </tr>
                    <tr className="h-[21px]">
                      <td className="border border-slate-300 px-1.5 py-0.5 font-bold text-gray-700 bg-slate-50">Tutoring</td>
                      <td className="border border-slate-300 px-1.5 py-0.5 text-center font-bold text-gray-800">{hasSkill('TUTORING')}</td>
                      <td className="border border-slate-300 px-1.5 py-0.5 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">تعليم الأطفال</td>
                      <td className="border border-slate-300 px-1.5 py-0.5 font-bold text-gray-700 bg-slate-50">Ironing</td>
                      <td className="border border-slate-300 px-1.5 py-0.5 text-center font-bold text-gray-800">{hasSkill('IRONING')}</td>
                      <td className="border border-slate-300 px-1.5 py-0.5 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">الكوي</td>
                    </tr>
                    <tr className="h-[21px]">
                      <td className="border border-slate-300 px-1.5 py-0.5 font-bold text-gray-700 bg-slate-50">Disabled Care</td>
                      <td className="border border-slate-300 px-1.5 py-0.5 text-center font-bold text-gray-800">{hasSkill('DISABLED_CARE') || hasSkill('CAREGIVER')}</td>
                      <td className="border border-slate-300 px-1.5 py-0.5 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">عناية العجزة</td>
                      <td className="border border-slate-300 px-1.5 py-0.5 font-bold text-gray-700 bg-slate-50">Cooking</td>
                      <td className="border border-slate-300 px-1.5 py-0.5 text-center font-extrabold text-emerald-800 bg-[#e8f5e9]">{hasSkill('COOKING')}</td>
                      <td className="border border-slate-300 px-1.5 py-0.5 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">الطبخ</td>
                    </tr>
                    <tr className="h-[21px]">
                      <td className="border border-slate-300 px-1.5 py-0.5 font-bold text-gray-700 bg-slate-50">Cleaning</td>
                      <td className="border border-slate-300 px-1.5 py-0.5 text-center font-extrabold text-emerald-800 bg-[#e8f5e9]">{hasSkill('CLEANING')}</td>
                      <td className="border border-slate-300 px-1.5 py-0.5 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">التنظيف</td>
                      <td className="border border-slate-300 px-1.5 py-0.5 font-bold text-gray-700 bg-slate-50">Baby Sitting</td>
                      <td className="border border-slate-300 px-1.5 py-0.5 text-center font-extrabold text-emerald-800 bg-[#e8f5e9]">{hasSkill('BABY_SITTING')}</td>
                      <td className="border border-slate-300 px-1.5 py-0.5 text-right font-bold text-gray-700 bg-slate-50 font-serif" dir="rtl">عناية الرضع</td>
                    </tr>
                  </tbody>
                </table>
              </div>

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
                  <img src={candidate.passportImageUrl} className="max-w-full max-h-[580px] object-contain" alt="Passport Scan" />
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
