import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * Merge class names with clsx and tailwind-merge.
 * Handles conditional classes and resolves Tailwind conflicts.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a date to a localized Korean date string.
 *
 * @param date - Date object, timestamp number, or Firestore Timestamp.
 * @param formatStr - date-fns format string. Defaults to 'yyyy년 M월 d일'.
 * @returns Formatted date string.
 */
export function formatDate(
  date: Date | number | { toDate: () => Date },
  formatStr: string = 'yyyy년 M월 d일'
): string {
  const d = typeof date === 'object' && 'toDate' in date ? date.toDate() : new Date(date);
  return format(d, formatStr, { locale: ko });
}

/**
 * Format a date to a localized Korean time string.
 *
 * @param date - Date object, timestamp number, or Firestore Timestamp.
 * @param formatStr - date-fns format string. Defaults to 'a h시 mm분'.
 * @returns Formatted time string.
 */
export function formatTime(
  date: Date | number | { toDate: () => Date },
  formatStr: string = 'a h시 mm분'
): string {
  const d = typeof date === 'object' && 'toDate' in date ? date.toDate() : new Date(date);
  return format(d, formatStr, { locale: ko });
}

/**
 * Format a date as a relative time string (e.g., "3분 전").
 *
 * @param date - Date object, timestamp number, or Firestore Timestamp.
 * @returns Relative time string in Korean.
 */
export function formatRelativeTime(
  date: Date | number | { toDate: () => Date }
): string {
  const d = typeof date === 'object' && 'toDate' in date ? date.toDate() : new Date(date);
  return formatDistanceToNow(d, { addSuffix: true, locale: ko });
}

/**
 * Format a number as a percentage string.
 *
 * @param value - The ratio value (0 to 1) or raw percentage.
 * @param decimals - Number of decimal places. Defaults to 1.
 * @param isRatio - If true, value is treated as a ratio (0-1) and multiplied by 100.
 * @returns Formatted percentage string (e.g., "75.5%").
 */
export function formatPercentage(
  value: number,
  decimals: number = 1,
  isRatio: boolean = true
): string {
  const percentage = isRatio ? value * 100 : value;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Truncate a hash string for display purposes.
 *
 * @param hash - The full hash string.
 * @param startLen - Number of characters to show from the start. Defaults to 8.
 * @param endLen - Number of characters to show from the end. Defaults to 8.
 * @returns Truncated hash (e.g., "a1b2c3d4...e5f6g7h8").
 */
export function truncateHash(
  hash: string,
  startLen: number = 8,
  endLen: number = 8
): string {
  if (hash.length <= startLen + endLen + 3) {
    return hash;
  }
  return `${hash.slice(0, startLen)}...${hash.slice(-endLen)}`;
}

/**
 * Convert a classId string (e.g., "4-2") to a Korean label (e.g., "4학년 2반").
 *
 * @param classId - The class ID string in "grade-classNum" format.
 * @returns Korean label string.
 */
export function classIdToLabel(classId: string): string {
  const parts = classId.split('-');
  if (parts.length !== 2) {
    return classId;
  }
  const [grade, classNum] = parts;
  return `${grade}학년 ${classNum}반`;
}

/**
 * Sleep for the specified number of milliseconds.
 * Useful for debouncing, delays, and animation timing.
 *
 * @param ms - Duration in milliseconds.
 * @returns A promise that resolves after the delay.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
