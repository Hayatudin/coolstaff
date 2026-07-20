import crypto from 'crypto';

const ALGORITHM = 'aes-256-ctr';
// Use DATABASE_URL as the key seed, falling back to a hardcoded string
const SECRET_KEY = crypto.scryptSync(process.env.DATABASE_URL || 'coolstaff-super-secure-key-1234567890', 'salt', 32);
const IV = Buffer.alloc(16, 0); // Deterministic static IV for consistent URL paths

const encryptionCache = new Map<string, string>();

/**
 * Encrypt a plain file path to an obfuscated hex token prefixed with "ENC-"
 */
export function encryptPath(plainText: string | null | undefined): string {
  if (!plainText) return '';
  if (plainText.startsWith('ENC-') || plainText.startsWith('http') || plainText.startsWith('data:')) return plainText;

  if (encryptionCache.has(plainText)) {
    return encryptionCache.get(plainText)!;
  }

  try {
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, IV);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const result = 'ENC-' + encrypted.toString('hex');
    encryptionCache.set(plainText, result);
    return result;
  } catch (err) {
    console.error('[CRYPTO] Encryption failed:', err);
    return plainText;
  }
}

const decryptionCache = new Map<string, string>();

/**
 * Decrypt an "ENC-" hex token back to the original plain file path
 */
export function decryptPath(encryptedText: string | null | undefined): string {
  if (!encryptedText) return '';
  if (!encryptedText.startsWith('ENC-')) return encryptedText;

  if (decryptionCache.has(encryptedText)) {
    return decryptionCache.get(encryptedText)!;
  }

  try {
    const hex = encryptedText.substring(4);
    const encryptedBuffer = Buffer.from(hex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, IV);
    const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
    const result = decrypted.toString('utf8');
    decryptionCache.set(encryptedText, result);
    return result;
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
