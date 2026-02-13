'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, KeyRound, QrCode, Keyboard } from 'lucide-react';
import toast from 'react-hot-toast';

import { Suspense } from 'react';
import { CodeInput } from '@/components/vote/CodeInput';
import { Spinner } from '@/components/ui/Spinner';
import { VOTE_CODE_LENGTH } from '@/constants';
import { hashVoteCode, validateCodeFormat } from '@/lib/voteCode';
import { getVoterCodeByHash } from '@/lib/firestore';

type InputMode = 'code' | 'qr';

function VoteCodePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('code');
  const qrReaderRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<unknown>(null);

  // Check for pre-filled code from QR scan URL
  const prefilledCode = searchParams.get('code');

  const validateAndNavigate = useCallback(
    async (code: string) => {
      const normalizedCode = code.toUpperCase().trim();

      if (!validateCodeFormat(normalizedCode)) {
        const msg = '투표 코드 형식이 올바르지 않아요. 다시 확인해주세요.';
        setError(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const codeHash = hashVoteCode(normalizedCode);
        const voterCode = await getVoterCodeByHash(codeHash);

        if (!voterCode) {
          const msg = '투표 코드가 올바르지 않아요. 다시 확인해주세요.';
          setError(msg);
          toast.error(msg);
          setLoading(false);
          return;
        }

        if (voterCode.used) {
          const msg = '이미 사용된 투표 코드예요. 하나의 코드로 한 번만 투표할 수 있어요.';
          setError(msg);
          toast.error(msg);
          setLoading(false);
          return;
        }

        setSuccess(true);
        toast.success('투표 코드가 확인되었어요!');

        setTimeout(() => {
          router.push(
            `/vote/ballot?code=${encodeURIComponent(normalizedCode)}&electionId=${encodeURIComponent(voterCode.electionId)}`
          );
        }, 800);
      } catch {
        const msg = '코드 확인 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.';
        setError(msg);
        toast.error(msg);
        setLoading(false);
      }
    },
    [router]
  );

  // Auto-validate if code is provided via URL (from QR scan)
  useEffect(() => {
    if (prefilledCode && prefilledCode.length === VOTE_CODE_LENGTH) {
      validateAndNavigate(prefilledCode);
    }
  }, [prefilledCode, validateAndNavigate]);

  const handleCodeComplete = useCallback(
    async (code: string) => {
      if (code.length !== VOTE_CODE_LENGTH) return;
      await validateAndNavigate(code);
    },
    [validateAndNavigate]
  );

  // QR Scanner setup
  useEffect(() => {
    if (inputMode !== 'qr' || !qrReaderRef.current) return;

    let html5QrCode: { stop: () => Promise<void>; start: (config: unknown, options: unknown, onSuccess: (text: string) => void, onError: () => void) => Promise<void> } | null = null;
    let mounted = true;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!mounted) return;

        html5QrCode = new Html5Qrcode('qr-reader') as unknown as typeof html5QrCode;
        scannerRef.current = html5QrCode;

        await html5QrCode!.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            // Check if scanned text is a URL with code param
            try {
              const url = new URL(decodedText);
              const scannedCode = url.searchParams.get('code');
              if (scannedCode) {
                validateAndNavigate(scannedCode);
                return;
              }
            } catch {
              // Not a URL - treat as raw code
            }

            // Treat as raw vote code
            if (decodedText.length === VOTE_CODE_LENGTH && validateCodeFormat(decodedText)) {
              validateAndNavigate(decodedText);
            }
          },
          () => {
            // QR scan error (no code found in frame) - ignore
          }
        );
      } catch (err) {
        console.error('QR Scanner error:', err);
        if (mounted) {
          toast.error('카메라를 사용할 수 없어요. 코드를 직접 입력해주세요.');
          setInputMode('code');
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (html5QrCode) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [inputMode, validateAndNavigate]);

  // Stop scanner when switching away from QR mode
  const switchMode = useCallback(async (mode: InputMode) => {
    if (scannerRef.current) {
      const scanner = scannerRef.current as { stop: () => Promise<void> };
      try {
        await scanner.stop();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setInputMode(mode);
    setError(null);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-sky-50 to-white">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4">
        <a
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100"
          aria-label="홈으로 돌아가기"
        >
          <ArrowLeft className="h-5 w-5" />
        </a>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex w-full max-w-md flex-col items-center"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-100"
          >
            {inputMode === 'qr' ? (
              <QrCode className="h-10 w-10 text-blue-600" />
            ) : (
              <KeyRound className="h-10 w-10 text-blue-600" />
            )}
          </motion.div>

          {/* Title */}
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {inputMode === 'qr' ? 'QR 코드를 스캔하세요' : '투표 코드를 입력하세요'}
          </h1>
          <p className="mb-6 text-center text-sm text-gray-500">
            {inputMode === 'qr'
              ? '선생님이 나눠주신 종이의 QR 코드를 카메라로 비추세요'
              : '투표 코드는 선생님이 나눠주신 종이에 있어요'}
          </p>

          {/* Mode Toggle */}
          <div className="mb-6 flex w-full max-w-xs overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            <button
              onClick={() => switchMode('code')}
              className={`flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                inputMode === 'code'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Keyboard className="h-4 w-4" />
              코드 입력
            </button>
            <button
              onClick={() => switchMode('qr')}
              className={`flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                inputMode === 'qr'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <QrCode className="h-4 w-4" />
              QR 스캔
            </button>
          </div>

          {/* Input Area */}
          <AnimatePresence mode="wait">
            {inputMode === 'code' ? (
              <motion.div
                key="code-input"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <CodeInput
                  onComplete={handleCodeComplete}
                  disabled={loading}
                  error={error}
                  success={success}
                />
              </motion.div>
            ) : (
              <motion.div
                key="qr-scanner"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <div className="overflow-hidden rounded-2xl border-2 border-blue-200 bg-black">
                  <div
                    id="qr-reader"
                    ref={qrReaderRef}
                    className="aspect-square w-full"
                  />
                </div>
                {error && (
                  <p className="mt-3 text-center text-sm text-red-500">{error}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading indicator */}
          {loading && !success && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 flex items-center gap-2"
            >
              <Spinner size="sm" color="blue" />
              <span className="text-sm text-gray-500">
                투표 코드를 확인하고 있어요...
              </span>
            </motion.div>
          )}

          {/* Helper */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-10 rounded-xl bg-blue-50 px-5 py-4"
          >
            <h3 className="text-sm font-bold text-blue-800">
              투표 코드를 모르겠다면?
            </h3>
            <p className="mt-1 text-sm text-blue-600">
              선생님께 투표 코드가 적힌 종이를 받았는지 확인해보세요.
              종이를 잃어버렸다면 선생님께 말씀해주세요.
            </p>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}

export default function VoteCodePage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center"><Spinner size="lg" /></div>}>
      <VoteCodePageContent />
    </Suspense>
  );
}
