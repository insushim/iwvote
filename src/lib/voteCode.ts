import { VOTE_CODE_CHARSET, VOTE_CODE_LENGTH } from '@/constants';

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
