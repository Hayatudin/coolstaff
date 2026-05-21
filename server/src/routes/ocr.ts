import { Router, Request, Response } from 'express';

const router = Router();

const COUNTRY_MAP: Record<string, string> = {
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

function cleanNumericString(raw: string): string {
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

function formatDate(raw: string): string {
  const cleaned = cleanNumericString(raw).substring(0, 6);
  if (cleaned.length !== 6) return '';
  const year = parseInt(cleaned.substring(0, 2));
  const month = parseInt(cleaned.substring(2, 4));
  const day = parseInt(cleaned.substring(4, 6));
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || isNaN(day) || day < 1 || day > 31) return '';
  const fullYear = year > 30 ? 1900 + year : 2000 + year;
  return `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function preprocessOcrLine(raw: string): string {
  // Convert to uppercase
  let cleaned = raw.toUpperCase();
  
  // Replace common chevron misreads with '<'
  cleaned = cleaned.replace(/[\/\\|:;(),.\[\]{}?_\-+=~—«»]/g, '<');
  
  // Replace any other non-alphanumeric, non-chevron characters with '<'
  cleaned = cleaned.replace(/[^A-Z0-9<]/g, '<');
  
  return cleaned;
}

function normalizeLine(raw: string): string {
  let cleaned = preprocessOcrLine(raw);
  // Ensure we preserve the double chevron separator '<<' if it was partially corrupted
  cleaned = cleaned.replace(/<+[A-Z]?<+/g, '<<');
  return cleaned.padEnd(44, '<').substring(0, 44);
}

function mrzScore(raw: string): number {
  // If it has non-ASCII characters (like Amharic, Arabic, etc.), it is 100% a passport label and not an MRZ line
  if (/[^\x00-\x7F]/.test(raw)) return 0;

  // Allowing some lowercase letters but not excessive
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

  // Check if first characters look like passport start 'P'
  const firstChar = preprocessed.trim().replace(/^[^A-Z0-9<]+/, '')[0];
  if (firstChar === 'P') {
    score += 50;
  } else if (['F', 'R', 'D', 'O', 'B'].includes(firstChar)) {
    score += 20; // potential misread P
  }

  if (/REPUBLIC|PASSPORT|FEDERAL|GIVEN|SURNAME|NAMES|DATE|BIRTH|EXPIRY|NATIONAL/i.test(raw)) {
    score -= 60;
  }

  return score;
}

function findMrzLines(text: string): [string, string] | null {
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

    // Force start with 'P'
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

  // Fallback: search for any two lines close to 44 chars
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

function cleanName(name: string): string {
  return name.replace(/<+/g, ' ').replace(/[^A-Z ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}

function findCountryCodeAnchor(line2: string): number {
  const range = line2.substring(7, 16); // Look in a safe window
  
  // 1. Search for any known country code from COUNTRY_MAP
  for (const code of Object.keys(COUNTRY_MAP)) {
    const idx = range.indexOf(code);
    if (idx !== -1) {
      return 7 + idx;
    }
  }
  
  // 2. Fallback: Search for any 3-letter uppercase alphabetic sequence
  const match = range.match(/[A-Z]{3}/);
  if (match && match.index !== undefined) {
    return 7 + match.index;
  }
  
  // 3. Absolute fallback: standard index 10
  return 10;
}

function parseGender(char: string): string {
  if (!char) return '';
  const c = char.toUpperCase();
  if (c === 'M' || c === 'N' || c === 'H' || c === '1') return 'Male';
  if (c === 'F' || c === 'E' || c === 'P' || c === 'R' || c === 'K' || c === '7') return 'Female';
  return '';
}

function parseGenderFromText(text: string): string {
  if (!text) return '';
  const cleaned = text.toUpperCase().trim();
  
  // Female indicators
  if (cleaned.includes('F') || cleaned.includes('E') || cleaned.includes('P') || cleaned.includes('R') || cleaned.includes('K')) return 'Female';
  // Male indicators
  if (cleaned.includes('M') || cleaned.includes('N') || cleaned.includes('H')) return 'Male';
  
  // Check any individual character using the robust single-character mapper
  for (const char of cleaned) {
    const g = parseGender(char);
    if (g) return g;
  }
  
  return '';
}

function extractDatesAndGender(rest: string): { dateOfBirth: string, gender: string, dateOfExpiry: string } {
  const candidates: { dateStr: string; rawIndex: number; formattedDate: string }[] = [];
  
  // Scan the string from left to right to find all 6-character valid date candidates
  for (let i = 0; i <= rest.length - 6; i++) {
    const sub = rest.substring(i, i + 6);
    const formatted = formatDate(sub);
    if (formatted) {
      // Prevent overlapping matches
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
    
    // Extract the gender from the text between the two dates
    const betweenText = rest.substring(candidates[0].rawIndex + 6, candidates[1].rawIndex);
    gender = parseGenderFromText(betweenText);
    
    // If gender is still empty, fallback to checking the character immediately before the second date
    if (!gender && candidates[1].rawIndex > 0) {
      const charBefore = rest[candidates[1].rawIndex - 1];
      gender = parseGender(charBefore);
    }
  } else if (candidates.length === 1) {
    dateOfBirth = candidates[0].formattedDate;
    // Fallback: look for gender in the rest of the string
    gender = parseGenderFromText(rest);
  }
  
  return { dateOfBirth, gender, dateOfExpiry };
}

router.post('/passport', async (req: Request, res: Response) => {
  try {
    const { ocrText } = req.body;
    if (!ocrText) return res.status(400).json({ error: 'No OCR text provided' });
    const mrz = findMrzLines(ocrText);
    if (!mrz) return res.status(422).json({ error: 'MRZ not detected' });
    const [line1, line2] = mrz;
    const issuingCountry = line1.substring(2, 5).replace(/</g, '');
    const parts = line1.substring(5).split('<<');
    const surname = cleanName(parts[0] || '');
    const givenNames = cleanName(parts[1] || '');
    
    // Dynamically anchor parser fields based on nationality country code position to make it resilient to character insertion/deletion shifts
    const anchorIdx = findCountryCodeAnchor(line2);
    let passportNumber = line2.substring(0, anchorIdx).replace(/</g, '');
    if (passportNumber.length > 9) {
      passportNumber = passportNumber.substring(0, 9);
    }
    const nationality = line2.substring(anchorIdx, anchorIdx + 3).replace(/</g, '');
    
    // Use the extremely robust layout-independent dates and gender extraction scanner on the rest of the MRZ line
    const restOfLine = line2.substring(anchorIdx + 3);
    const { dateOfBirth, gender, dateOfExpiry } = extractDatesAndGender(restOfLine);
    
    const result = {
      passportNumber,
      surname,
      givenNames,
      dateOfBirth,
      gender,
      nationality: COUNTRY_MAP[nationality || issuingCountry] || nationality || issuingCountry,
      dateOfExpiry,
    };
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to parse passport' });
  }
});

export default router;
