import { NextResponse } from 'next/server';

// ============================================================
// STRICT MRZ TD3 PARSER — ICAO 9303 STANDARD (FIXED VERSION)
// ============================================================

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

// ================= DATE =================
function cleanDateRaw(raw: string): string {
  if (!raw) return '';

  return raw
    .toUpperCase()
    .replace(/O/g, '0')
    .replace(/I/g, '1')
    .replace(/Z/g, '2')
    .replace(/[^0-9]/g, '')   // keep ONLY digits
    .substring(0, 6);         // ensure max 6 chars
}

function formatDate(raw: string): string {
  const cleaned = cleanDateRaw(raw);

  if (cleaned.length !== 6) return '';

  const year = parseInt(cleaned.substring(0, 2));
  const month = parseInt(cleaned.substring(2, 4));
  const day = parseInt(cleaned.substring(4, 6));

  if (
    isNaN(year) ||
    isNaN(month) || month < 1 || month > 12 ||
    isNaN(day) || day < 1 || day > 31
  ) return '';

  const fullYear = year > 30 ? 1900 + year : 2000 + year;

  return `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ================= NORMALIZE MRZ =================
function normalizeLine(raw: string): string {
  let cleaned = raw.toUpperCase();

  // Remove spaces and invalid chars ONLY
  cleaned = cleaned
    .replace(/ /g, '')
    .replace(/[^A-Z0-9<]/g, '');

  // Fix broken separators like <K< → <<
  cleaned = cleaned.replace(/<+[A-Z]?<+/g, '<<');

  // DO NOT replace letters like L or I anymore

  if (cleaned.length >= 44) return cleaned.substring(0, 44);
  return cleaned.padEnd(44, '<');
}

// ================= SCORE MRZ =================
function mrzScore(raw: string): number {
  const cleaned = raw.replace(/[^A-Z0-9<]/gi, '').toUpperCase();
  let score = 0;

  const len = cleaned.length;
  if (len >= 40 && len <= 48) score += 30;
  else if (len >= 35 && len <= 52) score += 10;
  else return 0;

  const brackets = (cleaned.match(/</g) || []).length;
  score += Math.min(brackets * 3, 30);

  const digits = (cleaned.match(/\d/g) || []).length;
  score += Math.min(digits * 2, 20);

  if (/REPUBLIC|PASSPORT|FEDERAL/i.test(raw)) score -= 50;

  return score;
}

// ================= FIND MRZ =================
function findMrzLines(text: string): [string, string] | null {
  const rawLines = text.split(/\n/).map(l => l.trim()).filter(Boolean);

  const scored = rawLines.map((line, index) => ({
    line,
    index,
    score: mrzScore(line),
    cleaned: line.replace(/[^A-Z0-9<]/gi, '').toUpperCase(),
  })).filter(s => s.score > 0);

  for (const l1 of scored.sort((a, b) => b.score - a.score)) {
    if (!l1.cleaned.startsWith('P')) continue;

    for (const l2 of scored) {
      if (l2.index <= l1.index) continue;

      const digitCount = (l2.cleaned.match(/\d/g) || []).length;
      if (digitCount >= 6) {
        const line1 = normalizeLine(l1.cleaned);
        const line2 = normalizeLine(l2.cleaned);

        if (line1.length === 44 && line2.length === 44) {
          return [line1, line2];
        }
      }
    }
  }

  return null;
}


// ================= CLEAN NAME =================
function cleanName(name: string): string {
  if (!name) return '';

  return name
    .replace(/<+/g, ' ')        // MRZ padding → space
    .replace(/[^A-Z ]/g, '')    // remove OCR garbage only
    .replace(/\s+/g, ' ')
    .trim();
}

// ================= API =================
export async function POST(request: Request) {
  try {
    const { ocrText } = await request.json();

    if (!ocrText || typeof ocrText !== 'string') {
      return NextResponse.json({ error: 'No OCR text provided' }, { status: 400 });
    }

    const mrz = findMrzLines(ocrText);

    if (!mrz) {
      return NextResponse.json(
        { error: 'MRZ not detected. Use clearer passport image.' },
        { status: 422 }
      );
    }

    const [line1, line2] = mrz;

    // ================= LINE 1 =================
    const issuingCountry = line1.substring(2, 5).replace(/</g, '');
    const nameField = line1.substring(5);
    const parts = nameField.split('<<');

    // SURNAME
    let surname = cleanName(parts[0] || '');

    // GIVEN NAMES
    let givenNames = '';

    if (parts.length > 1) {
      givenNames = cleanName(parts[1]);
    }

    // FINAL FORMAT
    surname = surname.toUpperCase();
    givenNames = givenNames.toUpperCase();
    // Prevent garbage like CLLLL
    if (/^(.)\1{3,}$/.test(givenNames.replace(/\s/g, ''))) {
      givenNames = '';
    }

    // ================= LINE 2 =================
    const passportNumber = line2.substring(0, 9).replace(/</g, '');
    const nationality = line2.substring(10, 13).replace(/</g, '');
    const dobRaw = line2.substring(13, 19).replace(/</g, '');
    const genderRaw = line2[20];
    const expiryRaw = line2.substring(21, 27).replace(/</g, '');

    const gender =
      genderRaw === 'M' ? 'Male' :
        genderRaw === 'F' ? 'Female' : '';

    const dateOfBirth = formatDate(dobRaw);
    const dateOfExpiry = formatDate(expiryRaw);

    const natCode = nationality || issuingCountry;
    const nationalityFull = COUNTRY_MAP[natCode] || natCode;

    // ================= FINAL RESULT =================
    const result = {
      passportNumber,
      surname: surname.toUpperCase(),
      givenNames: givenNames.toUpperCase(),
      dateOfBirth,
      gender,
      nationality: nationalityFull,
      dateOfExpiry,
    };

    return NextResponse.json(result);

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to parse passport' },
      { status: 500 }
    );
  }
}