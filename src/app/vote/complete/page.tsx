'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { VoteReceipt } from '@/components/vote/VoteReceipt';
import { VOTE_COMPLETE_REDIRECT_MS } from '@/constants';
import type { VoteReceipt as VoteReceiptType } from '@/types';

/* Confetti particle component */
function ConfettiParticle({ delay, x }: { delay: number; x: number }) {
  const colors = ['#3B82F6', '#22C55E', '#F59E0B', '#EC4899', '#8B5CF6'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const size = 6 + Math.random() * 6;

  return (
    <motion.div
      className="pointer-events-none absolute rounded-sm"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        left: `${x}%`,
        top: -10,
      }}
      initial={{ opacity: 1, y: 0, rotate: 0 }}
      animate={{
        opacity: [1, 1, 0],
        y: [0, 400 + Math.random() * 300],
        x: [0, (Math.random() - 0.5) * 150],
        rotate: [0, Math.random() * 720 - 360],
      }}
      transition={{
        duration: 2.5 + Math.random() * 1.5,
        delay: delay,
        ease: 'easeOut',
      }}
    />
  );
}

function VoteCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(VOTE_COMPLETE_REDIRECT_MS / 1000);

  const receipt = useMemo<VoteReceiptType | null>(() => {
    const receiptParam = searchParams.get('receipt');
    if (!receiptParam) return null;
    try {
      return JSON.parse(decodeURIComponent(receiptParam)) as VoteReceiptType;
    } catch {
      return null;
    }
  }, [searchParams]);

  // Countdown and auto-redirect
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.push('/vote');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [router]);

  // Generate confetti particles
  const confettiParticles = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      delay: Math.random() * 0.8,
      x: Math.random() * 100,
    }));
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-sky-50 to-white px-4 py-8">
      {/* Confetti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {confettiParticles.map((p) => (
          <ConfettiParticle key={p.id} delay={p.delay} x={p.x} />
        ))}
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        {/* Checkmark animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          className="mb-6"
        >
          <div className="relative">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex h-24 w-24 items-center justify-center rounded-full bg-green-500 shadow-lg shadow-green-200"
            >
              <motion.svg
                className="h-12 w-12 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <motion.path
                  d="M5 13l4 4L19 7"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                />
              </motion.svg>
            </motion.div>

            {/* Ring pulse effect */}
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-green-300"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
            />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-2xl font-bold text-gray-900"
        >
          투표가 완료되었습니다!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-2 text-sm text-gray-500"
        >
          소중한 한 표를 행사해주셔서 감사합니다
        </motion.p>

        {/* Receipt */}
        {receipt && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-6 w-full"
          >
            <VoteReceipt receipt={receipt} />
          </motion.div>
        )}

        {/* Next student message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6 rounded-xl bg-amber-50 px-5 py-3.5 text-center"
        >
          <p className="text-sm font-medium text-amber-800">
            다음 학생이 투표해주세요
          </p>
          <p className="mt-1 text-xs text-amber-600">
            {countdown}초 후에 자동으로 처음 화면으로 돌아가요
          </p>
        </motion.div>

        {/* Home button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-6"
        >
          <Link href="/vote">
            <Button
              variant="outline"
              size="lg"
              iconLeft={<Home className="h-4 w-4" />}
            >
              처음으로
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

export default function VoteCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-sky-50 to-white">
          <Spinner size="lg" color="blue" />
        </div>
      }
    >
      <VoteCompleteContent />
    </Suspense>
  );
}
