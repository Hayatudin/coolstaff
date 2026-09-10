import React from 'react';
import { Candidate } from '@/types';
import { resolveCandidateNationality, resolveCandidateWorkExperience } from '@/lib/cvHelpers';

interface CVTemplateProps {
  candidate: Candidate;
  facePhoto: string | null;
  fullBodyPhoto: string | null;
}

export default function AlShablanTemplate({ candidate, facePhoto, fullBodyPhoto }: CVTemplateProps) {
  const resolvedExps = resolveCandidateWorkExperience(candidate);
  const resolvedNationality = resolveCandidateNationality(candidate);

  // Helper functions
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

  const formatDateFull = (dateString: string | undefined) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      const day = String(d.getDate()).padStart(2, '0');
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return dateString;
    }
  };

  const fullName = `${candidate.passportData?.givenNames || ''} ${candidate.passportData?.surname || ''}`.trim() || (candidate as any).fullName || '';
  const age = calculateAge(candidate.passportData?.dateOfBirth);
  const isExperienced = resolvedExps.length > 0 || candidate.personalInfo?.workExperience?.some((e: any) => e.experienceStatus === 'Have experience') || false;

  const hasLang = (lang: string) => {
    return candidate.personalInfo?.languages?.some(l => l.toUpperCase().includes(lang.toUpperCase())) ? 'YES' : 'NO';
  };

  const arabicLevel = hasLang('ARABIC') === 'YES' ? (isExperienced ? 'GOOD' : 'FAIR') : 'POOR';
  const englishLevel = hasLang('ENGLISH') === 'YES' ? (isExperienced ? 'GOOD' : 'FAIR') : 'FAIR';

  const hasSkill = (skill: string): 'YES' | 'NO' => {
    const s = skill.toUpperCase();
    const dbSkills = (candidate.personalInfo?.skills || []).map(item => item.toUpperCase());

    if (s === 'CLEANING' || s === 'WASHING' || s === 'IRONING' || s === 'CHILDREN CARE') {
      return 'YES';
    }
    if (s === 'COOKING' || s === 'ARABIC COOKING') {
      return isExperienced ? 'YES' : 'NO';
    }
    if (s === 'BABY SITTING') {
      return dbSkills.some(item => item.includes('BABY')) ? 'YES' : 'NO';
    }
    if (s === 'TUTORING') {
      return dbSkills.includes('TUTORING') ? 'YES' : 'NO';
    }
    if (s === 'DISABLED CARE') {
      return dbSkills.some(item => item.includes('DISABLED')) ? 'YES' : 'NO';
    }
    if (s === 'SEWING') {
      return dbSkills.includes('SEWING') ? 'YES' : 'NO';
    }
    if (s === 'COMPUTERS') {
      return dbSkills.some(item => item.includes('COMPUTER')) ? 'YES' : 'NO';
    }
    return dbSkills.includes(s) ? 'YES' : 'NO';
  };

  const getPositionArabic = (jobName: string | undefined) => {
    const j = (jobName || '').toLowerCase();
    if (j.includes('driver')) return 'سائق';
    if (j.includes('cook')) return 'طباخة';
    if (j.includes('baby') || j.includes('child')) return 'مربية أطفال';
    if (j.includes('nurse') || j.includes('caregiver')) return 'ممرضة / رعاية';
    return 'عاملة منزلية';
  };

  const positionEnglish = candidate.personalInfo?.job || 'Domestic Helper';
  const positionArabic = getPositionArabic(candidate.personalInfo?.job);

  // Candidate Code
  const candidateCode = (candidate.personalInfo as any)?.code || (candidate.passportData?.passportNumber ? `PS – ASH: ${candidate.passportData.passportNumber}` : 'PS – ASH: 1959');

  // Salary & Contract
  const salary = candidate.salary || candidate.personalInfo?.salary || '400 USD';
  const passportNumber = candidate.passportData?.passportNumber || '';
  const dateOfIssue = formatDateFull(candidate.passportData?.dateOfIssue) || '';
  const dateOfExpiry = formatDateFull(candidate.passportData?.dateOfExpiry) || '';
  const placeOfIssue = candidate.passportData?.issuingCountry || (candidate.passportData as any)?.placeOfIssue || 'ETHIOPIA';
  const contactNumber = candidate.personalInfo?.phone || '';
  const nextOfKinName = candidate.personalInfo?.emergencyContactName || '';
  const nextOfKinRelation = candidate.personalInfo?.emergencyContactRelation || 'RELATIVE';
  const nextOfKinAddress = candidate.personalInfo?.city || candidate.personalInfo?.emergencyContactAddress || '';
  const nextOfKinPhone = candidate.personalInfo?.emergencyContactPhone || '';

  const nationality = (resolvedNationality || 'FILIPINO').toUpperCase();
  const religion = (candidate.personalInfo?.religion || 'NON-MUSLIM').toUpperCase();
  const dob = formatDateFull(candidate.passportData?.dateOfBirth) || '';
  const placeOfBirth = (candidate.personalInfo?.city || candidate.passportData?.placeOfBirth || 'ADDIS ABABA').toUpperCase();
  const livingTown = (candidate.personalInfo?.city || 'ADDIS ABABA').toUpperCase();

  const maritalStatus = (candidate.personalInfo?.maritalStatus || 'SINGLE').toUpperCase();
  const numberOfChildren = candidate.personalInfo?.numberOfChildren ?? 0;
  const weight = candidate.personalInfo?.weight ? `${candidate.personalInfo.weight}` : '54';
  const height = candidate.personalInfo?.height ? `${candidate.personalInfo.height}` : "5'2";
  const complexion = ((candidate.personalInfo as any)?.complexion || 'FAIR').toUpperCase();
  const educationLevel = (candidate.personalInfo?.educationLevel || 'HIGH SCHOOL LEVEL').toUpperCase();

  // Current Date Formatted
  const today = new Date();
  const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const todayDate = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

  // Skills List matching exact order from the image
  const skillsList = [
    { name: 'Baby Sitting', val: hasSkill('BABY SITTING'), ar: 'عناية الرضع' },
    { name: 'Children Care', val: hasSkill('CHILDREN CARE'), ar: 'عناية الاطفال' },
    { name: 'Tutoring', val: hasSkill('TUTORING'), ar: 'تعليم الاطفال' },
    { name: 'Disabled Care', val: hasSkill('DISABLED CARE'), ar: 'عناية كبار السن' },
    { name: 'Cleaning', val: hasSkill('CLEANING'), ar: 'التنظيف' },
    { name: 'Washing', val: hasSkill('WASHING'), ar: 'الغسيل' },
    { name: 'Ironing', val: hasSkill('IRONING'), ar: 'الكوي' },
    { name: 'Cooking', val: hasSkill('COOKING'), ar: 'الطبخ' },
    { name: 'Arabic Cooking', val: hasSkill('ARABIC COOKING'), ar: 'الطبخ العربي' },
    { name: 'Sewing', val: hasSkill('SEWING'), ar: 'الخياطة' },
    { name: 'Computers', val: hasSkill('COMPUTERS'), ar: 'استخدام الكمبيوتر' },
    { name: 'Others', val: hasSkill('OTHERS'), ar: 'خبرات اخرى' },
  ];

  // Previous Employment Rows (3 rows total)
  const renderExpRows = () => {
    if (resolvedExps.length > 0) {
      const rows = [];
      for (let i = 0; i < 3; i++) {
        const exp = resolvedExps[i];
        if (exp) {
          rows.push(
            <tr key={i}>
              <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center font-bold w-[26%] uppercase text-[12px]">{exp.yearsOfExperience} {exp.yearsOfExperience === '1' ? 'YR' : 'YRS'}</td>
              <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center font-bold w-[36%] uppercase text-[12px]">{exp.country}</td>
              <td className="border-b-[1.5px] border-black px-1 py-[2.5px] text-center font-extrabold text-[#b30000] w-[38%] uppercase text-[12.5px]">{exp.position || 'HOUSE MAID'}</td>
            </tr>
          );
        } else {
          rows.push(
            <tr key={i}>
              <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center h-[22px] w-[26%]"></td>
              <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center h-[22px] w-[36%]"></td>
              <td className="border-b-[1.5px] border-black px-1 py-[2.5px] text-center h-[22px] w-[38%]"></td>
            </tr>
          );
        }
      }
      return rows;
    }

    return (
      <>
        <tr>
          <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center h-[22px] w-[26%]"></td>
          <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center h-[22px] w-[36%]"></td>
          <td className="border-b-[1.5px] border-black px-1 py-[2.5px] text-center font-extrabold text-[#b30000] w-[38%] uppercase text-[12.5px]">FIRST TIMER</td>
        </tr>
        <tr>
          <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center h-[22px] w-[26%]"></td>
          <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center h-[22px] w-[36%]"></td>
          <td className="border-b-[1.5px] border-black px-1 py-[2.5px] text-center h-[22px] w-[38%]"></td>
        </tr>
        <tr>
          <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center h-[22px] w-[26%]"></td>
          <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center h-[22px] w-[36%]"></td>
          <td className="border-b-[1.5px] border-black px-1 py-[2.5px] text-center h-[22px] w-[38%]"></td>
        </tr>
      </>
    );
  };

  return (
    <div
      className="w-[794px] min-h-[1123px] mx-auto bg-white text-black shadow-lg print:shadow-none p-3 box-border flex flex-col justify-between"
      style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
      dir="ltr"
    >
      <div className="flex flex-col flex-1">
        {/* TOP HEADER - Unaltered */}
        <div className="w-full mb-1">
          <img
            src="/shablon-header.png"
            alt="Al-Shablan Recruitment Company"
            className="w-full h-auto object-contain block"
          />
        </div>

        {/* SECTION 1: CODE & POSITION TABLE */}
        <table className="w-full border-collapse border-[1.5px] border-black text-[13px] leading-tight">
          <tbody>
            <tr>
              <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-[3.5px] font-bold text-center w-[22%] uppercase text-[14px]">CODE</td>
              <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-[3.5px] font-extrabold text-center text-[#b30000] w-[20%] uppercase text-[14px]">{candidateCode}</td>
              <td className="border-b-[1.5px] border-black px-2 py-[3.5px] font-bold text-center w-[58%] text-[15px]">{positionEnglish}</td>
            </tr>
            <tr>
              <td colSpan={2} className="border-r-[1.5px] border-black px-2 py-[3px] font-bold text-center uppercase text-[13.5px]">
                {isExperienced ? 'EX- ABROAD' : 'FIRST TIMER'}
              </td>
              <td className="px-2 py-[3px] text-center font-bold text-[13.5px]" dir="rtl">{positionArabic}</td>
            </tr>
          </tbody>
        </table>

        {/* SECTION 2: APPLICATION FOR EMPLOYMENT */}
        <div className="w-full border-x-[1.5px] border-b-[1.5px] border-black text-center py-[3.5px] text-[17px] font-bold text-[#1f4e78] tracking-[0.14em] bg-white">
          APPLICATION FOR EMPLOYMENT
        </div>

        {/* SECTION 3: FULL NAME */}
        <table className="w-full border-collapse border-x-[1.5px] border-b-[1.5px] border-black text-[13px] leading-tight">
          <tbody>
            <tr>
              <td className="border-r-[1.5px] border-black px-2 py-[4.5px] font-bold text-center w-[24%] uppercase text-[14px]">FULL NAME</td>
              <td className="border-r-[1.5px] border-black px-2 py-[4.5px] font-black text-center text-[#b30000] text-[18px] w-[39%] uppercase tracking-wide">{fullName}</td>
              <td className="px-2 py-[4.5px] font-bold text-center w-[37%] text-[14px]" dir="rtl">الاسم بالكامل</td>
            </tr>
          </tbody>
        </table>

        {/* SECTION 4: PHOTO & STACKED DETAILS */}
        <div className="w-full border-x-[1.5px] border-b-[1.5px] border-black flex">
          {/* Left: Full Body Photo */}
          <div className="w-[36.8%] shrink-0 border-r-[1.5px] border-black p-1 flex items-center justify-center bg-white overflow-hidden">
            {fullBodyPhoto || facePhoto ? (
              <img
                src={fullBodyPhoto || facePhoto || ''}
                alt={fullName}
                className="w-full h-[475px] object-contain object-center"
              />
            ) : (
              <div className="w-full h-[475px] bg-gray-50 flex items-center justify-center text-gray-400 text-sm font-bold uppercase">
                Full Body Photo
              </div>
            )}
          </div>

          {/* Right: Stacked Tables */}
          <div className="w-[63.2%] flex flex-col text-[12px] leading-tight justify-between">
            {/* Table A: Salary & Contract */}
            <table className="w-full border-collapse border-b-[1.5px] border-black">
              <tbody>
                <tr>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-[3px] font-bold w-[35%] text-[12.5px]">Monthly Salary</td>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[3px] text-center font-extrabold text-[#b30000] w-[27%] text-[13px]">{salary}</td>
                  <td className="border-b-[1.5px] border-black px-2 py-[3px] text-center font-bold w-[38%] text-[12.5px]" dir="rtl">الراتب الشهري</td>
                </tr>
                <tr>
                  <td className="border-r-[1.5px] border-black px-2 py-[3px] font-bold text-[12.5px]">Contract Period</td>
                  <td className="border-r-[1.5px] border-black px-1 py-[3px] text-center font-extrabold text-[#b30000] text-[13px]">2 YRS.</td>
                  <td className="px-2 py-[3px] text-center font-bold text-[12.5px]" dir="rtl">مدة العقد</td>
                </tr>
              </tbody>
            </table>

            {/* Table B: PASSPORT DETAILS */}
            <table className="w-full border-collapse border-b-[1.5px] border-black">
              <thead>
                <tr>
                  <th colSpan={2} className="border-r-[1.5px] border-b-[1.5px] border-black py-[2.5px] px-2 text-center font-extrabold text-[12.5px] uppercase tracking-wider w-[62%]">PASSPORT DETAILS</th>
                  <th className="border-b-[1.5px] border-black py-[2.5px] px-2 text-center font-bold text-[12.5px] w-[38%]" dir="rtl">بيانات جواز السفر</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-[2.5px] w-[35%] font-bold text-[12.5px]">Number</td>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center font-extrabold text-[#b30000] uppercase tracking-wider w-[27%] text-[13.5px]">{passportNumber}</td>
                  <td className="border-b-[1.5px] border-black px-2 py-[2.5px] text-center font-bold text-[12.5px]" dir="rtl">رقم الجواز</td>
                </tr>
                <tr>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-[2.5px] font-bold text-[12px]">Date of Issue</td>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center font-bold text-[#b30000] text-[12.5px]">{dateOfIssue}</td>
                  <td className="border-b-[1.5px] border-black px-2 py-[2.5px] text-center font-bold text-[12px]" dir="rtl">تاريخ الاصدار</td>
                </tr>
                <tr>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-[2.5px] font-bold text-[12px]">Date of Expiry</td>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center font-bold text-[#b30000] text-[12.5px]">{dateOfExpiry}</td>
                  <td className="border-b-[1.5px] border-black px-2 py-[2.5px] text-center font-bold text-[12px]" dir="rtl">تاريخ الانتهاء</td>
                </tr>
                <tr>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-[2.5px] font-bold text-[12px]">Place of Issue</td>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center font-bold text-[#b30000] uppercase text-[12.5px]">{placeOfIssue}</td>
                  <td className="border-b-[1.5px] border-black px-2 py-[2.5px] text-center font-bold text-[12px]" dir="rtl">مكان الاصدار</td>
                </tr>
                <tr>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-[2.5px] font-bold text-[12px]">Contact Numbers</td>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center font-bold text-[#b30000] text-[12px]">{contactNumber}</td>
                  <td className="border-b-[1.5px] border-black px-2 py-[2.5px] text-center font-bold text-[12px]" dir="rtl">ارقام التواصل</td>
                </tr>
                <tr>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-[2.5px] font-bold text-[12px]">Name of Next of Kin</td>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center font-bold text-[#b30000] uppercase leading-tight text-[12px]">
                    <div>{nextOfKinName}</div>
                    <div className="text-[11px] font-bold">{nextOfKinRelation}</div>
                  </td>
                  <td className="border-b-[1.5px] border-black px-2 py-[2.5px] text-center font-bold text-[12px]" dir="rtl">اسم احد الأقارب</td>
                </tr>
                <tr>
                  <td className="border-r-[1.5px] border-black px-2 py-[2.5px] font-bold text-[12px]">Address and Contact Numbers of Next of Kin</td>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center font-bold text-[#b30000] uppercase leading-tight text-[12px]">
                    <div>{nextOfKinAddress}</div>
                    <div>{nextOfKinPhone}</div>
                  </td>
                  <td className="px-2 py-[2.5px] text-center font-bold text-[12px]" dir="rtl">العنوان وارقام التواصل لاحد الأقارب</td>
                </tr>
              </tbody>
            </table>

            {/* Table C: LANGUAGES & EDUCATION */}
            <table className="w-full border-collapse border-b-[1.5px] border-black">
              <thead>
                <tr>
                  <th className="border-r-[1.5px] border-b-[1.5px] border-black py-[2.5px] px-2 text-center font-extrabold text-[12.5px] uppercase tracking-wider w-[62%]">LANGUAGES & EDUCATION</th>
                  <th className="border-b-[1.5px] border-black py-[2.5px] px-2 text-center font-bold text-[12.5px] w-[38%]" dir="rtl">اللغة والتعليم</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-[2.5px] font-bold uppercase w-[62%] text-[12.5px]">ARABIC</td>
                  <td className="border-b-[1.5px] border-black px-1 py-[2.5px] text-center font-extrabold text-[#b30000] uppercase w-[38%] text-[13px]">{arabicLevel}</td>
                </tr>
                <tr>
                  <td className="border-r-[1.5px] border-black px-2 py-[2.5px] font-bold uppercase text-[12.5px]">ENGLISH</td>
                  <td className="px-1 py-[2.5px] text-center font-extrabold text-[#b30000] uppercase text-[13px]">{englishLevel}</td>
                </tr>
              </tbody>
            </table>

            {/* Table D: PREVIOUS EMPLOYMENT ABROAD */}
            <table className="w-full border-collapse border-b-[1.5px] border-black">
              <thead>
                <tr>
                  <th colSpan={2} className="border-r-[1.5px] border-b-[1.5px] border-black py-[2.5px] px-2 text-center font-extrabold text-[12.5px] uppercase tracking-wider w-[62%]">PREVIOUS EMPLOYMENT ABROAD</th>
                  <th className="border-b-[1.5px] border-black py-[2.5px] px-2 text-center font-bold text-[12.5px] w-[38%]" dir="rtl">الخبرات الوظيفية السابقة</th>
                </tr>
                <tr>
                  <th className="border-r-[1.5px] border-b-[1.5px] border-black py-[2px] px-1 text-center font-bold text-[11px] w-[26%] uppercase">YEARS</th>
                  <th className="border-r-[1.5px] border-b-[1.5px] border-black py-[2px] px-1 text-center font-bold text-[11px] w-[36%] uppercase">COUNTRY</th>
                  <th className="border-b-[1.5px] border-black py-[2px] px-1 text-center font-bold text-[11px] w-[38%] uppercase">POSITION</th>
                </tr>
              </thead>
              <tbody>
                {renderExpRows()}
              </tbody>
            </table>

            {/* Table E: PERSONAL DATA */}
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th colSpan={2} className="border-r-[1.5px] border-b-[1.5px] border-black py-[2.5px] px-2 text-center font-extrabold text-[12.5px] uppercase tracking-wider w-[62%]">PERSONAL DATA</th>
                  <th className="border-b-[1.5px] border-black py-[2.5px] px-2 text-center font-bold text-[12.5px] w-[38%]" dir="rtl">المعلومات الشخصية</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-[2.5px] w-[35%] font-bold text-[12px]">Nationality</td>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center font-bold text-[#b30000] uppercase w-[27%] text-[12.5px]">{nationality}</td>
                  <td className="border-b-[1.5px] border-black px-2 py-[2.5px] text-center font-bold w-[38%] text-[12px]" dir="rtl">الجنسية</td>
                </tr>
                <tr>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-[2.5px] font-bold text-[12px]">Religion</td>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center font-bold text-[#b30000] uppercase text-[12.5px]">{religion}</td>
                  <td className="border-b-[1.5px] border-black px-2 py-[2.5px] text-center font-bold text-[12px]" dir="rtl">الديانة</td>
                </tr>
                <tr>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-[2.5px] font-bold text-[12px]">Date of Birth</td>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center font-bold text-[#b30000] uppercase text-[12px]">{dob}</td>
                  <td className="border-b-[1.5px] border-black px-2 py-[2.5px] text-center font-bold text-[12px]" dir="rtl">تاريخ الميلاد</td>
                </tr>
                <tr>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-[2.5px] font-bold text-[12px]">Place of Birth</td>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center font-bold text-[#b30000] uppercase text-[12px]">{placeOfBirth}</td>
                  <td className="border-b-[1.5px] border-black px-2 py-[2.5px] text-center font-bold text-[12px]" dir="rtl">مكان الميلاد</td>
                </tr>
                <tr>
                  <td className="border-r-[1.5px] border-black px-2 py-[2.5px] font-bold text-[12px]">Living Town</td>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center font-bold text-[#b30000] uppercase text-[12px]">{livingTown}</td>
                  <td className="px-2 py-[2.5px] text-center font-bold text-[12px]" dir="rtl">مكان العيش</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 5: LOWER HALF (SKILLS ON LEFT, STATS & BIO ON RIGHT) */}
        <div className="w-full border-x-[1.5px] border-b-[1.5px] border-black flex text-[12px] leading-tight flex-1">
          {/* Left Column: Skills (41.7% width) */}
          <div className="w-[41.7%] shrink-0 border-r-[1.5px] border-black flex flex-col">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-r-[1.5px] border-b-[1.5px] border-black py-[2.5px] px-1.5 text-center font-extrabold text-[12.5px] uppercase tracking-wider w-[54%]">SKILLS & EXPERIENCES</th>
                  <th className="border-b-[1.5px] border-black py-[2.5px] px-1.5 text-center font-bold text-[12.5px] w-[46%]" dir="rtl">خبرات العمل</th>
                </tr>
              </thead>
              <tbody>
                {skillsList.map((s, idx) => (
                  <tr key={idx}>
                    <td className={`border-r-[1.5px] ${idx < skillsList.length - 1 ? 'border-b-[1.5px]' : ''} border-black px-1.5 py-[2.5px] font-bold w-[37%] text-[12px]`}>{s.name}</td>
                    <td className={`border-r-[1.5px] ${idx < skillsList.length - 1 ? 'border-b-[1.5px]' : ''} border-black px-0.5 py-[2.5px] text-center font-black text-[14px] w-[17%]`}>{s.val}</td>
                    <td className={`${idx < skillsList.length - 1 ? 'border-b-[1.5px]' : ''} border-black px-1.5 py-[2.5px] text-right font-bold w-[46%] text-[12px] whitespace-nowrap`} dir="rtl">{s.ar}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right Column: Personal Stats + Bio + Date (58.3% width) */}
          <div className="w-[58.3%] flex flex-col justify-between">
            {/* Stats Table */}
            <table className="w-full border-collapse border-b-[1.5px] border-black">
              <tbody>
                <tr>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-[2.5px] font-bold w-[36%] text-[12px]">Marital Status</td>
                  <td colSpan={2} className="border-b-[1.5px] border-black px-1 py-[2.5px] text-center font-extrabold text-[#b30000] uppercase w-[64%] text-[12.5px]">{maritalStatus}</td>
                </tr>
                <tr>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-[2.5px] font-bold text-[12px]">No. of Children</td>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center font-bold text-[#b30000] w-[26%] text-[12.5px]">{numberOfChildren}</td>
                  <td className="border-b-[1.5px] border-black px-2 py-[2.5px] text-center font-bold w-[38%] text-[12px]" dir="rtl">عدد الاطفال</td>
                </tr>
                <tr>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-[2.5px] font-bold text-[12px]">Weight</td>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center font-bold text-[#b30000] text-[12.5px]">{weight}</td>
                  <td className="border-b-[1.5px] border-black px-2 py-[2.5px] text-center font-bold w-[38%] text-[12px]" dir="rtl">الوزن</td>
                </tr>
                <tr>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-[2.5px] font-bold text-[12px]">Height</td>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center font-bold text-[#b30000] text-[12.5px]">{height}</td>
                  <td className="border-b-[1.5px] border-black px-2 py-[2.5px] text-center font-bold w-[38%] text-[12px]" dir="rtl">الطول</td>
                </tr>
                <tr>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-[2.5px] font-bold text-[12px]">Complexion</td>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center font-bold text-[#b30000] uppercase text-[12.5px]">{complexion}</td>
                  <td className="border-b-[1.5px] border-black px-2 py-[2.5px] text-center font-bold w-[38%] text-[12px]" dir="rtl">لون البشرة</td>
                </tr>
                <tr>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-[2.5px] font-bold text-[12px]">Age</td>
                  <td className="border-r-[1.5px] border-b-[1.5px] border-black px-1 py-[2.5px] text-center font-bold text-[#b30000] text-[12.5px]">{age ? `${age}y/o` : ''}</td>
                  <td className="border-b-[1.5px] border-black px-2 py-[2.5px] text-center font-bold w-[38%] text-[12px]" dir="rtl">العمر</td>
                </tr>
                <tr>
                  <td className="border-r-[1.5px] border-black px-2 py-[2.5px] font-bold text-[12px]">Education</td>
                  <td colSpan={2} className="px-1 py-[2.5px] text-center font-extrabold text-[#b30000] uppercase text-[12px]">{educationLevel}</td>
                </tr>
              </tbody>
            </table>

            {/* Candidate Bio / Description Box */}
            <div className="p-2 border-b-[1.5px] border-black text-[13.5px] font-bold uppercase leading-[1.4] tracking-tight text-black flex-1 flex items-center">
              <div>
                MS. <span className="text-[#b30000]">{fullName}</span> IS A {isExperienced ? 'EXPERIENCED WORKER' : 'FIRST TIMER'}. SHE CAPABLE OF ANY HOUSEHOLD DUTIES LIKE WASHING, IRONING CLOTHES AND CLEANING HOUSE. SHE WANTS TO LEARN HOW TO COOK ARABIC DISHES AND WILLING TO TAKE CARE OF CHILDREN. SHE CAN EASILY FOLLOW INSTRUCTION; SHE IS PATIENT AND HARDWORKING.
              </div>
            </div>

            {/* Date Row */}
            <div className="flex items-center text-[12px] font-bold">
              <div className="w-[25%] px-2 py-[3.5px] border-r-[1.5px] border-black">Date</div>
              <div className="w-[50%] py-[3.5px] text-center uppercase border-r-[1.5px] border-black font-bold text-[13px] text-black">{todayDate}</div>
              <div className="w-[25%] px-2 py-[3.5px] text-center" dir="rtl">التاريخ</div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 6: TYPED ARABIC FOOTER WITH SOLID RED BACKGROUND */}
      <div
        className="w-full bg-[#e52421] text-white py-1.5 px-3 leading-tight mt-1.5 rounded-[1px] flex flex-col justify-between"
        dir="rtl"
      >
        <div
          className="text-[12.5px] font-bold text-white tracking-[0.02em] w-full"
          style={{ textAlign: 'justify', textAlignLast: 'justify' }}
        >
          المملكة العربية السعودية - الرياض - حي النهضة - ش سلمان الفارسي - مقابل مركز أضواء الإبتسامة لطب الأسنان
        </div>
        <div
          className="text-[12.5px] font-bold text-white tracking-[0.02em] mt-1 w-full"
          style={{ textAlign: 'justify', textAlignLast: 'justify' }}
        >
          ترخيص رقم 3701140 - س.ت 1010441568 - رقم العضوية 353211 - تلفون 920002809 - جوال 0535341155
        </div>
      </div>
    </div>
  );
}
