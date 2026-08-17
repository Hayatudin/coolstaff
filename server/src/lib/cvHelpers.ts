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

export interface NormalizedWorkExperience {
  experienceStatus: string;
  country: string;
  yearsOfExperience: string;
  position?: string;
}

export function resolveCandidateNationality(candidate: any): string {
  if (!candidate) return 'ETHIOPIAN';

  // 1. Check candidate address country first (e.g. Ethiopia -> Ethiopian)
  const addressCountry = (
    candidate.personalInfo?.country ||
    candidate.country ||
    candidate.personalInfo?.address ||
    candidate.address ||
    ''
  ).toString().trim();

  if (addressCountry) {
    const cleanCountry = addressCountry.toUpperCase().replace(/YEARS OF EXPERIENCE.*/i, '').replace(/EXPERIENCE.*/i, '').trim();
    if (COUNTRY_TO_DEMONYM_MAP[cleanCountry]) {
      return COUNTRY_TO_DEMONYM_MAP[cleanCountry];
    }
  }

  // 2. Check passport issuing country
  const issuingCountry = (
    candidate.passportData?.issuingCountry ||
    candidate.issuingCountry ||
    candidate.passportData?.placeOfBirth ||
    candidate.placeOfBirth ||
    ''
  ).toString().trim();

  if (issuingCountry) {
    const cleanIssuing = issuingCountry.toUpperCase().replace(/YEARS OF EXPERIENCE.*/i, '').replace(/EXPERIENCE.*/i, '').trim();
    if (COUNTRY_TO_DEMONYM_MAP[cleanIssuing]) {
      return COUNTRY_TO_DEMONYM_MAP[cleanIssuing];
    }
  }

  // 3. Check existing nationality value, cleaning out any experience noise
  let rawNat = (
    candidate.passportData?.nationality ||
    candidate.nationality ||
    ''
  ).toString().trim();

  if (rawNat) {
    const cleanNat = rawNat.replace(/Years of Experience.*/i, '').replace(/Experience.*/i, '').trim().toUpperCase();
    if (cleanNat && COUNTRY_TO_DEMONYM_MAP[cleanNat]) {
      return COUNTRY_TO_DEMONYM_MAP[cleanNat];
    }
  }

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
