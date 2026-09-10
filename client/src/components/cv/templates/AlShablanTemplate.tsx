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
              <td className="border-r border-b border-black px-1 py-[2px] text-center font-normal w-[26%] uppercase text-[11px]">{exp.yearsOfExperience} {exp.yearsOfExperience === '1' ? 'YR' : 'YRS'}</td>
              <td className="border-r border-b border-black px-1 py-[2px] text-center font-normal w-[36%] uppercase text-[11px]">{exp.country}</td>
              <td className="border-b border-black px-1 py-[2px] text-center font-bold text-[#b30000] w-[38%] uppercase text-[11.5px]">{exp.position || 'HOUSE MAID'}</td>
            </tr>
          );
        } else {
          rows.push(
            <tr key={i}>
              <td className="border-r border-b border-black px-1 py-[2px] text-center h-[20px] w-[26%]"></td>
              <td className="border-r border-b border-black px-1 py-[2px] text-center h-[20px] w-[36%]"></td>
              <td className="border-b border-black px-1 py-[2px] text-center h-[20px] w-[38%]"></td>
            </tr>
          );
        }
      }
      return rows;
    }

    return (
      <>
        <tr>
          <td className="border-r border-b border-black px-1 py-[2px] text-center h-[20px] w-[26%]"></td>
          <td className="border-r border-b border-black px-1 py-[2px] text-center h-[20px] w-[36%]"></td>
          <td className="border-b border-black px-1 py-[2px] text-center font-bold text-[#b30000] w-[38%] uppercase text-[11.5px]">FIRST TIMER</td>
        </tr>
        <tr>
          <td className="border-r border-b border-black px-1 py-[2px] text-center h-[20px] w-[26%]"></td>
          <td className="border-r border-b border-black px-1 py-[2px] text-center h-[20px] w-[36%]"></td>
          <td className="border-b border-black px-1 py-[2px] text-center h-[20px] w-[38%]"></td>
        </tr>
        <tr>
          <td className="border-r border-b border-black px-1 py-[2px] text-center h-[20px] w-[26%]"></td>
          <td className="border-r border-b border-black px-1 py-[2px] text-center h-[20px] w-[36%]"></td>
          <td className="border-b border-black px-1 py-[2px] text-center h-[20px] w-[38%]"></td>
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
        {/* TOP HEADER - Exact crop from original template */}
        <div className="w-full mb-1">
          <img
            src="/al-shablan-header-exact.png"
            alt="Al-Shablan Recruitment Company"
            className="w-full h-auto object-contain block"
          />
        </div>

        {/* SECTION 1: CODE & POSITION TABLE */}
        <table className="w-full border-collapse border border-black text-[12px] leading-tight">
          <tbody>
            <tr>
              <td className="border-r border-b border-black px-2 py-[3px] font-bold text-center w-[22%] uppercase">CODE</td>
              <td className="border-r border-b border-black px-2 py-[3px] font-bold text-center text-[#b30000] w-[20%] uppercase text-[12.5px]">{candidateCode}</td>
              <td className="border-b border-black px-2 py-[3px] font-normal text-center w-[58%] text-[13px]">{positionEnglish}</td>
            </tr>
            <tr>
              <td colSpan={2} className="border-r border-black px-2 py-[2px] font-bold text-center uppercase text-[12px]">
                {isExperienced ? 'EX- ABROAD' : 'EX- ABROAD'}
              </td>
              <td className="px-2 py-[2px] text-center text-[12px]" dir="rtl">{positionArabic}</td>
            </tr>
          </tbody>
        </table>

        {/* SECTION 2: APPLICATION FOR EMPLOYMENT */}
        <div className="w-full border-x border-b border-black text-center py-[3px] text-[15px] font-normal text-[#1f4e78] tracking-[0.1em] bg-white">
          APPLICATION FOR EMPLOYMENT
        </div>

        {/* SECTION 3: FULL NAME */}
        <table className="w-full border-collapse border-x border-b border-black text-[12px] leading-tight">
          <tbody>
            <tr>
              <td className="border-r border-black px-2 py-[4px] font-normal text-center w-[24%] uppercase">FULL NAME</td>
              <td className="border-r border-black px-2 py-[4px] font-bold text-center text-[#b30000] text-[15.5px] w-[39%] uppercase tracking-wide">{fullName}</td>
              <td className="px-2 py-[4px] font-normal text-center w-[37%] text-[12.5px]" dir="rtl">الاسم بالكامل</td>
            </tr>
          </tbody>
        </table>

        {/* SECTION 4: PHOTO & STACKED DETAILS */}
        <div className="w-full border-x border-b border-black flex">
          {/* Left: Full Body Photo */}
          <div className="w-[36.8%] shrink-0 border-r border-black p-1 flex items-center justify-center bg-white overflow-hidden">
            {fullBodyPhoto || facePhoto ? (
              <img
                src={fullBodyPhoto || facePhoto || ''}
                alt={fullName}
                className="w-full h-[470px] object-contain object-center"
              />
            ) : (
              <div className="w-full h-[470px] bg-gray-50 flex items-center justify-center text-gray-400 text-xs font-bold uppercase">
                Full Body Photo
              </div>
            )}
          </div>

          {/* Right: Stacked Tables */}
          <div className="w-[63.2%] flex flex-col text-[11px] leading-tight justify-between">
            {/* Table A: Salary & Contract */}
            <table className="w-full border-collapse border-b border-black">
              <tbody>
                <tr>
                  <td className="border-r border-b border-black px-2 py-[2px] font-normal w-[36%]">Monthly Salary</td>
                  <td className="border-r border-b border-black px-1 py-[2px] text-center font-bold text-[#b30000] w-[26%] text-[11.5px]">{salary}</td>
                  <td className="border-b border-black px-2 py-[2px] text-center font-normal w-[38%]" dir="rtl">الراتب الشهري</td>
                </tr>
                <tr>
                  <td className="border-r border-black px-2 py-[2px] font-normal">Contract Period</td>
                  <td className="border-r border-black px-1 py-[2px] text-center font-bold text-[#b30000] text-[11.5px]">2 YRS.</td>
                  <td className="px-2 py-[2px] text-center font-normal" dir="rtl">مدة العقد</td>
                </tr>
              </tbody>
            </table>

            {/* Table B: PASSPORT DETAILS */}
            <table className="w-full border-collapse border-b border-black">
              <thead>
                <tr>
                  <th colSpan={2} className="border-r border-b border-black py-[2px] px-2 text-center font-bold text-[11px] uppercase tracking-wider w-[62%]">PASSPORT DETAILS</th>
                  <th className="border-b border-black py-[2px] px-2 text-center font-bold text-[11px] w-[38%]" dir="rtl">بيانات جواز السفر</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-r border-b border-black px-2 py-[2px] w-[36%] font-normal">Number</td>
                  <td className="border-r border-b border-black px-1 py-[2px] text-center font-bold text-[#b30000] uppercase tracking-wider w-[26%] text-[12px]">{passportNumber}</td>
                  <td className="border-b border-black px-2 py-[2px] text-center font-normal w-[38%]" dir="rtl">رقم الجواز</td>
                </tr>
                <tr>
                  <td className="border-r border-b border-black px-2 py-[2px] font-normal">Date of Issue</td>
                  <td className="border-r border-b border-black px-1 py-[2px] text-center font-bold text-[#b30000] text-[11px]">{dateOfIssue}</td>
                  <td className="border-b border-black px-2 py-[2px] text-center font-normal" dir="rtl">تاريخ الاصدار</td>
                </tr>
                <tr>
                  <td className="border-r border-b border-black px-2 py-[2px] font-normal">Date of Expiry</td>
                  <td className="border-r border-b border-black px-1 py-[2px] text-center font-bold text-[#b30000] text-[11px]">{dateOfExpiry}</td>
                  <td className="border-b border-black px-2 py-[2px] text-center font-normal" dir="rtl">تاريخ الانتهاء</td>
                </tr>
                <tr>
                  <td className="border-r border-b border-black px-2 py-[2px] font-normal">Place of Issue</td>
                  <td className="border-r border-b border-black px-1 py-[2px] text-center font-bold text-[#b30000] uppercase text-[11px]">{placeOfIssue}</td>
                  <td className="border-b border-black px-2 py-[2px] text-center font-normal" dir="rtl">مكان الاصدار</td>
                </tr>
                <tr>
                  <td className="border-r border-b border-black px-2 py-[2px] font-normal">Contact Numbers</td>
                  <td className="border-r border-b border-black px-1 py-[2px] text-center font-bold text-[#b30000] text-[11px]">{contactNumber}</td>
                  <td className="border-b border-black px-2 py-[2px] text-center font-normal" dir="rtl">ارقام التواصل</td>
                </tr>
                <tr>
                  <td className="border-r border-b border-black px-2 py-[2px] font-normal">Name of Next of Kin</td>
                  <td className="border-r border-b border-black px-1 py-[2px] text-center font-bold text-[#b30000] uppercase leading-tight text-[11px]">
                    <div>{nextOfKinName}</div>
                    <div className="text-[10px]">{nextOfKinRelation}</div>
                  </td>
                  <td className="border-b border-black px-2 py-[2px] text-center font-normal" dir="rtl">اسم احد الأقارب</td>
                </tr>
                <tr>
                  <td className="border-r border-black px-2 py-[2px] font-normal">Address and Contact Numbers of Next of Kin</td>
                  <td className="border-r border-black px-1 py-[2px] text-center font-bold text-[#b30000] uppercase leading-tight text-[11px]">
                    <div>{nextOfKinAddress}</div>
                    <div>{nextOfKinPhone}</div>
                  </td>
                  <td className="px-2 py-[2px] text-center font-normal" dir="rtl">العنوان وارقام التواصل لاحد الأقارب</td>
                </tr>
              </tbody>
            </table>

            {/* Table C: LANGUAGES & EDUCATION */}
            <table className="w-full border-collapse border-b border-black">
              <thead>
                <tr>
                  <th className="border-r border-b border-black py-[2px] px-2 text-center font-bold text-[11px] uppercase tracking-wider w-[62%]">LANGUAGES & EDUCATION</th>
                  <th className="border-b border-black py-[2px] px-2 text-center font-bold text-[11px] w-[38%]" dir="rtl">اللغة والتعليم</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-r border-b border-black px-2 py-[2px] font-normal uppercase w-[62%]">ARABIC</td>
                  <td className="border-b border-black px-1 py-[2px] text-center font-bold text-[#b30000] uppercase w-[38%] text-[11.5px]">{arabicLevel}</td>
                </tr>
                <tr>
                  <td className="border-r border-black px-2 py-[2px] font-normal uppercase">ENGLISH</td>
                  <td className="px-1 py-[2px] text-center font-bold text-[#b30000] uppercase text-[11.5px]">{englishLevel}</td>
                </tr>
              </tbody>
            </table>

            {/* Table D: PREVIOUS EMPLOYMENT ABROAD */}
            <table className="w-full border-collapse border-b border-black">
              <thead>
                <tr>
                  <th colSpan={2} className="border-r border-b border-black py-[2px] px-2 text-center font-bold text-[11px] uppercase tracking-wider w-[62%]">PREVIOUS EMPLOYMENT ABROAD</th>
                  <th className="border-b border-black py-[2px] px-2 text-center font-bold text-[11px] w-[38%]" dir="rtl">الخبرات الوظيفية السابقة</th>
                </tr>
                <tr>
                  <th className="border-r border-b border-black py-[2px] px-1 text-center font-normal text-[10px] w-[26%] uppercase">YEARS</th>
                  <th className="border-r border-b border-black py-[2px] px-1 text-center font-normal text-[10px] w-[36%] uppercase">COUNTRY</th>
                  <th className="border-b border-black py-[2px] px-1 text-center font-normal text-[10px] w-[38%] uppercase">POSITION</th>
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
                  <th colSpan={2} className="border-r border-b border-black py-[2px] px-2 text-center font-bold text-[11px] uppercase tracking-wider w-[62%]">PERSONAL DATA</th>
                  <th className="border-b border-black py-[2px] px-2 text-center font-bold text-[11px] w-[38%]" dir="rtl">المعلومات الشخصية</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-r border-b border-black px-2 py-[2px] w-[36%] font-normal">Nationality</td>
                  <td className="border-r border-b border-black px-1 py-[2px] text-center font-bold text-[#b30000] uppercase w-[26%] text-[11.5px]">{nationality}</td>
                  <td className="border-b border-black px-2 py-[2px] text-center font-normal w-[38%]" dir="rtl">الجنسية</td>
                </tr>
                <tr>
                  <td className="border-r border-b border-black px-2 py-[2px] font-normal">Religion</td>
                  <td className="border-r border-b border-black px-1 py-[2px] text-center font-bold text-[#b30000] uppercase text-[11.5px]">{religion}</td>
                  <td className="border-b border-black px-2 py-[2px] text-center font-normal" dir="rtl">الديانة</td>
                </tr>
                <tr>
                  <td className="border-r border-b border-black px-2 py-[2px] font-normal">Date of Birth</td>
                  <td className="border-r border-b border-black px-1 py-[2px] text-center font-bold text-[#b30000] uppercase text-[11px]">{dob}</td>
                  <td className="border-b border-black px-2 py-[2px] text-center font-normal" dir="rtl">تاريخ الميلاد</td>
                </tr>
                <tr>
                  <td className="border-r border-b border-black px-2 py-[2px] font-normal">Place of Birth</td>
                  <td className="border-r border-b border-black px-1 py-[2px] text-center font-bold text-[#b30000] uppercase text-[11px]">{placeOfBirth}</td>
                  <td className="border-b border-black px-2 py-[2px] text-center font-normal" dir="rtl">مكان الميلاد</td>
                </tr>
                <tr>
                  <td className="border-r border-black px-2 py-[2px] font-normal">Living Town</td>
                  <td className="border-r border-black px-1 py-[2px] text-center font-bold text-[#b30000] uppercase text-[11px]">{livingTown}</td>
                  <td className="px-2 py-[2px] text-center font-normal" dir="rtl">مكان العيش</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 5: LOWER HALF (SKILLS ON LEFT, STATS & BIO ON RIGHT) */}
        <div className="w-full border-x border-b border-black flex text-[11px] leading-tight flex-1">
          {/* Left Column: Skills (41.7% width) */}
          <div className="w-[41.7%] shrink-0 border-r border-black flex flex-col">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-r border-b border-black py-[2px] px-2 text-center font-bold text-[11px] uppercase tracking-wider w-[55%]">SKILLS & EXPERIENCES</th>
                  <th className="border-b border-black py-[2px] px-2 text-center font-bold text-[11px] w-[45%]" dir="rtl">خبرات العمل</th>
                </tr>
              </thead>
              <tbody>
                {skillsList.map((s, idx) => (
                  <tr key={idx}>
                    <td className={`border-r ${idx < skillsList.length - 1 ? 'border-b' : ''} border-black px-2 py-[2.5px] font-normal w-[43%]`}>{s.name}</td>
                    <td className={`border-r ${idx < skillsList.length - 1 ? 'border-b' : ''} border-black px-1 py-[2.5px] text-center font-bold text-[13px] w-[21%]`}>{s.val}</td>
                    <td className={`${idx < skillsList.length - 1 ? 'border-b' : ''} border-black px-2 py-[2.5px] text-right font-normal w-[36%]`} dir="rtl">{s.ar}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right Column: Personal Stats + Bio + Date (58.3% width) */}
          <div className="w-[58.3%] flex flex-col justify-between">
            {/* Stats Table */}
            <table className="w-full border-collapse border-b border-black">
              <tbody>
                <tr>
                  <td className="border-r border-b border-black px-2 py-[2px] font-normal w-[36%]">Marital Status</td>
                  <td colSpan={2} className="border-b border-black px-1 py-[2px] text-center font-bold text-[#b30000] uppercase w-[64%] text-[11.5px]">{maritalStatus}</td>
                </tr>
                <tr>
                  <td className="border-r border-b border-black px-2 py-[2px] font-normal">No. of Children</td>
                  <td className="border-r border-b border-black px-1 py-[2px] text-center font-bold text-[#b30000] w-[26%] text-[11.5px]">{numberOfChildren}</td>
                  <td className="border-b border-black px-2 py-[2px] text-center font-normal w-[38%]" dir="rtl">عدد الاطفال</td>
                </tr>
                <tr>
                  <td className="border-r border-b border-black px-2 py-[2px] font-normal">Weight</td>
                  <td className="border-r border-b border-black px-1 py-[2px] text-center font-bold text-[#b30000] text-[11.5px]">{weight}</td>
                  <td className="border-b border-black px-2 py-[2px] text-center font-normal" dir="rtl">الوزن</td>
                </tr>
                <tr>
                  <td className="border-r border-b border-black px-2 py-[2px] font-normal">Height</td>
                  <td className="border-r border-b border-black px-1 py-[2px] text-center font-bold text-[#b30000] text-[11.5px]">{height}</td>
                  <td className="border-b border-black px-2 py-[2px] text-center font-normal" dir="rtl">الطول</td>
                </tr>
                <tr>
                  <td className="border-r border-b border-black px-2 py-[2px] font-normal">Complexion</td>
                  <td className="border-r border-b border-black px-1 py-[2px] text-center font-bold text-[#b30000] uppercase text-[11.5px]">{complexion}</td>
                  <td className="border-b border-black px-2 py-[2px] text-center font-normal" dir="rtl">لون البشرة</td>
                </tr>
                <tr>
                  <td className="border-r border-b border-black px-2 py-[2px] font-normal">Age</td>
                  <td className="border-r border-b border-black px-1 py-[2px] text-center font-bold text-[#b30000] text-[11.5px]">{age ? `${age}y/o` : ''}</td>
                  <td className="border-b border-black px-2 py-[2px] text-center font-normal" dir="rtl">العمر</td>
                </tr>
                <tr>
                  <td className="border-r border-black px-2 py-[2px] font-normal">Education</td>
                  <td colSpan={2} className="px-1 py-[2px] text-center font-bold text-[#b30000] uppercase text-[11px]">{educationLevel}</td>
                </tr>
              </tbody>
            </table>

            {/* Candidate Bio / Description Box */}
            <div className="p-2 border-b border-black text-[12.5px] font-bold uppercase leading-[1.35] tracking-tight text-black flex-1 flex items-center">
              <div>
                MS. <span className="text-[#b30000]">{fullName}</span> IS A {isExperienced ? 'EXPERIENCED WORKER' : 'FIRST TIMER'}. SHE CAPABLE OF ANY HOUSEHOLD DUTIES LIKE WASHING, IRONING CLOTHES AND CLEANING HOUSE. SHE WANTS TO LEARN HOW TO COOK ARABIC DISHES AND WILLING TO TAKE CARE OF CHILDREN. SHE CAN EASILY FOLLOW INSTRUCTION; SHE IS PATIENT AND HARDWORKING.
              </div>
            </div>

            {/* Date Row */}
            <div className="flex items-center text-[11px] font-normal">
              <div className="w-[25%] px-2 py-[3px] border-r border-black">Date</div>
              <div className="w-[50%] py-[3px] text-center uppercase border-r border-black font-bold text-[12px] text-black">{todayDate}</div>
              <div className="w-[25%] px-2 py-[3px] text-center" dir="rtl">التاريخ</div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 6: EXACT RED FOOTER BAR */}
      <div className="w-full mt-1.5">
        <img
          src="/al-shablan-footer-exact.png"
          alt="Al-Shablan Branch Details"
          className="w-full h-auto object-contain block"
        />
      </div>
    </div>
  );
}
