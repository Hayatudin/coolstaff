export const COUNTRY_TO_DEMONYM_MAP: Record<string, string> = {
  'ETHIOPIA': 'ETHIOPIAN',
  'ETHIOPIAN': 'ETHIOPIAN',
  'UGANDA': 'UGANDAN',
  'UGANDAN': 'UGANDAN',
  'KENYA': 'KENYAN',
  'KENYAN': 'KENYAN',
  'PHILIPPINES': 'FILIPINO',
  'PHILIPPINE': 'FILIPINO',
  'FILIPINO': 'FILIPINO',
  'INDONESIA': 'INDONESIAN',
  'INDONESIAN': 'INDONESIAN',
  'INDIA': 'INDIAN',
  'INDIAN': 'INDIAN',
  'NEPAL': 'NEPALESE',
  'NEPALESE': 'NEPALESE',
  'SRI LANKA': 'SRI LANKAN',
  'SRI LANKAN': 'SRI LANKAN',
  'MADAGASCAR': 'MALAGASY',
  'MALAGASY': 'MALAGASY',
  'TANZANIA': 'TANZANIAN',
  'TANZANIAN': 'TANZANIAN',
  'GHANA': 'GHANAIAN',
  'GHANAIAN': 'GHANAIAN',
  'NIGERIA': 'NIGERIAN',
  'NIGERIAN': 'NIGERIAN',
  'BURUNDI': 'BURUNDIAN',
  'BURUNDIAN': 'BURUNDIAN',
  'SAUDI ARABIA': 'SAUDI',
  'SAUDI': 'SAUDI',
  'UAE': 'EMIRATI',
  'UNITED ARAB EMIRATES': 'EMIRATI',
  'EMIRATI': 'EMIRATI',
  'KUWAIT': 'KUWAITI',
  'KUWAITI': 'KUWAITI',
  'LEBANON': 'LEBANESE',
  'LEBANESE': 'LEBANESE',
  'JORDAN': 'JORDANIAN',
  'JORDANIAN': 'JORDANIAN',
  'QATAR': 'QATARI',
  'QATARI': 'QATARI',
  'BAHRAIN': 'BAHRAINI',
  'BAHRAINI': 'BAHRAINI',
  'OMAN': 'OMANI',
  'OMANI': 'OMANI',
  'YEMEN': 'YEMENI',
  'YEMENI': 'YEMENI',
  'SUDAN': 'SUDANESE',
  'SUDANESE': 'SUDANESE',
  'ERITREA': 'ERITREAN',
  'ERITREAN': 'ERITREAN',
  'SOMALIA': 'SOMALI',
  'SOMALI': 'SOMALI',
  'DJIBOUTI': 'DJIBOUTIAN',
  'DJIBOUTIAN': 'DJIBOUTIAN',
  'RWANDA': 'RWANDAN',
  'RWANDAN': 'RWANDAN',
  'CAMEROON': 'CAMEROONIAN',
  'CAMEROONIAN': 'CAMEROONIAN',
  'ZAMBIA': 'ZAMBIAN',
  'ZAMBIAN': 'ZAMBIAN',
  'ZIMBABWE': 'ZIMBABWEAN',
  'ZIMBABWEAN': 'ZIMBABWEAN',
  'SOUTH AFRICA': 'SOUTH AFRICAN',
  'SOUTH AFRICAN': 'SOUTH AFRICAN',
  'BANGLADESH': 'BANGLADESHI',
  'BANGLADESHI': 'BANGLADESHI',
  'PAKISTAN': 'PAKISTANI',
  'PAKISTANI': 'PAKISTANI',
  'VIETNAM': 'VIETNAMESE',
  'VIETNAMESE': 'VIETNAMESE',
  'THAILAND': 'THAI',
  'THAI': 'THAI',
  'MYANMAR': 'BURMESE',
  'BURMESE': 'BURMESE',
};

export const DESTINATION_WORK_COUNTRIES = new Set([
  'SAUDI ARABIA', 'SAUDI', 'KSA',
  'UAE', 'UNITED ARAB EMIRATES', 'EMIRATI', 'DUBAI', 'ABU DHABI',
  'KUWAIT', 'KUWAITI',
  'QATAR', 'QATARI',
  'BAHRAIN', 'BAHRAINI',
  'OMAN', 'OMANI',
  'LEBANON', 'LEBANESE',
  'JORDAN', 'JORDANIAN',
]);

export interface NormalizedWorkExperience {
  experienceStatus: string;
  country: string;
  yearsOfExperience: string;
  position?: string;
}

