'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/constants';
import { BallotPaper } from '@/components/vote/BallotPaper';
import { VoteConfirm } from '@/components/vote/VoteConfirm';
import { Spinner } from '@/components/ui/Spinner';
import type { Election, VoteResponse } from '@/types';

const ABSTENTION_ID = '__abstention__';

function BallotContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const electionId = searchParams.get('electionId');

  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!code || !electionId) {
      toast.error('잘못된 접근이에요. 투표 코드를 다시 입력해주세요.');
      router.replace('/vote');
      return;
    }

    const fetchElection = async () => {
      try {
        const electionRef = doc(db, COLLECTIONS.ELECTIONS, electionId);
        const electionSnap = await getDoc(electionRef);

        if (!electionSnap.exists()) {
          setError('선거 정보를 찾을 수 없어요.');
          toast.error('선거 정보를 찾을 수 없어요.');
          return;
        }

        const electionData = {
          id: electionSnap.id,
          ...electionSnap.data(),
        } as Election;

        if (electionData.status !== 'active') {
          setError('현재 투표가 진행 중이지 않아요.');
          toast.error('현재 투표가 진행 중이지 않아요.');
          return;
        }

        setElection(electionData);
      } catch {
        setError('선거 정보를 불러오는 데 실패했어요.');
        toast.error('선거 정보를 불러오는 데 실패했어요.');
      } finally {
        setLoading(false);
      }
    };

    fetchElection();
  }, [code, electionId, router]);

  const handleVoteSelect = useCallback((candidateId: string) => {
    setSelectedCandidateId(candidateId);
    setConfirmOpen(true);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedCandidateId || !code || !electionId) return;

    setSubmitting(true);

    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          electionId,
          candidateId: selectedCandidateId,
        }),
      });

      const data: VoteResponse = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.error || '투표에 실패했어요. 다시 시도해주세요.');
        setSubmitting(false);
        setConfirmOpen(false);
        return;
      }

      toast.success('투표가 완료되었어요!');

      const receiptParam = data.receipt
        ? encodeURIComponent(JSON.stringify(data.receipt))
        : '';

      router.push(`/vote/complete?receipt=${receiptParam}`);
    } catch {
      toast.error('서버에 연결할 수 없어요. 다시 시도해주세요.');
      setSubmitting(false);
      setConfirmOpen(false);
    }
  }, [selectedCandidateId, code, electionId, router]);

  const selectedCandidate =
    selectedCandidateId && selectedCandidateId !== ABSTENTION_ID
      ? election?.candidates.find((c) => c.id === selectedCandidateId)
      : null;

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-sky-50 to-white">
        <Spinner size="lg" color="blue" />
        <p className="mt-4 text-sm text-gray-500">
          선거 정보를 불러오고 있어요...
        </p>
      </div>
    );
  }

  if (error || !election) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-sky-50 to-white px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">
            &#x26A0;&#xFE0F;
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {error || '선거 정보를 불러올 수 없어요'}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            투표 코드를 다시 입력해주세요
          </p>
          <Link
            href="/vote"
            className="mt-4 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            다시 시도하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-sky-50 to-white">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4">
        <Link
          href="/vote"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100"
          aria-label="뒤로 돌아가기"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-gray-900">투표 용지</h1>
      </header>

      {/* Ballot */}
      <main className="flex-1 px-4 pb-12 pt-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <BallotPaper election={election} onVote={handleVoteSelect} />
        </motion.div>
      </main>

      {/* Confirmation Modal */}
      <VoteConfirm
        isOpen={confirmOpen}
        onClose={() => {
          if (!submitting) {
            setConfirmOpen(false);
          }
        }}
        onConfirm={handleConfirm}
        candidateName={
          selectedCandidateId === ABSTENTION_ID
            ? '기권'
            : selectedCandidate?.name || ''
        }
        candidateNumber={selectedCandidate?.number || 0}
        isAbstention={selectedCandidateId === ABSTENTION_ID}
        loading={submitting}
      />
    </div>
  );
}

export default function BallotPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-sky-50 to-white">
          <Spinner size="lg" color="blue" />
          <p className="mt-4 text-sm text-gray-500">
            페이지를 불러오고 있어요...
          </p>
        </div>
      }
    >
      <BallotContent />
    </Suspense>
  );
}
