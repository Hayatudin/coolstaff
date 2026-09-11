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

export default function KA7Template({ candidate, facePhoto, fullBodyPhoto }: CVTemplateProps) {
  return <KA7Layout candidate={candidate} facePhoto={facePhoto} fullBodyPhoto={fullBodyPhoto} headerImage="/KA-7.png" />;
}

export function KA7Layout({ candidate, facePhoto, fullBodyPhoto, headerImage }: CVTemplateProps & { headerImage: string }) {
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
  const hasSkill = (skill: string) => {
    const s = skill.toUpperCase();
    if (s === 'COOKING' || s === 'ARABIC COOKING') {
      return isExperienced ? 'YES' : 'NO';
    }
    if (s === 'IRONING') {
      return isExperienced ? (candidate.personalInfo?.skills?.includes(skill) ? 'YES' : 'NO') : 'NO';
    }
    if (s === 'CLEANING' || s === 'WASHING' || s === 'BABY' || s === 'BABY SITTING' || s === 'BABY_SITTING' || s === 'CHILDREN CARE' || s === 'CHILDREN_CARE' || s === 'DISABLED CARING') {
      return 'YES';
    }
    return candidate.personalInfo?.skills?.includes(skill) ? 'YES' : 'NO';
  };

  const hasLang = (lang: string) => candidate.personalInfo?.languages?.includes(lang);

  const fullName = `${candidate.passportData?.givenNames || ''} ${candidate.passportData?.surname || ''}`.trim();
  const age = calculateAge(candidate.passportData?.dateOfBirth);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    } catch { return dateString; }
  };

  const formatDateFull = (dateString: string | undefined) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      const day = d.getDate().toString().padStart(2, '0');
      const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
      return `${day} ${months[d.getMonth()]} ${d.getFullYear() % 100}`.toUpperCase();
    } catch { return dateString; }
  };

  let expCountry = '-';
  let expPeriod = '-';
  let expPosition = '-';
  if (resolvedExps.length > 0) {
    expCountry = resolvedExps.map(e => e.country).join(', ');
    expPeriod = resolvedExps.map(e => e.yearsOfExperience + ' YRS').join(', ');
    expPosition = resolvedExps.map(e => e.position || candidate.personalInfo?.job || 'HOUSE MAID').join(', ');
  }

  const bgLightBlue = 'bg-[#a3c2e6]'; // Slightly richer blue based on the image

  const renderCheckmark = () => (
    <div className="w-full h-full flex items-center justify-center">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00b0f0" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
  );

  return (
    <div className="w-full max-w-[210mm] mx-auto bg-white text-black font-serif shadow-lg print:shadow-none" dir="ltr">
      {/* PAGE 1 */}
      <div className="p-[8mm] min-h-[297mm] box-border relative flex flex-col">
        {/* Header */}
        <div className="w-full h-[100px] mb-2 shrink-0">
          <img src={headerImage} alt="Agency Header" className="w-full h-full object-contain object-center" />
        </div>

        {/* Main Content Border Wrapper */}
        <div className="w-full border-2 border-black flex flex-col text-[13px] leading-[1.25] font-serif">
          
          {/* Top Table */}
          <table className="w-full border-collapse border-b-2 border-black">
            <tbody>
              <tr>
                <td rowSpan={7} className="border border-black p-0 w-[24%] align-top h-[180px]">
                  {facePhoto ? (
                    <img src={facePhoto} className="w-full h-full object-cover" alt="Face" />
                  ) : (
                    <div className="w-full h-full bg-[#f3f4f6] flex items-center justify-center text-xs text-[#9ca3af] font-sans">Photo</div>
                  )}
                </td>
                <td className={`border border-black px-2 py-1 font-extrabold w-[25%] ${bgLightBlue} text-[12.5px]`}>Reference Number</td>
                <td className="border border-black px-2 py-1 w-[40%] font-black text-[13.5px]"></td>
                <td className={`border border-black px-2 py-1 text-right font-extrabold w-[11%] ${bgLightBlue}`}></td>
              </tr>
              <tr>
                <td className={`border border-black px-2 py-1 font-extrabold ${bgLightBlue} text-[12.5px]`}>Full Name</td>
                <td className="border border-black px-2 py-1 font-black uppercase text-[15px]">{fullName}</td>
                <td className={`border border-black px-2 py-1 text-right font-extrabold ${bgLightBlue} text-[12.5px]`} dir="rtl">الاسم</td>
              </tr>
              <tr>
                <td className={`border border-black px-2 py-1 font-extrabold ${bgLightBlue} text-[12.5px]`}>Religion</td>
                <td className="border border-black px-2 py-1 font-black uppercase text-[#dc2626] underline decoration-[#dc2626] decoration-wavy underline-offset-2 text-[13.5px]">{candidate.personalInfo?.religion}</td>
                <td className={`border border-black px-2 py-1 text-right font-extrabold ${bgLightBlue} text-[12.5px]`} dir="rtl">الديانة</td>
              </tr>
              <tr>
                <td className={`border border-black px-2 py-1 font-extrabold ${bgLightBlue} text-[12.5px]`}>Position Desired</td>
                <td className="border border-black px-2 py-1 font-black uppercase text-[14px]">{candidate.personalInfo?.job || 'HOUSEMAID'}</td>
                <td className={`border border-black px-2 py-1 text-right font-extrabold ${bgLightBlue} text-[12.5px]`} dir="rtl">الوظيفة</td>
              </tr>
              <tr>
                <td className={`border border-black px-2 py-1 font-extrabold ${bgLightBlue} text-[12.5px]`}>Salary</td>
                <td className="border border-black px-2 py-1 font-black uppercase text-[13.5px]">{candidate.salary || candidate.personalInfo?.salary || '1000SR'}</td>
                <td className={`border border-black px-2 py-1 text-right font-extrabold ${bgLightBlue} text-[12.5px]`} dir="rtl">الراتب</td>
              </tr>
              <tr>
                <td className={`border border-black px-2 py-1 font-extrabold ${bgLightBlue} text-[12.5px]`}>Age</td>
                <td className="border border-black px-2 py-1 font-black text-[13.5px]">{age}</td>
                <td className={`border border-black px-2 py-1 text-right font-extrabold ${bgLightBlue} text-[12.5px]`} dir="rtl">العمر</td>
              </tr>
              <tr>
                <td className={`border border-black px-2 py-1 font-extrabold ${bgLightBlue} text-[12.5px]`}>Sex</td>
                <td className="border border-black px-2 py-1 font-black uppercase text-[13.5px]">{candidate.passportData?.gender}</td>
                <td className={`border border-black px-2 py-1 text-right font-extrabold ${bgLightBlue} text-[12.5px]`} dir="rtl">الجنس</td>
              </tr>
            </tbody>
          </table>

          {/* Two Column Layout */}
          <div className="flex w-full flex-1">
            {/* Left Column */}
            <div className="w-[50%] border-r-2 border-black flex flex-col border-b border-b-transparent">
              {/* Personal Information */}
              <table className="w-full border-collapse mt-[-2px]">
                <thead>
                  <tr>
                    <th colSpan={3} className="border border-black px-2 py-1 bg-white font-black text-[13.5px]">
                      <div className="flex justify-between items-center w-full">
                        <span>Personal Information</span>
                        <span dir="rtl">معلومات شخصيه</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className={`border border-black px-2 py-1 font-extrabold w-[38%] ${bgLightBlue} text-[12.5px]`}>Nationality</td><td className="border border-black px-2 py-1 uppercase font-bold w-[42%] text-[12.5px]">{resolvedNationality}</td><td className={`border border-black px-2 py-1 text-right font-extrabold w-[20%] ${bgLightBlue} text-[12.5px]`} dir="rtl">الجنسية</td></tr>
                  <tr><td className={`border border-black px-2 py-1 font-extrabold ${bgLightBlue} text-[12.5px]`}>Date of Birth</td><td className="border border-black px-2 py-1 font-bold text-[12.5px]">{formatDateFull(candidate.passportData?.dateOfBirth)}</td><td className={`border border-black px-2 py-1 text-right font-extrabold ${bgLightBlue} text-[12.5px]`} dir="rtl">تاريخ الميلاد</td></tr>
                  <tr><td className={`border border-black px-2 py-1 font-extrabold ${bgLightBlue} text-[12.5px]`}>Address</td><td className="border border-black px-2 py-1 uppercase font-bold text-[12px] leading-tight">{candidate.personalInfo?.city || candidate.passportData?.placeOfBirth}</td><td className={`border border-black px-2 py-1 text-right font-extrabold ${bgLightBlue} text-[12.5px]`} dir="rtl">العنوان</td></tr>
                  <tr><td className={`border border-black px-2 py-1 font-extrabold ${bgLightBlue} text-[12.5px]`}>Marital Status</td><td className="border border-black px-2 py-1 uppercase font-bold text-[12.5px]">{candidate.personalInfo?.maritalStatus}</td><td className={`border border-black px-2 py-1 text-right font-extrabold ${bgLightBlue} text-[12.5px]`} dir="rtl">الحالة الاجتماعية</td></tr>
                  <tr><td className={`border border-black px-2 py-1 font-extrabold ${bgLightBlue} text-[12.5px]`}>No. of Children</td><td className="border border-black px-2 py-1 font-bold text-center text-[12.5px]">{candidate.personalInfo?.numberOfChildren || 0}</td><td className={`border border-black px-2 py-1 text-right font-extrabold ${bgLightBlue} text-[12.5px]`} dir="rtl">عدد الأطفال</td></tr>
                  <tr><td className={`border border-black px-2 py-1 font-extrabold ${bgLightBlue} text-[12.5px]`}>Height/Weight</td><td className="border border-black p-0 uppercase font-bold text-[12.5px]"><div className="flex w-full h-full"><div className="w-1/2 border-r border-black px-1 py-1 text-center">{candidate.personalInfo?.height ? `${candidate.personalInfo.height}CM` : ''}</div><div className="w-1/2 px-1 py-1 text-center">{candidate.personalInfo?.weight ? `${candidate.personalInfo.weight}KG` : ''}</div></div></td><td className={`border border-black px-2 py-1 text-right font-extrabold ${bgLightBlue} text-[12.5px]`} dir="rtl">الوزن والطول</td></tr>
                  <tr><td className={`border border-black px-2 py-1 font-extrabold ${bgLightBlue} text-[12.5px]`}>Education<br/>Qualifications</td><td className="border border-black px-2 py-1 uppercase font-bold text-[12px] leading-tight">{candidate.personalInfo?.educationLevel}</td><td className={`border border-black px-2 py-1 text-right font-extrabold ${bgLightBlue} text-[12.5px]`} dir="rtl">المستوى التعليمي</td></tr>
                  <tr><td className={`border border-black px-2 py-1 font-extrabold ${bgLightBlue} text-[12.5px]`}>Tel. Number</td><td className="border border-black px-2 py-1 font-bold text-[12.5px]">+{candidate.personalInfo?.phone?.replace(/\D/g, '') || ''}</td><td className={`border border-black px-2 py-1 text-right font-extrabold ${bgLightBlue} text-[12.5px]`} dir="rtl">رقم التواصل</td></tr>
                </tbody>
              </table>

              {/* Overseas Experience */}
              <table className="w-full border-collapse mt-[-1px]">
                <thead>
                  <tr>
                    <th colSpan={3} className="border border-black px-2 py-1 bg-white font-black text-[13.5px]">
                      <div className="flex justify-between items-center w-full">
                        <span>Overseas Experience</span>
                        <span dir="rtl">خبرات سابقه</span>
                      </div>
                    </th>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-0.5 font-extrabold ${bgLightBlue} w-[25%] text-[12px]`}>Country</td>
                    <td className={`border border-black px-2 py-0.5 font-extrabold ${bgLightBlue} w-[25%] text-[12px]`}>Period</td>
                    <td className={`border border-black px-2 py-0.5 font-extrabold ${bgLightBlue} w-[50%] text-[12px]`}>Position</td>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="border border-black px-2 py-1 font-bold text-center h-[24px] text-[12.5px]">{expCountry}</td><td className="border border-black px-2 py-1 font-bold text-center text-[12.5px]">{expPeriod}</td><td className="border border-black px-2 py-1 font-bold text-center text-[12.5px]">{expPosition}</td></tr>
                </tbody>
              </table>

              {/* Skills */}
              <table className="w-full border-collapse mt-[15px]">
                <thead>
                  <tr>
                    <th colSpan={6} className="border border-black px-2 py-1 bg-white font-black text-[13.5px]">
                      <div className="flex justify-between items-center w-full">
                        <span>Skills</span>
                        <span dir="rtl">المهارات</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`border border-black px-1 py-1 font-extrabold ${bgLightBlue} w-[18%] text-[11.5px]`}>Cooking</td>
                    <td className="border border-black p-0 text-center font-black w-[10%] text-sm">{hasSkill('COOKING') ? renderCheckmark() : 'NO'}</td>
                    <td className={`border border-black px-1 py-1 font-extrabold text-center ${bgLightBlue} w-[22%] text-[11.5px]`} dir="rtl">الطبخ</td>
                    <td className={`border border-black px-1 py-1 font-extrabold ${bgLightBlue} w-[20%] text-[11.5px]`}>Baby<br/>Sitting</td>
                    <td className="border border-black p-0 text-center font-black w-[10%] text-sm">{hasSkill('BABY') ? renderCheckmark() : 'NO'}</td>
                    <td className={`border border-black px-1 py-1 font-extrabold text-center ${bgLightBlue} w-[20%] text-[10.5px] leading-tight`} dir="rtl">التعامل مع الاطفال</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-1 py-1 font-extrabold ${bgLightBlue} text-[11.5px]`}>Washing</td>
                    <td className="border border-black p-0 text-center font-black text-sm">{hasSkill('WASHING') ? renderCheckmark() : 'NO'}</td>
                    <td className={`border border-black px-1 py-1 font-extrabold text-center ${bgLightBlue} text-[11.5px]`} dir="rtl">الغسيل</td>
                    <td className={`border border-black px-1 py-1 font-extrabold ${bgLightBlue} text-[11.5px]`}>Sewing</td>
                    <td className="border border-black p-0 text-center font-black text-sm">{hasSkill('SEWING') ? renderCheckmark() : 'NO'}</td>
                    <td className={`border border-black px-1 py-1 font-extrabold text-center ${bgLightBlue} text-[11.5px]`} dir="rtl">الخياطة</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-1 py-1 font-extrabold ${bgLightBlue} text-[11.5px]`}>Cleaning</td>
                    <td className="border border-black p-0 text-center font-black text-sm">{hasSkill('CLEANING') ? renderCheckmark() : 'NO'}</td>
                    <td className={`border border-black px-1 py-1 font-extrabold text-center ${bgLightBlue} text-[11.5px]`} dir="rtl">التنظيف</td>
                    <td className={`border border-black px-1 py-1 font-extrabold ${bgLightBlue} text-[11.5px]`}>Driving</td>
                    <td className="border border-black p-0 text-center font-black text-sm">{hasSkill('DRIVING') ? renderCheckmark() : 'NO'}</td>
                    <td className={`border border-black px-1 py-1 font-extrabold text-center ${bgLightBlue} text-[11.5px]`} dir="rtl">سائق</td>
                  </tr>
                </tbody>
              </table>

              {/* Languages */}
              <table className="w-full border-collapse mt-[15px]">
                <thead>
                  <tr>
                    <th colSpan={3} className="border border-black px-2 py-1 bg-white font-black text-[13.5px]">
                      <div className="flex justify-between items-center w-full">
                        <span>Languages</span>
                        <span dir="rtl">اللغات</span>
                      </div>
                    </th>
                  </tr>
                  <tr>
                    <td className="border border-black px-2 py-0.5 w-[33%] bg-[#eef3f8]"></td>
                    <td className={`border border-black px-2 py-0.5 font-extrabold text-center ${bgLightBlue} w-[33%] leading-tight text-[12px]`}>English<br/><span dir="rtl">الانجليزية</span></td>
                    <td className={`border border-black px-2 py-0.5 font-extrabold text-center ${bgLightBlue} w-[34%] leading-tight text-[12px]`}>Arabic<br/><span dir="rtl">العربية</span></td>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-extrabold ${bgLightBlue} text-[12px]`}>Good</td>
                    <td className="border border-black px-2 py-1 font-bold text-center text-[12px]">{hasLang('ENGLISH') ? 'YES' : 'NO'}</td>
                    <td className="border border-black px-2 py-1 font-bold text-center text-[12px]">{hasLang('ARABIC') ? 'YES' : 'NO'}</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-extrabold ${bgLightBlue} text-[12px]`}>Fluent</td>
                    <td className="border border-black px-2 py-1 font-bold text-center text-[12px]">NO</td>
                    <td className="border border-black px-2 py-1 font-bold text-center text-[12px]">NO</td>
                  </tr>
                </tbody>
              </table>
              <div className="flex-1 border-r border-transparent"></div>
            </div>

            {/* Right Column */}
            <div className="w-[50%] flex flex-col border-b border-b-transparent">
              {/* Passport Information */}
              <table className="w-full border-collapse mt-[-2px]">
                <thead>
                  <tr>
                    <th colSpan={3} className="border border-black px-2 py-1 bg-white font-black text-[13.5px]">
                      <div className="flex justify-between items-center w-full">
                        <span>Passport Information</span>
                        <span dir="rtl">معلومات الجواز</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-extrabold w-[30%] ${bgLightBlue} text-[12px]`}>Number</td>
                    <td className="border border-black px-2 py-1 font-black uppercase w-[50%] font-roboto text-[21px] tracking-wider text-[#dc2626]" style={{ fontFamily: "'Roboto', sans-serif", fontWeight: '900', fontSize: '21px' }}>{candidate.passportData?.passportNumber}</td>
                    <td className={`border border-black px-2 py-1 text-right font-extrabold w-[20%] ${bgLightBlue}`} dir="rtl"></td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-extrabold ${bgLightBlue} text-[12px]`}>Issue Date</td>
                    <td className="border border-black px-2 py-1 font-bold text-[12.5px]">{formatDateFull(candidate.passportData?.dateOfIssue)}</td>
                    <td className={`border border-black px-2 py-1 text-right font-extrabold ${bgLightBlue} text-[12px]`} dir="rtl">الإصدار</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-extrabold ${bgLightBlue} text-[12px]`}>Expiry Date</td>
                    <td className="border border-black px-2 py-1 font-bold text-[12.5px]">{formatDateFull(candidate.passportData?.dateOfExpiry)}</td>
                    <td className={`border border-black px-2 py-1 text-right font-extrabold ${bgLightBlue} text-[12px]`} dir="rtl">الانتهاء</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-extrabold ${bgLightBlue} text-[12px]`}>Issue place</td>
                    <td className="border border-black px-2 py-1 font-bold uppercase text-[12.5px]">{candidate.passportData?.issuingCountry}</td>
                    <td className={`border border-black px-2 py-1 text-right font-extrabold ${bgLightBlue} text-[12px]`} dir="rtl">الاصدار</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-extrabold ${bgLightBlue} text-[11.5px] leading-tight`}>Next of Kin<br/>name</td>
                    <td className="border border-black px-2 py-1 font-bold uppercase text-[12px] leading-tight">{candidate.personalInfo?.emergencyContactName || ''}</td>
                    <td className={`border border-black px-2 py-1 text-right font-extrabold ${bgLightBlue} text-[12px]`} dir="rtl">خص</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-extrabold ${bgLightBlue} text-[11.5px] leading-tight`}>Next of Kin<br/>number</td>
                    <td className="border border-black px-2 py-1 font-bold text-[12.5px]">{candidate.personalInfo?.emergencyContactPhone || ''}</td>
                    <td className={`border border-black px-2 py-1 text-right font-extrabold ${bgLightBlue} text-[12px]`} dir="rtl">رتب</td>
                  </tr>
                </tbody>
              </table>

              {/* Full Body Photo container fills the rest */}
              <div className="flex-1 w-full border-l-0 border-r-0 border-b-0 p-1 flex items-center justify-center bg-white min-h-0 relative">
                {fullBodyPhoto ? (
                  <img src={fullBodyPhoto} className="absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)] object-contain object-top" alt="Full Body" />
                ) : (
                  <div className="text-xs text-[#9ca3af] font-sans">Full Body Photo</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Remarks Box */}
        <div className={`w-full mt-1 px-2 py-1 border-2 border-black ${bgLightBlue} text-[11px] font-black uppercase text-center`}>
          Remarks: SHE IS HARDWORKING, NEAT, ORGANISED, SMART, DISCIPLINED, CARING, HAS A GOOD ATTITUDE, SPEAKS GOOD ENGLISH AND LOVES TAKING CARE OF CHILDREN.
        </div>

        {candidate.videoUrl && (
          <div className="mt-4">
            <CVVideoFooter videoUrl={candidate.videoUrl} />
          </div>
        )}

      </div>
    </div>
  );
}
