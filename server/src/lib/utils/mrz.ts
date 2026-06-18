export const COUNTRY_MAP: Record<string, string> = {
  ETH: 'Ethiopia', KEN: 'Kenya', UGA: 'Uganda', TZA: 'Tanzania',
  NGA: 'Nigeria', GHA: 'Ghana', EGY: 'Egypt', ZAF: 'South Africa',
  IND: 'India', PAK: 'Pakistan', BGD: 'Bangladesh', LKA: 'Sri Lanka',
  NPL: 'Nepal', PHL: 'Philippines', IDN: 'Indonesia', MMR: 'Myanmar',
  SAU: 'Saudi Arabia', ARE: 'United Arab Emirates', KWT: 'Kuwait',
  QAT: 'Qatar', BHR: 'Bahrain', OMN: 'Oman', JOR: 'Jordan',
  USA: 'United States', GBR: 'United Kingdom', CAN: 'Canada',
  SOM: 'Somalia', SDN: 'Sudan', SSD: 'South Sudan', ERI: 'Eritrea',
  DJI: 'Djibouti', CMR: 'Cameroon', COD: 'DR Congo', MDG: 'Madagascar',
};

export function cleanNumericString(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[OOD]/g, '0')
    .replace(/[IL|T]/g, '1')
    .replace(/[Z]/g, '2')
    .replace(/[S]/g, '5')
    .replace(/[G]/g, '6')
    .replace(/[B]/g, '8')
    .replace(/[^0-9]/g, '');
}

