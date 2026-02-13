'use client';

import { useState, useRef, useCallback, useEffect, type KeyboardEvent, type ClipboardEvent } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { VOTE_CODE_LENGTH, VOTE_CODE_CHARSET } from '@/constants';

export interface CodeInputProps {
  onComplete: (code: string) => void;
  disabled?: boolean;
  error?: string | null;
  success?: boolean;
}

export function CodeInput({ onComplete, disabled = false, error = null, success = false }: CodeInputProps) {
  const [values, setValues] = useState<string[]>(Array(VOTE_CODE_LENGTH).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const isValidChar = useCallback((char: string): boolean => {
    return VOTE_CODE_CHARSET.includes(char.toUpperCase());
  }, []);

  const handleChange = useCallback(
    (index: number, value: string) => {
      if (disabled || success) return;

      const char = value.slice(-1).toUpperCase();
      if (!char) return;
      if (!isValidChar(char)) return;

      const newValues = [...values];
      newValues[index] = char;
      setValues(newValues);

      if (index < VOTE_CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      if (newValues.every((v) => v !== '')) {
        onComplete(newValues.join(''));
      }
    },
    [values, disabled, success, isValidChar, onComplete]
  );

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (disabled || success) return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        const newValues = [...values];
        if (newValues[index]) {
          newValues[index] = '';
          setValues(newValues);
        } else if (index > 0) {
          newValues[index - 1] = '';
          setValues(newValues);
          inputRefs.current[index - 1]?.focus();
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else if (e.key === 'ArrowRight' && index < VOTE_CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [values, disabled, success]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      if (disabled || success) return;

      e.preventDefault();
      const pasted = e.clipboardData
        .getData('text')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, VOTE_CODE_LENGTH);

      if (pasted.length === 0) return;

      const validChars = pasted.split('').filter(isValidChar);
      const newValues = [...values];

      validChars.forEach((char, i) => {
        if (i < VOTE_CODE_LENGTH) {
          newValues[i] = char;
        }
      });

      setValues(newValues);

      const nextEmpty = newValues.findIndex((v) => v === '');
      if (nextEmpty >= 0) {
        inputRefs.current[nextEmpty]?.focus();
      } else {
        inputRefs.current[VOTE_CODE_LENGTH - 1]?.focus();
        onComplete(newValues.join(''));
      }
    },
    [values, disabled, success, isValidChar, onComplete]
  );

  const getBorderColor = () => {
    if (success) return 'border-green-500 bg-green-50';
    if (error) return 'border-red-400 bg-red-50';
    return 'border-gray-300 bg-white focus-within:border-blue-500';
  };

  return (
    <div className="flex flex-col items-center">
      <motion.div
        className="flex gap-2 sm:gap-3"
        animate={error ? { x: [0, -8, 8, -8, 8, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        {Array.from({ length: VOTE_CODE_LENGTH }).map((_, index) => (
          <div key={index} className="relative">
            <input
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="text"
              maxLength={1}
              value={values[index]}
              disabled={disabled || success}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              onFocus={(e) => e.target.select()}
              className={`
                h-14 w-14 rounded-xl border-2 text-center text-[28px] font-bold
                uppercase transition-all duration-200 outline-none
                focus:ring-2 focus:ring-blue-200
                disabled:cursor-not-allowed disabled:opacity-60
                ${getBorderColor()}
              `}
              aria-label={`투표 코드 ${index + 1}번째 자리`}
            />
            {success && index === VOTE_CODE_LENGTH - 1 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-500"
              >
                <Check className="h-4 w-4 text-white" strokeWidth={3} />
              </motion.div>
            )}
          </div>
        ))}
      </motion.div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-sm font-medium text-red-500"
        >
          {error}
        </motion.p>
      )}

      {success && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-sm font-medium text-green-600"
        >
          투표 코드가 확인되었어요!
        </motion.p>
      )}

      {!error && !success && (
        <p className="mt-3 text-sm text-gray-500">
          알파벳과 숫자 6자리를 입력해주세요
        </p>
      )}
    </div>
  );
}
