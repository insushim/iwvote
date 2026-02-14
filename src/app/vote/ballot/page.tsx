'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, HASH_CHAIN_GENESIS } from '@/constants';
import { encryptVote } from '@/lib/crypto';
import { computeVoteHash, computeBlockHash } from '@/lib/hashChain';
import { hashVoteCode } from '@/lib/voteCode';
import { BallotPaper } from '@/components/vote/BallotPaper';
import { VoteConfirm } from '@/components/vote/VoteConfirm';
import { Spinner } from '@/components/ui/Spinner';
import type { Election, VoterCode, VoteReceipt } from '@/types';

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
      // 1. Hash the vote code and look up the voter code document
      const codeHash = hashVoteCode(code);
      const voterCodesQuery = query(
        collection(db, COLLECTIONS.VOTER_CODES),
        where('codeHash', '==', codeHash),
        limit(1)
      );
      const voterCodesSnap = await getDocs(voterCodesQuery);

      if (voterCodesSnap.empty) {
        toast.error('유효하지 않은 투표 코드입니다.');
        setSubmitting(false);
        setConfirmOpen(false);
        return;
      }

      const voterCodeDoc = voterCodesSnap.docs[0];
      const voterCode = {
        id: voterCodeDoc.id,
        ...voterCodeDoc.data(),
      } as VoterCode;

      if (voterCode.used) {
        toast.error('이미 사용된 투표 코드입니다.');
        setSubmitting(false);
        setConfirmOpen(false);
        return;
      }

      // 2. Use Firestore transaction to atomically cast vote, mark code, and add hash chain block
      // Hash chain state is read from election doc inside the transaction to prevent race conditions
      let receiptData: VoteReceipt | null = null;

      await runTransaction(db, async (transaction) => {
        // Re-read voter code inside transaction to prevent race conditions
        const voterCodeRef = doc(db, COLLECTIONS.VOTER_CODES, voterCode.id);
        const freshVoterCodeSnap = await transaction.get(voterCodeRef);

        if (!freshVoterCodeSnap.exists()) {
          throw new Error('투표 코드를 찾을 수 없습니다.');
        }

        const freshVoterCode = freshVoterCodeSnap.data() as VoterCode;
        if (freshVoterCode.used) {
          throw new Error('이미 사용된 투표 코드입니다.');
        }

        // Re-read election to verify still active and get hash chain state
        const electionRef = doc(db, COLLECTIONS.ELECTIONS, electionId);
        const freshElectionSnap = await transaction.get(electionRef);
        if (!freshElectionSnap.exists()) {
          throw new Error('선거를 찾을 수 없습니다.');
        }
        const freshElection = freshElectionSnap.data() as Election;
        if (freshElection.status !== 'active') {
          throw new Error('현재 투표가 진행 중이 아닙니다.');
        }

        // Determine hash chain state from election doc (transactionally consistent)
        const previousBlockHash = freshElection.hashChainHead || HASH_CHAIN_GENESIS;
        const newBlockIndex = freshElection.totalVoted ?? 0;

        // Compute hashes inside transaction for consistency
        const encryptedVote = encryptVote(selectedCandidateId);
        const timestamp = Date.now();
        const voteHash = computeVoteHash(encryptedVote, timestamp, previousBlockHash);
        const blockHash = computeBlockHash(newBlockIndex, timestamp, voteHash, previousBlockHash);
        const firestoreTimestamp = Timestamp.fromMillis(timestamp);

        // Create vote document
        const voteRef = doc(collection(db, COLLECTIONS.VOTES));
        transaction.set(voteRef, {
          electionId,
          candidateId: selectedCandidateId,
          encryptedVote,
          voteHash,
          previousHash: previousBlockHash,
          classId: voterCode.classId,
          timestamp: firestoreTimestamp,
          verified: false,
        });

        // Mark voter code as used
        transaction.update(voterCodeRef, {
          used: true,
          usedAt: firestoreTimestamp,
        });

        // Create new hash chain block
        const blockRef = doc(collection(db, COLLECTIONS.HASH_CHAIN));
        transaction.set(blockRef, {
          electionId,
          index: newBlockIndex,
          timestamp: firestoreTimestamp,
          voteHash,
          previousHash: previousBlockHash,
          blockHash,
          classId: voterCode.classId,
        });

        // Increment election totalVoted and update hashChainHead
        transaction.update(electionRef, {
          totalVoted: (freshElection.totalVoted ?? 0) + 1,
          hashChainHead: blockHash,
          updatedAt: firestoreTimestamp,
        });

        // Save receipt data for post-transaction use
        receiptData = {
          voteHash,
          timestamp,
          blockIndex: newBlockIndex,
        };
      });

      // 3. Build receipt and navigate to completion page
      const receipt: VoteReceipt = receiptData!;

      toast.success('투표가 완료되었어요!');

      const receiptParam = encodeURIComponent(JSON.stringify(receipt));
      router.push(`/vote/complete?receipt=${receiptParam}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '투표 처리 중 오류가 발생했어요.';
      toast.error(message);
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
          <a
            href="/vote/"
            className="mt-4 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            다시 시도하기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-sky-50 to-white">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4">
        <a
          href="/vote/"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100"
          aria-label="뒤로 돌아가기"
        >
          <ArrowLeft className="h-5 w-5" />
        </a>
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