export function formatDate(raw: string): string {
  const cleaned = cleanNumericString(raw).substring(0, 6);
  if (cleaned.length !== 6) return '';
  const year = parseInt(cleaned.substring(0, 2));
  const month = parseInt(cleaned.substring(2, 4));
  const day = parseInt(cleaned.substring(4, 6));
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || isNaN(day) || day < 1 || day > 31) return '';
  const fullYear = year > 30 ? 1900 + year : 2000 + year;
  return `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function preprocessOcrLine(raw: string): string {
  let cleaned = raw.toUpperCase();
  cleaned = cleaned.replace(/[\/\\|:;(),.\[\]{}?_\-+=~—«»]/g, '<');
  cleaned = cleaned.replace(/[^A-Z0-9<]/g, '<');
  return cleaned;
}

export function normalizeLine(raw: string): string {
  let cleaned = preprocessOcrLine(raw);
  cleaned = cleaned.replace(/<+[A-Z]?<+/g, '<<');
  return cleaned.padEnd(44, '<').substring(0, 44);
}

export function mrzScore(raw: string): number {
  if (/[^\x00-\x7F]/.test(raw)) return 0;
  if (/[a-z]/.test(raw) && (raw.match(/[a-z]/g) || []).length > 5) return 0;

  const preprocessed = preprocessOcrLine(raw);
  let score = 0;
  const len = preprocessed.length;
  
  if (len >= 40 && len <= 48) score += 40;
  else if (len >= 30 && len <= 55) score += 15;
  else return 0;

  const chevrons = (preprocessed.match(/</g) || []).length;
  score += Math.min(chevrons * 3, 35);

  const digits = (preprocessed.match(/\d/g) || []).length;
  score += Math.min(digits * 2, 20);

  const firstChar = preprocessed.trim().replace(/^[^A-Z0-9<]+/, '')[0];
  if (firstChar === 'P') {
    score += 50;
  } else if (['F', 'R', 'D', 'O', 'B'].includes(firstChar)) {
    score += 20;
  }

  if (/REPUBLIC|PASSPORT|FEDERAL|GIVEN|SURNAME|NAMES|DATE|BIRTH|EXPIRY|NATIONAL/i.test(raw)) {
    score -= 60;
  }

  return score;
}

export function findMrzLines(text: string): [string, string] | null {
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  const scored = lines.map((line, index) => ({ 
    line, 
    index, 
    score: mrzScore(line), 
    cleaned: preprocessOcrLine(line) 
  })).filter(s => s.score > 10);
  
  scored.sort((a, b) => b.score - a.score);

  for (const l1 of scored) {
    let c1 = l1.cleaned.replace(/^[^A-Z0-9<]+/, '');
    const isLine1 = c1.startsWith('P') || 
                    (c1.includes('<<') && ['F', 'R', 'D', 'O', 'B', '0', '<'].includes(c1[0])) ||
                    (c1.length >= 40 && ['F', 'R', 'D', 'O', 'B', '0', '<'].includes(c1[0]) && (c1.match(/</g) || []).length > 15);

    if (!isLine1) continue;

    if (!c1.startsWith('P')) {
      c1 = 'P' + c1.substring(1);
    }

    for (const l2 of scored) {
      if (l2.index <= l1.index) continue;
      let c2 = l2.cleaned.replace(/^[^A-Z0-9<]+/, '');
      const digitsCount = (c2.match(/\d/g) || []).length;
      if (digitsCount >= 5) {
        c1 = c1.replace(/<+[A-Z]?<+/g, '<<');
        const line1 = c1.padEnd(44, '<').substring(0, 44);
        const line2 = c2.padEnd(44, '<').substring(0, 44);
        return [line1, line2];
      }
    }
  }

  for (let i = 0; i < scored.length; i++) {
    const l1 = scored[i];
    let c1 = l1.cleaned.replace(/^[^A-Z0-9<]+/, '');
    for (let j = 0; j < scored.length; j++) {
      const l2 = scored[j];
      if (l2.index <= l1.index) continue;
      let c2 = l2.cleaned.replace(/^[^A-Z0-9<]+/, '');
      
      const l1Chevrons = (c1.match(/</g) || []).length;
      const l2Digits = (c2.match(/\d/g) || []).length;
      
      if (c1.length >= 38 && c2.length >= 38 && l1Chevrons >= 10 && l2Digits >= 5) {
        if (!c1.startsWith('P')) {
          c1 = 'P' + (c1.startsWith('<') ? c1.substring(1) : c1);
        }
        c1 = c1.replace(/<+[A-Z]?<+/g, '<<');
        const line1 = c1.padEnd(44, '<').substring(0, 44);
        const line2 = c2.padEnd(44, '<').substring(0, 44);
        return [line1, line2];
      }
    }
  }

  return null;
}

export function preCleanMrzLine1(line: string): string {
  let cleaned = line.toUpperCase().replace(/[\/\\|:;(),.\[\]{}?_\-+=~—«»]/g, '<');
  cleaned = cleaned.replace(/[^A-Z0-9< ]/g, '<');

  if (cleaned.startsWith('P') && cleaned[1] !== '<') {
    cleaned = 'P<' + cleaned.substring(2);
  } else if (!cleaned.startsWith('P')) {
    cleaned = 'P<' + (cleaned.startsWith('<') ? cleaned.substring(1) : cleaned);
  }

  const prefix = cleaned.substring(0, 5);
  let namePart = cleaned.substring(5);

  namePart = namePart.padEnd(39, '<').substring(0, 39);

  const DEFINITE_NAME_CHARS = new Set(['A', 'D', 'E', 'G', 'M', 'N', 'P', 'Q', 'R', 'U', 'W']);
  const LIKELY_CHEVRONS = new Set(['<', 'K', 'C', 'L', 'X', 'V', 'F', 'Y', 'H', 'Z', 'I', 'J', ' ', '0', '1', '2', '8', '9']);

  let chars = namePart.split('');
  let i = chars.length - 1;
  while (i >= 0) {
    const char = chars[i];
    if (DEFINITE_NAME_CHARS.has(char)) {
      break;
    }
    if (LIKELY_CHEVRONS.has(char)) {
      chars[i] = '<';
    } else {
      break;
    }
    i--;
  }
  namePart = chars.join('');

  const CHEVRON_LIKE = new Set(['<', 'K', 'C', 'L', 'X']);
  let separatorStart = -1;
  let separatorEnd = -1;
  for (let j = 0; j < namePart.length - 1; j++) {
    if (CHEVRON_LIKE.has(namePart[j]) && CHEVRON_LIKE.has(namePart[j + 1])) {
      separatorStart = j;
      separatorEnd = j + 2;
      while (separatorEnd < namePart.length && namePart[separatorEnd] === '<') {
        separatorEnd++;
      }
      break;
    }
  }
  if (separatorStart !== -1) {
    namePart = namePart.substring(0, separatorStart) + '<<' + namePart.substring(separatorEnd);
  }

  return prefix + namePart;
}

export function cleanPassportNumber(raw: string): string {
  let cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  if (cleaned.startsWith('EP') && cleaned.length === 9) {
    const digitsPart = cleaned.substring(2);
    const correctedDigits = digitsPart
      .replace(/[OOD]/g, '0')
      .replace(/[IL|T]/g, '1')
      .replace(/[Z]/g, '2')
      .replace(/[S]/g, '5')
      .replace(/[G]/g, '6')
      .replace(/[B]/g, '8');
    return 'EP' + correctedDigits;
  }
  
  const match = cleaned.match(/^([A-Z]{1,3})(.*)$/);
  if (match) {
    const letters = match[1];
    const rest = match[2];
    const correctedDigits = rest
      .replace(/[OOD]/g, '0')
      .replace(/[IL|T]/g, '1')
      .replace(/[Z]/g, '2')
      .replace(/[S]/g, '5')
      .replace(/[G]/g, '6')
      .replace(/[B]/g, '8');
    return letters + correctedDigits;
  }
  
  return cleaned;
}

export function cleanName(name: string): string {
  return name.toUpperCase().replace(/<+/g, ' ').replace(/[^A-Z ]/g, '').replace(/\s+/g, ' ').trim();
}

export function trySplitMisreadChevron(name: string): string[] {
  const SEPARATOR_CHARS = new Set(['K', 'C', 'L', 'X']);
  const VOWELS = /[AEIOU]/;
  const IS_VOWEL = new Set(['A', 'E', 'I', 'O', 'U']);

  for (let i = 4; i < name.length - 3; i++) {
    if (SEPARATOR_CHARS.has(name[i])) {
      const left = name.substring(0, i);
      const right = name.substring(i + 1);

      const charBefore = name[i - 1];
      if (!IS_VOWEL.has(charBefore)) continue;

      if (left.length >= 4 && right.length >= 3 && VOWELS.test(left) && VOWELS.test(right)) {
        return [left, ...trySplitMisreadChevron(right)];
      }
    }
  }

  return [name];
}

export function recoverGivenNames(rawGivenNames: string): string {
  const fragments = rawGivenNames.split(/<+/).filter(Boolean);

  const result: string[] = [];
  for (const frag of fragments) {
    const cleaned = frag.replace(/[^A-Z]/g, '');
    if (cleaned.length >= 7) {
      result.push(...trySplitMisreadChevron(cleaned));
    } else if (cleaned.length > 0) {
      result.push(cleaned);
    }
  }

  return result.map(n => cleanName(n)).filter(Boolean).join(' ');
}

export function findCountryCodeAnchor(line2: string): number {
  const range = line2.substring(7, 16);
  
  for (const code of Object.keys(COUNTRY_MAP)) {
    const idx = range.indexOf(code);
    if (idx !== -1) {
      return 7 + idx;
    }
  }
  
  const match = range.match(/[A-Z]{3}/);
  if (match && match.index !== undefined) {
    return 7 + match.index;
  }
  
  return 10;
}

export function parseGender(char: string): string {
  if (!char) return '';
  const c = char.toUpperCase();
  if (c === 'M' || c === 'N' || c === 'H' || c === '1') return 'Male';
  if (c === 'F' || c === 'E' || c === 'P' || c === 'R' || c === 'K' || c === '7') return 'Female';
  return '';
}

export function parseGenderFromText(text: string): string {
  if (!text) return '';
  const cleaned = text.toUpperCase().trim();
  
  if (cleaned.includes('F') || cleaned.includes('E') || cleaned.includes('P') || cleaned.includes('R') || cleaned.includes('K')) return 'Female';
  if (cleaned.includes('M') || cleaned.includes('N') || cleaned.includes('H')) return 'Male';
  
  for (const char of cleaned) {
    const g = parseGender(char);
    if (g) return g;
  }
  
  return '';
}

export function extractDatesAndGender(rest: string): { dateOfBirth: string, gender: string, dateOfExpiry: string } {
  const candidates: { dateStr: string; rawIndex: number; formattedDate: string }[] = [];
  
  for (let i = 0; i <= rest.length - 6; i++) {
    const sub = rest.substring(i, i + 6);
    const formatted = formatDate(sub);
    if (formatted) {
      const last = candidates[candidates.length - 1];
      if (last && i < last.rawIndex + 6) {
        continue;
      }
      candidates.push({
        dateStr: sub,
        rawIndex: i,
        formattedDate: formatted,
      });
    }
  }
  
  let dateOfBirth = '';
  let dateOfExpiry = '';
  let gender = '';
  
  if (candidates.length >= 2) {
    dateOfBirth = candidates[0].formattedDate;
    dateOfExpiry = candidates[1].formattedDate;
    
    const betweenText = rest.substring(candidates[0].rawIndex + 6, candidates[1].rawIndex);
    gender = parseGenderFromText(betweenText);
    
    if (!gender && candidates[1].rawIndex > 0) {
      const charBefore = rest[candidates[1].rawIndex - 1];
      gender = parseGender(charBefore);
    }
  } else if (candidates.length === 1) {
    dateOfBirth = candidates[0].formattedDate;
    gender = parseGenderFromText(rest);
  }
  
  return { dateOfBirth, gender, dateOfExpiry };
}
