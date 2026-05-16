import React from 'react';
import { Candidate } from '@/types';
import CVVideoFooter from '../CVVideoFooter';

interface CVTemplateProps {
  candidate: Candidate;
  facePhoto: string | null;
  fullBodyPhoto: string | null;
}

export default function RATemplate({ candidate, facePhoto, fullBodyPhoto }: CVTemplateProps) {
  return <RALayout candidate={candidate} facePhoto={facePhoto} fullBodyPhoto={fullBodyPhoto} headerImage="/RA-1.png" />;
}

export function RALayout({ candidate, facePhoto, fullBodyPhoto, headerImage }: CVTemplateProps & { headerImage: string }) {
  const calculateAge = (dob: string | undefined) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const hasSkill = (skill: string) => {
    const skills = candidate.personalInfo?.skills || [];
    return skills.some(s => s.toUpperCase().includes(skill.toUpperCase()));
  };

  const hasLang = (lang: string) => candidate.personalInfo?.languages?.includes(lang);

  const fullName = `${candidate.passportData?.givenNames || ''} ${candidate.passportData?.surname || ''}`.trim();
  const age = calculateAge(candidate.passportData?.dateOfBirth);

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
  if (candidate.personalInfo?.workExperience && candidate.personalInfo.workExperience.length > 0) {
    const exps = candidate.personalInfo.workExperience.filter(e => e.experienceStatus === 'Have experience');
    if (exps.length > 0) {
      expCountry = exps.map(e => e.country).join(', ');
      expPeriod = exps.map(e => e.yearsOfExperience + ' YRS').join(', ');
      expPosition = exps.map(e => (e as any).position || candidate.personalInfo?.job || '').join(', ');
    }
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
      <div className="p-[8mm] min-h-[297mm] box-border relative page-break-after-always flex flex-col">
        {/* Header */}
        <div className="w-full h-[100px] mb-2 shrink-0">
          <img src={headerImage} alt="Agency Header" className="w-full h-full object-contain object-center" />
        </div>

        {/* Main Content Border Wrapper */}
        <div className="w-full border-2 border-black flex flex-col text-[12px] leading-[1.25] font-serif">
          
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
                <td className={`border border-black px-2 py-1 font-bold w-[25%] ${bgLightBlue}`}>Reference Number</td>
                <td className="border border-black px-2 py-1 w-[40%] font-bold"></td>
                <td className={`border border-black px-2 py-1 text-right font-bold w-[11%] ${bgLightBlue}`}></td>
              </tr>
              <tr>
                <td className={`border border-black px-2 py-1 font-bold ${bgLightBlue}`}>Full Name</td>
                <td className="border border-black px-2 py-1 font-bold uppercase">{fullName}</td>
                <td className={`border border-black px-2 py-1 text-right font-bold ${bgLightBlue}`} dir="rtl">الاسم</td>
              </tr>
              <tr>
                <td className={`border border-black px-2 py-1 font-bold ${bgLightBlue}`}>Religion</td>
                <td className="border border-black px-2 py-1 font-bold uppercase text-[#dc2626] underline decoration-[#dc2626] decoration-wavy underline-offset-2">{candidate.personalInfo?.religion}</td>
                <td className={`border border-black px-2 py-1 text-right font-bold ${bgLightBlue}`} dir="rtl">الديانة</td>
              </tr>
              <tr>
                <td className={`border border-black px-2 py-1 font-bold ${bgLightBlue}`}>Position Desired</td>
                <td className="border border-black px-2 py-1 font-bold uppercase">{candidate.personalInfo?.job || 'HOUSEMAID'}</td>
                <td className={`border border-black px-2 py-1 text-right font-bold ${bgLightBlue}`} dir="rtl">الوظيفة</td>
              </tr>
              <tr>
                <td className={`border border-black px-2 py-1 font-bold ${bgLightBlue}`}>Salary</td>
                <td className="border border-black px-2 py-1 font-bold uppercase">{candidate.salary || candidate.personalInfo?.salary || '1000SR'}</td>
                <td className={`border border-black px-2 py-1 text-right font-bold ${bgLightBlue}`} dir="rtl">الراتب</td>
              </tr>
              <tr>
                <td className={`border border-black px-2 py-1 font-bold ${bgLightBlue}`}>Age</td>
                <td className="border border-black px-2 py-1 font-bold">{age}</td>
                <td className={`border border-black px-2 py-1 text-right font-bold ${bgLightBlue}`} dir="rtl">العمر</td>
              </tr>
              <tr>
                <td className={`border border-black px-2 py-1 font-bold ${bgLightBlue}`}>Sex</td>
                <td className="border border-black px-2 py-1 font-bold uppercase">{candidate.passportData?.gender}</td>
                <td className={`border border-black px-2 py-1 text-right font-bold ${bgLightBlue}`} dir="rtl">الجنس</td>
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
                    <th colSpan={3} className="border border-black px-2 py-1 bg-white font-bold">
                      <div className="flex justify-between items-center w-full">
                        <span>Personal Information</span>
                        <span dir="rtl">معلومات شخصيه</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className={`border border-black px-2 py-1 font-bold w-[38%] ${bgLightBlue}`}>Nationality</td><td className="border border-black px-2 py-1 uppercase font-bold w-[42%]">{candidate.passportData?.nationality}</td><td className={`border border-black px-2 py-1 text-right font-bold w-[20%] ${bgLightBlue}`} dir="rtl">الجنسية</td></tr>
                  <tr><td className={`border border-black px-2 py-1 font-bold ${bgLightBlue}`}>Date of Birth</td><td className="border border-black px-2 py-1 font-bold">{formatDateFull(candidate.passportData?.dateOfBirth)}</td><td className={`border border-black px-2 py-1 text-right font-bold ${bgLightBlue}`} dir="rtl">تاريخ الميلاد</td></tr>
                  <tr><td className={`border border-black px-2 py-1 font-bold ${bgLightBlue}`}>Address</td><td className="border border-black px-2 py-1 uppercase font-bold text-[11px] leading-tight">{candidate.personalInfo?.address || candidate.passportData?.placeOfBirth}</td><td className={`border border-black px-2 py-1 text-right font-bold ${bgLightBlue}`} dir="rtl">العنوان</td></tr>
                  <tr><td className={`border border-black px-2 py-1 font-bold ${bgLightBlue}`}>Marital Status</td><td className="border border-black px-2 py-1 uppercase font-bold">{candidate.personalInfo?.maritalStatus}</td><td className={`border border-black px-2 py-1 text-right font-bold ${bgLightBlue}`} dir="rtl">الحالة الاجتماعية</td></tr>
                  <tr><td className={`border border-black px-2 py-1 font-bold ${bgLightBlue}`}>No. of Children</td><td className="border border-black px-2 py-1 font-bold text-center">{candidate.personalInfo?.numberOfChildren || 0}</td><td className={`border border-black px-2 py-1 text-right font-bold ${bgLightBlue}`} dir="rtl">عدد الأطفال</td></tr>
                  <tr><td className={`border border-black px-2 py-1 font-bold ${bgLightBlue}`}>Height/Weight</td><td className="border border-black p-0 uppercase font-bold"><div className="flex w-full h-full"><div className="w-1/2 border-r border-black px-1 py-1 text-center">{candidate.personalInfo?.height ? `${candidate.personalInfo.height}CM` : ''}</div><div className="w-1/2 px-1 py-1 text-center">{candidate.personalInfo?.weight ? `${candidate.personalInfo.weight}KG` : ''}</div></div></td><td className={`border border-black px-2 py-1 text-right font-bold ${bgLightBlue}`} dir="rtl">الوزن والطول</td></tr>
                  <tr><td className={`border border-black px-2 py-1 font-bold ${bgLightBlue}`}>Education<br/>Qualifications</td><td className="border border-black px-2 py-1 uppercase font-bold text-[11px] leading-tight">{candidate.personalInfo?.educationLevel}</td><td className={`border border-black px-2 py-1 text-right font-bold ${bgLightBlue}`} dir="rtl">المستوى التعليمي</td></tr>
                  <tr><td className={`border border-black px-2 py-1 font-bold ${bgLightBlue}`}>Tel. Number</td><td className="border border-black px-2 py-1 font-bold">+{candidate.personalInfo?.phone?.replace(/\D/g, '') || ''}</td><td className={`border border-black px-2 py-1 text-right font-bold ${bgLightBlue}`} dir="rtl">رقم التواصل</td></tr>
                </tbody>
              </table>

              {/* Overseas Experience */}
              <table className="w-full border-collapse mt-[-1px]">
                <thead>
                  <tr>
                    <th colSpan={3} className="border border-black px-2 py-1 bg-white font-bold">
                      <div className="flex justify-between items-center w-full">
                        <span>Overseas Experience</span>
                        <span dir="rtl">خبرات سابقه</span>
                      </div>
                    </th>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-0.5 font-bold ${bgLightBlue} w-[25%]`}>Country</td>
                    <td className={`border border-black px-2 py-0.5 font-bold ${bgLightBlue} w-[25%]`}>Period</td>
                    <td className={`border border-black px-2 py-0.5 font-bold ${bgLightBlue} w-[50%]`}>Position</td>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="border border-black px-2 py-1 font-bold text-center h-[24px]">{expCountry}</td><td className="border border-black px-2 py-1 font-bold text-center">{expPeriod}</td><td className="border border-black px-2 py-1 font-bold text-center">{expPosition}</td></tr>
                </tbody>
              </table>

              {/* Skills */}
              <table className="w-full border-collapse mt-[15px]">
                <thead>
                  <tr>
                    <th colSpan={6} className="border border-black px-2 py-1 bg-white font-bold">
                      <div className="flex justify-between items-center w-full">
                        <span>Skills</span>
                        <span dir="rtl">المهارات</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`border border-black px-1 py-1 font-bold ${bgLightBlue} w-[18%]`}>Cooking</td>
                    <td className="border border-black p-0 text-center font-bold w-[10%] text-sm">{hasSkill('COOKING') ? renderCheckmark() : 'NO'}</td>
                    <td className={`border border-black px-1 py-1 font-bold text-center ${bgLightBlue} w-[22%] text-[11px]`} dir="rtl">الطبخ</td>
                    <td className={`border border-black px-1 py-1 font-bold ${bgLightBlue} w-[20%]`}>Baby<br/>Sitting</td>
                    <td className="border border-black p-0 text-center font-bold w-[10%] text-sm">{hasSkill('BABY') ? renderCheckmark() : 'NO'}</td>
                    <td className={`border border-black px-1 py-1 font-bold text-center ${bgLightBlue} w-[20%] text-[10px] leading-tight`} dir="rtl">التعامل مع الاطفال</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-1 py-1 font-bold ${bgLightBlue}`}>Washing</td>
                    <td className="border border-black p-0 text-center font-bold text-sm">{hasSkill('WASHING') ? renderCheckmark() : 'NO'}</td>
                    <td className={`border border-black px-1 py-1 font-bold text-center ${bgLightBlue} text-[11px]`} dir="rtl">الغسيل</td>
                    <td className={`border border-black px-1 py-1 font-bold ${bgLightBlue}`}>Sewing</td>
                    <td className="border border-black p-0 text-center font-bold text-sm">{hasSkill('SEWING') ? renderCheckmark() : 'NO'}</td>
                    <td className={`border border-black px-1 py-1 font-bold text-center ${bgLightBlue} text-[11px]`} dir="rtl">الخياطة</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-1 py-1 font-bold ${bgLightBlue}`}>Cleaning</td>
                    <td className="border border-black p-0 text-center font-bold text-sm">{hasSkill('CLEANING') ? renderCheckmark() : 'NO'}</td>
                    <td className={`border border-black px-1 py-1 font-bold text-center ${bgLightBlue} text-[11px]`} dir="rtl">التنظيف</td>
                    <td className={`border border-black px-1 py-1 font-bold ${bgLightBlue}`}>Driving</td>
                    <td className="border border-black p-0 text-center font-bold text-sm">{hasSkill('DRIVING') ? renderCheckmark() : 'NO'}</td>
                    <td className={`border border-black px-1 py-1 font-bold text-center ${bgLightBlue} text-[11px]`} dir="rtl">سائق</td>
                  </tr>
                </tbody>
              </table>

              {/* Languages */}
              <table className="w-full border-collapse mt-[15px]">
                <thead>
                  <tr>
                    <th colSpan={3} className="border border-black px-2 py-1 bg-white font-bold">
                      <div className="flex justify-between items-center w-full">
                        <span>Languages</span>
                        <span dir="rtl">اللغات</span>
                      </div>
                    </th>
                  </tr>
                  <tr>
                    <td className="border border-black px-2 py-0.5 w-[33%] bg-[#eef3f8]"></td>
                    <td className={`border border-black px-2 py-0.5 font-bold text-center ${bgLightBlue} w-[33%] leading-tight`}>English<br/><span dir="rtl">الانجليزية</span></td>
                    <td className={`border border-black px-2 py-0.5 font-bold text-center ${bgLightBlue} w-[34%] leading-tight`}>Arabic<br/><span dir="rtl">العربية</span></td>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-bold ${bgLightBlue}`}>Good</td>
                    <td className="border border-black px-2 py-1 font-bold text-center">{hasLang('ENGLISH') ? 'YES' : 'NO'}</td>
                    <td className="border border-black px-2 py-1 font-bold text-center">{hasLang('ARABIC') ? 'YES' : 'NO'}</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-bold ${bgLightBlue}`}>Fluent</td>
                    <td className="border border-black px-2 py-1 font-bold text-center">NO</td>
                    <td className="border border-black px-2 py-1 font-bold text-center">NO</td>
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
                    <th colSpan={3} className="border border-black px-2 py-1 bg-white font-bold">
                      <div className="flex justify-between items-center w-full">
                        <span>Passport Information</span>
                        <span dir="rtl">معلومات الجواز</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-bold w-[30%] ${bgLightBlue}`}>Number</td>
                    <td className="border border-black px-2 py-1 font-bold uppercase w-[50%]">{candidate.passportData?.passportNumber}</td>
                    <td className={`border border-black px-2 py-1 text-right font-bold w-[20%] ${bgLightBlue}`} dir="rtl"></td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-bold ${bgLightBlue}`}>Issue Date</td>
                    <td className="border border-black px-2 py-1 font-bold">{formatDateFull(candidate.passportData?.dateOfIssue)}</td>
                    <td className={`border border-black px-2 py-1 text-right font-bold ${bgLightBlue}`} dir="rtl">الإصدار</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-bold ${bgLightBlue}`}>Expiry Date</td>
                    <td className="border border-black px-2 py-1 font-bold">{formatDateFull(candidate.passportData?.dateOfExpiry)}</td>
                    <td className={`border border-black px-2 py-1 text-right font-bold ${bgLightBlue}`} dir="rtl">الانتهاء</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-bold ${bgLightBlue}`}>Issue place</td>
                    <td className="border border-black px-2 py-1 font-bold uppercase">{candidate.passportData?.issuingCountry}</td>
                    <td className={`border border-black px-2 py-1 text-right font-bold ${bgLightBlue}`} dir="rtl">الاصدار</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-bold ${bgLightBlue} text-[11px] leading-tight`}>Next of Kin<br/>name</td>
                    <td className="border border-black px-2 py-1 font-bold uppercase text-[11px] leading-tight">{candidate.personalInfo?.emergencyContactName || ''}</td>
                    <td className={`border border-black px-2 py-1 text-right font-bold ${bgLightBlue}`} dir="rtl">خص</td>
                  </tr>
                  <tr>
                    <td className={`border border-black px-2 py-1 font-bold ${bgLightBlue} text-[11px] leading-tight`}>Next of Kin<br/>number</td>
                    <td className="border border-black px-2 py-1 font-bold">{candidate.personalInfo?.emergencyContactPhone || ''}</td>
                    <td className={`border border-black px-2 py-1 text-right font-bold ${bgLightBlue}`} dir="rtl">رتب</td>
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
        <div className={`w-full mt-1 px-2 py-1 border-2 border-black ${bgLightBlue} text-[10px] font-bold uppercase text-center`}>
          Remarks: SHE IS HARDWORKING, NEAT, ORGANISED, SMART, DISCIPLINED, CARING, HAS A GOOD ATTITUDE, SPEAKS GOOD ENGLISH AND LOVES TAKING CARE OF CHILDREN.
        </div>

      </div>

      {/* PAGE 2: Passport Scan */}
      <div className="p-[8mm] min-h-[297mm] box-border relative flex flex-col gap-6 items-center justify-center break-before-page">
        <CVVideoFooter videoUrl={candidate.videoUrl} />
        {candidate.passportImageUrl ? (
          <img src={candidate.passportImageUrl} alt="Passport Scan" className="max-w-full max-h-[240mm] object-contain shadow-md print:shadow-none" />
        ) : (
          <div className="text-[#9ca3af] text-lg flex items-center justify-center w-full h-[240mm] border-2 border-dashed border-gray-300 font-sans">Passport Image Not Available</div>
        )}
      </div>
    </div>
  );
}
