import React from 'react';
import { getFileUrl } from '@/lib/utils';
import { Candidate } from '@/types';
import MATemplate from './MATemplate';
import CVVideoFooter from '../CVVideoFooter';

// KU2 uses the exact same layout as ALM/MA, just with /KU2.png header
// We import the shared ALMLayoutWithHeader from MATemplate pattern

interface CVTemplateProps {
  candidate: Candidate;
  facePhoto: string | null;
  fullBodyPhoto: string | null;
}

export default function KU2Template({ candidate, facePhoto, fullBodyPhoto }: CVTemplateProps) {
  // Reuse the same ALM-style layout but with KU2 header
  return <KU2Layout candidate={candidate} facePhoto={facePhoto} fullBodyPhoto={fullBodyPhoto} />;
}

function KU2Layout({ candidate, facePhoto, fullBodyPhoto }: CVTemplateProps) {
  const calculateAge = (dob: string | undefined) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };
  const hasLang = (lang: string) => candidate.personalInfo?.languages?.includes(lang) ? 'YES' : 'NO';
  const hasSkill = (skill: string) => candidate.personalInfo?.skills?.includes(skill) ? 'YES' : 'NO';
  const fullName = `${candidate.passportData?.givenNames || ''} ${candidate.passportData?.surname || ''}`.trim();
  const age = calculateAge(candidate.passportData?.dateOfBirth);
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    try { const d = new Date(dateString); return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`; } catch { return dateString; }
  };
  let expPeriod = '0 YEAR'; let expCountry = '';
  if (candidate.personalInfo?.workExperience && candidate.personalInfo.workExperience.length > 0) {
    const exps = candidate.personalInfo.workExperience.filter(e => e.experienceStatus === 'Have experience');
    if (exps.length > 0) { expPeriod = exps.map(e => e.yearsOfExperience + ' YRS').join(' + '); expCountry = exps.map(e => e.country).join(', '); }
  }

  return (
    <div className="w-full max-w-[210mm] mx-auto bg-white text-black font-sans shadow-lg print:shadow-none" dir="ltr">
      <div className="p-[10mm] min-h-[297mm] box-border relative page-break-after-always">
        <div className="w-full h-[120px] mb-4 border border-gray-200">
          <img src="/KU2.png" alt="KU2 Agency Header" className="w-full h-full object-contain object-center" />
        </div>
        <div className="flex gap-2 mb-2">
          <div className="w-[160px] shrink-0"><div className="border-[1.5px] border-black h-[190px] w-full p-1 bg-white">{facePhoto ? <img src={facePhoto} className="w-full h-full object-cover border border-gray-200" alt="Face" /> : <div className="w-full h-full bg-[#f3f4f6] flex items-center justify-center text-xs text-[#9ca3af]">Face Photo</div>}</div></div>
          <div className="flex-1">
            <table className="w-full border-collapse border-[1.5px] border-black text-[13px] leading-tight">
              <thead><tr><th colSpan={3} className="border-[1.5px] border-black text-center text-[#0066cc] font-bold text-[18px] py-1.5 uppercase">APPLICATION FOR EMPLOYMENT</th></tr></thead>
              <tbody>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold w-[25%]">Full Name</td><td className="border-[1.5px] border-black px-2 py-1.5 font-bold text-center w-[50%] uppercase">{fullName}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold w-[25%]" dir="rtl">الاسم الكامل</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Telephone</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center font-medium">{candidate.personalInfo?.phone}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">رقم هاتف</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Position</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center uppercase font-bold">{candidate.personalInfo?.job || 'HOUSE MAID'}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">موضع</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Age</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center font-medium">{age}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">عمر</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Date of Expiry</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center font-medium">{formatDate(candidate.passportData?.dateOfExpiry)}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">تاريخ الانتهاء</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex gap-2 items-stretch">
          <div className="w-[270px] shrink-0 flex flex-col"><div className="border-[1.5px] border-black p-0 bg-white flex-1 relative min-h-0 overflow-hidden">{fullBodyPhoto ? <img src={fullBodyPhoto} className="w-full h-full object-cover" alt="Full Body" /> : <div className="w-full h-full bg-[#f3f4f6] flex items-center justify-center text-xs text-[#9ca3af]">Full Body Photo</div>}</div></div>
          <div className="flex-1 flex flex-col gap-0">
            <table className="w-full border-collapse border-[1.5px] border-black text-[13px] leading-tight mb-[-1.5px]">
              <thead><tr className="bg-[#b0c4de]"><th colSpan={3} className="border-[1.5px] border-black text-center font-bold py-1.5">Details of Applicant <span dir="rtl" className="ml-2 font-bold">بيانات مقدم الطلب</span></th></tr></thead>
              <tbody>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold w-[30%]">Nationality</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center w-[45%] uppercase">{candidate.passportData?.nationality}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold w-[25%]" dir="rtl">الجنسيه</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Passport No.</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center font-bold">{candidate.passportData?.passportNumber}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">رقم جواز السفر</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Religion</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center uppercase">{candidate.personalInfo?.religion}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">الديانة</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Date of Birth</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center">{formatDate(candidate.passportData?.dateOfBirth)}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">تاريخ الولادة</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Place of Birth</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center uppercase">{candidate.passportData?.placeOfBirth}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">مكان الولادة</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Complete Address</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center uppercase text-[11px]">{candidate.personalInfo?.address}, {candidate.personalInfo?.city}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">العنوان الكامل</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Marital Status</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center uppercase">{candidate.personalInfo?.maritalStatus}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">الحاله الزوجية</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">No. of Children</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center">{candidate.personalInfo?.numberOfChildren}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">عدد الاطفال</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Height</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center">{candidate.personalInfo?.height ? `${candidate.personalInfo.height} CM` : ''}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">ارتفاع</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Weight</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center">{candidate.personalInfo?.weight ? `${candidate.personalInfo.weight} KG` : ''}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">وزن</td></tr>
              </tbody>
            </table>
            <table className="w-full border-collapse border-[1.5px] border-black text-[13px] leading-tight mb-[-1.5px]">
              <thead><tr className="bg-[#b0c4de]"><th colSpan={3} className="border-[1.5px] border-black text-center font-bold py-1.5">Languages & Education <span dir="rtl" className="ml-2 font-bold">اللغة والتعليم</span></th></tr></thead>
              <tbody>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold w-[30%]">English</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center w-[45%]">{hasLang('ENGLISH')}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold w-[25%]" dir="rtl">الإنجليزيه</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Arabic</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center">{hasLang('ARABIC')}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">العربيه</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Education</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center uppercase text-[11px]">{candidate.personalInfo?.educationLevel}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">المستوي</td></tr>
              </tbody>
            </table>
            <table className="w-full border-collapse border-[1.5px] border-black text-[13px] leading-tight">
              <thead><tr className="bg-[#b0c4de]"><th colSpan={3} className="border-[1.5px] border-black text-center font-bold py-1.5">Previous Employment Abroad <span dir="rtl" className="ml-2 font-bold">خبره خارج البلاد</span></th></tr></thead>
              <tbody>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold w-[30%]">Period</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center w-[45%] uppercase">{expPeriod}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold w-[25%]" dir="rtl">المده</td></tr>
                <tr><td className="border-[1.5px] border-black px-2 py-1.5 text-[#0066cc] font-bold">Country</td><td className="border-[1.5px] border-black px-2 py-1.5 text-center uppercase">{expCountry}</td><td className="border-[1.5px] border-black px-2 py-1.5 text-right font-bold" dir="rtl">البلد</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <table className="w-full border-collapse border-[1.5px] border-black text-[12px] mt-2">
          <thead><tr className="bg-[#b0c4de]"><th colSpan={6} className="border-[1.5px] border-black text-center font-bold py-1">Skills & Experience <span dir="rtl" className="ml-2 font-bold">خبرة العمل</span></th></tr></thead>
          <tbody>
            <tr><td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-bold">Ironing</td><td className="border-[1.5px] border-black px-1.5 py-1 text-center">{hasSkill('IRONING')}</td><td className="border-[1.5px] border-black px-1.5 py-1 text-right font-bold" dir="rtl">الكوي</td><td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-bold">Baby Sitting</td><td className="border-[1.5px] border-black px-1.5 py-1 text-center">{hasSkill('BABY SITTING')}</td><td className="border-[1.5px] border-black px-1.5 py-1 text-right font-bold" dir="rtl">عناية الرضيع</td></tr>
            <tr><td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-bold">Cooking</td><td className="border-[1.5px] border-black px-1.5 py-1 text-center">{hasSkill('COOKING')}</td><td className="border-[1.5px] border-black px-1.5 py-1 text-right font-bold" dir="rtl">الطبخ</td><td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-bold">Children Care</td><td className="border-[1.5px] border-black px-1.5 py-1 text-center">{hasSkill('CHILDREN CARE')}</td><td className="border-[1.5px] border-black px-1.5 py-1 text-right font-bold" dir="rtl">عناية الاطفال</td></tr>
            <tr><td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-bold">Sewing</td><td className="border-[1.5px] border-black px-1.5 py-1 text-center">{hasSkill('SEWING')}</td><td className="border-[1.5px] border-black px-1.5 py-1 text-right font-bold" dir="rtl">خياطة</td><td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-bold">Cleaning</td><td className="border-[1.5px] border-black px-1.5 py-1 text-center">{hasSkill('CLEANING')}</td><td className="border-[1.5px] border-black px-1.5 py-1 text-right font-bold" dir="rtl">التنظيف</td></tr>
            <tr><td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-bold">Computer</td><td className="border-[1.5px] border-black px-1.5 py-1 text-center">{hasSkill('COMPUTER')}</td><td className="border-[1.5px] border-black px-1.5 py-1 text-right font-bold" dir="rtl">الكمبيوتر</td><td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-bold">Washing</td><td className="border-[1.5px] border-black px-1.5 py-1 text-center">{hasSkill('WASHING')}</td><td className="border-[1.5px] border-black px-1.5 py-1 text-right font-bold" dir="rtl">الغسيل</td></tr>
            <tr><td className="border-[1.5px] border-black px-1.5 py-1 text-[#0066cc] font-bold">Remarks</td><td className="border-[1.5px] border-black px-1.5 py-1 text-center" colSpan={5}></td></tr>
          </tbody>
        </table>

      </div>
      {/* PAGE 2: Passport Scan */}
      <div className="w-[794px] h-[1123px] relative break-before-page bg-white flex flex-col" style={{ paddingTop: '30px', paddingRight: '50px', paddingBottom: '50px', paddingLeft: '30px' }}>
        <div>
          {candidate.passportImageUrl ? (
            <img src={getFileUrl(candidate.passportImageUrl)} alt="Passport" className="w-[680px] h-[490px] object-contain object-left-top" />
          ) : (
            <div className="text-gray-400 text-sm border border-dashed border-gray-200 w-[680px] h-[490px] flex items-center justify-center">Passport Image Not Available</div>
          )}
        </div>
        {candidate.videoUrl && (
          <div className="mt-auto w-full flex flex-col items-center gap-2 pb-[20px]">
            <p className="text-[12px] font-bold uppercase tracking-wider text-gray-500 font-sans">Scan to Watch Introduction Video</p>
            <div className="w-28 h-28 bg-white p-1 shadow-md border border-gray-100 rounded">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(candidate.videoUrl)}`} alt="Video QR" className="w-full h-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
