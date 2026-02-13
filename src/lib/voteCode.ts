import CryptoJS from 'crypto-js';
import { VOTE_CODE_CHARSET, VOTE_CODE_LENGTH } from '@/constants';

const HMAC_SECRET = process.env.NEXT_PUBLIC_VOTE_HMAC_SECRET ?? '';

/**
 * Generate a random vote code using the safe character set.
 * Charset excludes confusing characters: 0/O, 1/I/L.
 *
 * @returns A 6-character uppercase alphanumeric code.
 */
export function generateVoteCode(): string {
  const randomValues = new Uint32Array(VOTE_CODE_LENGTH);
  crypto.getRandomValues(randomValues);

  let code = '';
  for (let i = 0; i < VOTE_CODE_LENGTH; i++) {
    const index = randomValues[i] % VOTE_CODE_CHARSET.length;
    code += VOTE_CODE_CHARSET[index];
  }

  return code;
}

/**
 * Compute an HMAC-SHA256 hash of a vote code for secure storage and verification.
 * The original code is never stored; only the hash is persisted.
 *
 * @param code - The plaintext vote code.
 * @param secret - Optional custom HMAC secret. Falls back to env variable.
 * @returns The hex-encoded HMAC-SHA256 hash.
 */
export function hashVoteCode(code: string, secret?: string): string {
  const hmacSecret = secret ?? HMAC_SECRET;

  if (!hmacSecret) {
    throw new Error('HMAC secret is not configured. Set NEXT_PUBLIC_VOTE_HMAC_SECRET.');
  }

  const normalizedCode = code.toUpperCase().trim();
  return CryptoJS.HmacSHA256(normalizedCode, hmacSecret).toString(CryptoJS.enc.Hex);
}

/**
 * Validate that a vote code matches the expected format.
 *
 * @param code - The vote code to validate.
 * @returns true if the code is exactly 6 characters from the valid charset.
 */
export function validateCodeFormat(code: string): boolean {
  if (typeof code !== 'string') {
    return false;
  }

  const normalizedCode = code.toUpperCase().trim();

  if (normalizedCode.length !== VOTE_CODE_LENGTH) {
    return false;
  }

  for (let i = 0; i < normalizedCode.length; i++) {
    if (!VOTE_CODE_CHARSET.includes(normalizedCode[i])) {
      return false;
    }
  }

  return true;
}