export function resolveCandidateNationality(candidate: any): string {
  if (!candidate) return 'ETHIOPIAN';

  const findHomeDemonym = (val: any): string | null => {
    if (!val) return null;
    const str = String(val).toUpperCase().replace(/YEARS OF EXPERIENCE.*/i, '').replace(/EXPERIENCE.*/i, '').trim();
    if (!str) return null;

    if (DESTINATION_WORK_COUNTRIES.has(str)) return null;

    if (COUNTRY_TO_DEMONYM_MAP[str] && !DESTINATION_WORK_COUNTRIES.has(COUNTRY_TO_DEMONYM_MAP[str])) {
      return COUNTRY_TO_DEMONYM_MAP[str];
    }

    for (const [countryKey, demonym] of Object.entries(COUNTRY_TO_DEMONYM_MAP)) {
      if (DESTINATION_WORK_COUNTRIES.has(countryKey) || DESTINATION_WORK_COUNTRIES.has(demonym)) continue;
      if (str.includes(countryKey)) {
        return demonym;
      }
    }

    return null;
  };

  // 1. Check candidate address country or address text first
  const addressVal = candidate.personalInfo?.country || candidate.country || candidate.personalInfo?.address || candidate.address;
  const fromAddress = findHomeDemonym(addressVal);
  if (fromAddress) return fromAddress;

  // 2. Check passport issuing country
  const issuingVal = candidate.passportData?.issuingCountry || candidate.issuingCountry;
  const fromIssuing = findHomeDemonym(issuingVal);
  if (fromIssuing) return fromIssuing;

  // 3. Check place of birth
  const birthVal = candidate.passportData?.placeOfBirth || candidate.placeOfBirth;
  const fromBirth = findHomeDemonym(birthVal);
  if (fromBirth) return fromBirth;

  // 4. Check nationality field in DB if it's a valid home country (not a work experience destination)
  const natVal = candidate.passportData?.nationality || candidate.nationality;
  const fromNat = findHomeDemonym(natVal);
  if (fromNat) return fromNat;

  // Default fallback
  return 'ETHIOPIAN';
}

function parseExperienceText(text: string, addExp: (c: string, y: string, p?: string) => void) {
  if (!text) return;

  // Pattern A: "Saudi ArabiaYears of Experience: 2" or "Saudi Arabia 2 Years"
  const matchA = text.match(/([A-Za-z\s]+?)(?:Years of Experience|Experience|YRS|Years)[\s:]*(\d+)/i);
  if (matchA) {
    const country = matchA[1].trim();
    const years = matchA[2].trim();
    if (country) addExp(country, years);
    return;
  }

  // Pattern B: Search for known country names in text
  const knownCountries = ['SAUDI ARABIA', 'SAUDI', 'UAE', 'UNITED ARAB EMIRATES', 'KUWAIT', 'LEBANON', 'JORDAN', 'QATAR', 'BAHRAIN', 'OMAN', 'DUBAI'];
  const upper = text.toUpperCase();
  for (const c of knownCountries) {
    if (upper.includes(c)) {
      const numMatch = text.match(/(\d+)/);
      const years = numMatch ? numMatch[1] : '2';
      addExp(c, years);
      return;
    }
  }
}

export function resolveCandidateWorkExperience(candidate: any): NormalizedWorkExperience[] {
  if (!candidate) return [];
  const list: NormalizedWorkExperience[] = [];

  const defaultPosition = candidate.job || candidate.personalInfo?.job || 'House Maid';

  const addExp = (country: string, years: string, position?: string) => {
    const cleanCountry = (country || '').replace(/Years of Experience.*/i, '').replace(/Experience.*/i, '').trim().toUpperCase();
    const cleanYears = String(years || '').replace(/\D/g, '') || '1';
    if (cleanCountry && !cleanCountry.includes('ETHIOPIA')) {
      // Check if already added
      const exists = list.some(item => item.country === cleanCountry);
      if (!exists) {
        list.push({
          experienceStatus: 'Have experience',
          country: cleanCountry,
          yearsOfExperience: cleanYears,
          position: position || defaultPosition,
        });
      }
    }
  };

  // 1. Check workExperience array/string
  const rawWorkExp = candidate.personalInfo?.workExperience || candidate.workExperience;
  if (Array.isArray(rawWorkExp) && rawWorkExp.length > 0) {
    for (const item of rawWorkExp) {
      if (typeof item === 'object' && item !== null) {
        if (item.experienceStatus === 'Have experience' || (item.country && item.country.trim() !== '')) {
          addExp(item.country, item.yearsOfExperience || item.years || '1', item.position);
        }
      } else if (typeof item === 'string') {
        try {
          const parsed = JSON.parse(item);
          if (Array.isArray(parsed)) {
            for (const p of parsed) {
              if (p.experienceStatus === 'Have experience' || (p.country && p.country.trim() !== '')) {
                addExp(p.country, p.yearsOfExperience || p.years || '1', p.position);
              }
            }
          }
        } catch (_) {
          parseExperienceText(item, addExp);
        }
      }
    }
  }

  // 2. Check jobExperience field
  const rawJobExp = candidate.jobExperience || candidate.personalInfo?.jobExperience;
  if (list.length === 0 && rawJobExp) {
    if (Array.isArray(rawJobExp)) {
      for (const item of rawJobExp) {
        if (item.experienceStatus === 'Have experience' || (item.country && item.country.trim() !== '')) {
          addExp(item.country, item.yearsOfExperience || item.years || '1', item.position);
        }
      }
    } else if (typeof rawJobExp === 'string') {
      try {
        const parsed = JSON.parse(rawJobExp);
        if (Array.isArray(parsed)) {
          for (const p of parsed) {
            if (p.experienceStatus === 'Have experience' || (p.country && p.country.trim() !== '')) {
              addExp(p.country, p.yearsOfExperience || p.years || '1', p.position);
            }
          }
        }
      } catch (_) {
        parseExperienceText(rawJobExp, addExp);
      }
    }
  }

  // 3. Check nationality field for polluted experience string (e.g. "Saudi ArabiaYears of Experience: 2")
  const nationalityStr = String(candidate.passportData?.nationality || candidate.nationality || '');
  if (list.length === 0 && (nationalityStr.includes('Years of Experience') || nationalityStr.includes('Experience'))) {
    parseExperienceText(nationalityStr, addExp);
  }

  return list;
}
