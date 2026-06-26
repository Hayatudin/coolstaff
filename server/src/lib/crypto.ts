import crypto from 'crypto';

const ALGORITHM = 'aes-256-ctr';
// Use DATABASE_URL as the key seed, falling back to a hardcoded string
const SECRET_KEY = crypto.scryptSync(process.env.DATABASE_URL || 'coolstaff-super-secure-key-1234567890', 'salt', 32);
const IV = Buffer.alloc(16, 0); // Deterministic static IV for consistent URL paths

/**
 * Encrypt a plain file path to an obfuscated hex token prefixed with "ENC-"
 */
export function encryptPath(plainText: string | null | undefined): string {
  if (!plainText) return '';
  if (plainText.startsWith('ENC-') || plainText.startsWith('http') || plainText.startsWith('data:')) return plainText;

  try {
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, IV);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    return 'ENC-' + encrypted.toString('hex');
  } catch (err) {
    console.error('[CRYPTO] Encryption failed:', err);
    return plainText;
  }
}

/**
 * Decrypt an "ENC-" hex token back to the original plain file path
 */
export function decryptPath(encryptedText: string | null | undefined): string {
  if (!encryptedText) return '';
  if (!encryptedText.startsWith('ENC-')) return encryptedText;

  try {
    const hex = encryptedText.substring(4);
    const encryptedBuffer = Buffer.from(hex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, IV);
    const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('[CRYPTO] Decryption failed:', err);
    return encryptedText;
  }
}

/**
 * Helper to strip the API prefix and decrypt if needed
 */
export function sanitizeIncomingPath(val: string | null | undefined): string {
  if (!val) return '';
  let clean = val.trim();
  
  // Strip baseUrl / assets prefix if present
  if (clean.includes('/api/assets/')) {
    clean = clean.split('/api/assets/')[1] || clean;
  }
  
  if (clean.startsWith('ENC-')) {
    return decryptPath(clean);
  }
  
  return clean;
}
