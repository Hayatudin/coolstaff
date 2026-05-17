const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
  'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

function convertChunk(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  return ones[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 ? ' ' + convertChunk(n % 100) : '');
}

export function numberToWords(amount: number): string {
  if (amount === 0) return 'ZERO DOLLARS ONLY';

  const num = Math.floor(Math.abs(amount));
  const parts: string[] = [];

  if (num >= 1_000_000) {
    parts.push(convertChunk(Math.floor(num / 1_000_000)) + ' MILLION');
  }
  const thousands = Math.floor((num % 1_000_000) / 1000);
  if (thousands > 0) {
    parts.push(convertChunk(thousands) + ' THOUSAND');
  }
  const remainder = num % 1000;
  if (remainder > 0) {
    parts.push(convertChunk(remainder));
  }

  return parts.join(' ') + ' DOLLARS ONLY';
}
