'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { CodeInput } from '@/components/vote/CodeInput';
import { Spinner } from '@/components/ui/Spinner';
import { VOTE_CODE_LENGTH } from '@/constants';

export default function VoteCodePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleCodeComplete = useCallback(
    async (code: string) => {
      if (code.length !== VOTE_CODE_LENGTH) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/vote/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          const errorMessage =
            data.error || '투표 코드가 올바르지 않아요. 다시 확인해주세요.';
          setError(errorMessage);
          toast.error(errorMessage);
          setLoading(false);
          return;
        }

        setSuccess(true);
        toast.success('투표 코드가 확인되었어요!');

        setTimeout(() => {
          router.push(
            `/vote/ballot?code=${encodeURIComponent(code)}&electionId=${encodeURIComponent(data.electionId)}`
          );
        }, 800);
      } catch {
        const errorMessage =
          '서버에 연결할 수 없어요. 인터넷 연결을 확인해주세요.';
        setError(errorMessage);
        toast.error(errorMessage);
        setLoading(false);
      }
    },
    [router]
  );

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-sky-50 to-white">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100"
          aria-label="홈으로 돌아가기"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
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
            <KeyRound className="h-10 w-10 text-blue-600" />
          </motion.div>

          {/* Title */}
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            투표 코드를 입력하세요
          </h1>
          <p className="mb-8 text-center text-sm text-gray-500">
            투표 코드는 선생님이 나눠주신 종이에 있어요
          </p>

          {/* Code Input */}
          <CodeInput
            onComplete={handleCodeComplete}
            disabled={loading}
            error={error}
            success={success}
          />

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
