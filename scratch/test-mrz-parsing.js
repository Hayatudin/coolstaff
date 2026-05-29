const COUNTRY_MAP = {
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

function preprocessOcrLine(raw) {
  let cleaned = raw.toUpperCase();
  cleaned = cleaned.replace(/[\/\\|:;(),.\[\]{}?_\-+=~—«»]/g, '<');
  cleaned = cleaned.replace(/[^A-Z0-9<]/g, '<');
  return cleaned;
}

function mrzScore(raw) {
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

function findMrzLines(text) {
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  const scored = lines.map((line, index) => ({ 
    line, 
    index, 
    score: mrzScore(line), 
    cleaned: preprocessOcrLine(line) 
  })).filter(s => s.score > 10);
  
  scored.sort((a, b) => b.score - a.score);

  console.log('Scored Lines:', scored);

  for (const l1 of scored) {
    let c1 = l1.cleaned.replace(/^[^A-Z0-9<]+/, '');
    const isLine1 = c1.startsWith('P') || 
                    (c1.includes('<<') && ['F', 'R', 'D', 'O', 'B', '0', '<'].includes(c1[0])) ||
                    (c1.length >= 40 && ['F', 'R', 'D', 'O', 'B', '0', '<'].includes(c1[0]) && (c1.match(/</g) || []).length > 15);

    console.log(`Checking l1: "${l1.line}" -> isLine1 = ${isLine1}`);
    if (!isLine1) continue;

    if (!c1.startsWith('P')) {
      c1 = 'P' + c1.substring(1);
    }

    for (const l2 of scored) {
      if (l2.index <= l1.index) continue;
      let c2 = l2.cleaned.replace(/^[^A-Z0-9<]+/, '');
      const digitsCount = (c2.match(/\d/g) || []).length;
      console.log(`  Checking l2: "${l2.line}" -> digitsCount = ${digitsCount}`);
      if (digitsCount >= 5) {
        c1 = c1.replace(/<+[A-Z]?<+/g, '<<');
        const line1 = c1.padEnd(44, '<').substring(0, 44);
        const line2 = c2.padEnd(44, '<').substring(0, 44);
        return [line1, line2];
      }
    }
  }

  return null;
}

const rawOcr = `Bo un me a ee i id 0 som
g
]
= = Ca / Pc As = 2 = =o
Peel : = AH Peg $=. oS hi i
—_— ee —
9 3 3 i : “ wt Passport No.
PQ ETH EQ1583877
0*1/BUSA
at o a
a LVN S0YDEGENESH YASIN 2:
r DF Nanonality 27 Sex Ar & Personal No
ETHIOPIAN F
A PreAR #Y/Dae of Birth PMDAL AF Place of Birth
9g Le Pad bh 28 JAN 03 DAMOT SORE
» 23 JUL 25 2 JUL 30
ps
8 MAIN DEPARTMENT FOR IMMIGRATION AND NATIONALITY AFFAIRS
ERE RAR RB a
er REE RE RE
/ nA dA SERN Cd Ts
J WIRE RC Ls Re Rap fe
snl es
PQETHBUSA<<DEGENESH<YASINK<KK<<LLLLLLLLLLLLLL
EQ15838773ETH0301280F30072280<<<<<<<<<<<<<06
= Tee
ee ee A EE Cat Bess LE`;

console.log('Result:', findMrzLines(rawOcr));
