import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_VOTE_ENCRYPTION_KEY ?? '';

/**
 * Encrypt vote data using AES-256.
 * Uses CBC mode with PKCS7 padding (crypto-js defaults).
 *
 * @param data - The plaintext vote data to encrypt.
 * @param key - Optional custom encryption key. Falls back to env variable.
 * @returns The encrypted ciphertext string.
 */
export function encryptVote(data: string, key?: string): string {
  const encryptionKey = key ?? ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('Encryption key is not configured. Set NEXT_PUBLIC_VOTE_ENCRYPTION_KEY.');
  }

  const keyHash = CryptoJS.SHA256(encryptionKey);
  const iv = CryptoJS.lib.WordArray.random(16);

  const encrypted = CryptoJS.AES.encrypt(data, keyHash, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const ivHex = iv.toString(CryptoJS.enc.Hex);
  const ciphertextHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);

  return `${ivHex}:${ciphertextHex}`;
}

/**
 * Decrypt vote data using AES-256.
 *
 * @param encryptedData - The encrypted ciphertext string (iv:ciphertext format).
 * @param key - Optional custom encryption key. Falls back to env variable.
 * @returns The decrypted plaintext string.
 */
export function decryptVote(encryptedData: string, key?: string): string {
  const encryptionKey = key ?? ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('Encryption key is not configured. Set NEXT_PUBLIC_VOTE_ENCRYPTION_KEY.');
  }

  const parts = encryptedData.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted data format. Expected "iv:ciphertext".');
  }

  const [ivHex, ciphertextHex] = parts;
  const keyHash = CryptoJS.SHA256(encryptionKey);
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const ciphertext = CryptoJS.enc.Hex.parse(ciphertextHex);

  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext,
  });

  const decrypted = CryptoJS.AES.decrypt(cipherParams, keyHash, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const plaintext = decrypted.toString(CryptoJS.enc.Utf8);

  if (!plaintext) {
    throw new Error('Decryption failed. Invalid key or corrupted data.');
  }

  return plaintext;
}

/**
 * Compute a SHA-256 hash of the given data.
 *
 * @param data - The data to hash.
 * @returns The hex-encoded SHA-256 hash string.
 */
export function hashData(data: string): string {
  return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
}
