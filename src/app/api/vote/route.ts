import { NextRequest, NextResponse } from 'next/server';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  COLLECTIONS,
  HASH_CHAIN_GENESIS,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
} from '@/constants';
import { encryptVote, hashData } from '@/lib/crypto';
import { hashVoteCode } from '@/lib/voteCode';
import { computeVoteHash, computeBlockHash } from '@/lib/hashChain';
import type {
  VoteRequest,
  VoteResponse,
  Election,
  VoterCode,
  HashBlock,
} from '@/types';

// ===== In-Memory Rate Limiter =====

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

// Periodically clean expired entries to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now > entry.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }, RATE_LIMIT_WINDOW_MS * 2);
}

// ===== POST Handler =====

export async function POST(
  request: NextRequest
): Promise<NextResponse<VoteResponse>> {
  try {
    // 1. Parse request body
    let body: VoteRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: '잘못된 요청 형식입니다.' },
        { status: 400 }
      );
    }

    const { code, electionId, candidateId } = body;

    // 2. Validate inputs
    if (!code || !electionId || !candidateId) {
      return NextResponse.json(
        {
          success: false,
          error: '투표 코드, 선거 ID, 후보 ID는 필수 항목입니다.',
        },
        { status: 400 }
      );
    }

    // 3. Rate limiting (IP-based, 5 requests/minute)
    const ip =
      request.headers.get('x-forwarded-for') ??
      request.headers.get('x-real-ip') ??
      'unknown';
    const clientIp = ip.split(',')[0].trim();

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        {
          success: false,
          error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        },
        { status: 429 }
      );
    }

    // 4. Get election and verify it's active
    const electionRef = doc(db, COLLECTIONS.ELECTIONS, electionId);
    const electionSnap = await getDoc(electionRef);

    if (!electionSnap.exists()) {
      return NextResponse.json(
        { success: false, error: '선거를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const election = {
      id: electionSnap.id,
      ...electionSnap.data(),
    } as Election;

    if (election.status !== 'active') {
      return NextResponse.json(
        { success: false, error: '현재 투표가 진행 중이 아닙니다.' },
        { status: 400 }
      );
    }

    // Check election time boundaries
    const now = Date.now();
    if (election.startTime && election.startTime.toMillis() > now) {
      return NextResponse.json(
        { success: false, error: '투표 시작 시간 전입니다.' },
        { status: 400 }
      );
    }
    if (election.endTime && election.endTime.toMillis() < now) {
      return NextResponse.json(
        { success: false, error: '투표 종료 시간이 지났습니다.' },
        { status: 400 }
      );
    }

    // Validate candidateId exists in the election (or is abstention)
    const validCandidate = election.candidates.some(
      (c) => c.id === candidateId
    );
    if (!validCandidate && candidateId !== 'abstention') {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 후보입니다.' },
        { status: 400 }
      );
    }

    // 5. Hash the vote code and find matching voterCode document
    const codeHash = hashVoteCode(code);
    const voterCodesQuery = query(
      collection(db, COLLECTIONS.VOTER_CODES),
      where('codeHash', '==', codeHash),
      limit(1)
    );
    const voterCodesSnap = await getDocs(voterCodesQuery);

    if (voterCodesSnap.empty) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 투표 코드입니다.' },
        { status: 400 }
      );
    }

    const voterCodeDoc = voterCodesSnap.docs[0];
    const voterCode = {
      id: voterCodeDoc.id,
      ...voterCodeDoc.data(),
    } as VoterCode;

    // 6. Check if code already used
    if (voterCode.used) {
      return NextResponse.json(
        { success: false, error: '이미 사용된 투표 코드입니다.' },
        { status: 400 }
      );
    }

    // 7. Encrypt the candidateId
    const encryptedVote = encryptVote(candidateId);

    // 8. Get the latest hash chain block
    const chainQuery = query(
      collection(db, COLLECTIONS.HASH_CHAIN),
      orderBy('index', 'desc'),
      limit(1)
    );
    const latestBlockSnap = await getDocs(chainQuery);

    let previousBlockHash: string;
    let newBlockIndex: number;

    if (latestBlockSnap.empty) {
      previousBlockHash = HASH_CHAIN_GENESIS;
      newBlockIndex = 0;
    } else {
      const latestBlock = latestBlockSnap.docs[0].data() as HashBlock;
      previousBlockHash = latestBlock.blockHash;
      newBlockIndex = latestBlock.index + 1;
    }

    // 9. Compute new vote hash and block hash
    const timestamp = Date.now();
    const voteHash = computeVoteHash(
      encryptedVote,
      timestamp,
      previousBlockHash
    );
    const blockHash = computeBlockHash(
      newBlockIndex,
      timestamp,
      voteHash,
      previousBlockHash
    );
    const firestoreTimestamp = Timestamp.fromMillis(timestamp);

    // 10. Use Firestore runTransaction to atomically perform all writes
    await runTransaction(db, async (transaction) => {
      // Re-read the voterCode inside the transaction to prevent race conditions
      const voterCodeRef = doc(db, COLLECTIONS.VOTER_CODES, voterCode.id);
      const freshVoterCodeSnap = await transaction.get(voterCodeRef);

      if (!freshVoterCodeSnap.exists()) {
        throw new Error('투표 코드를 찾을 수 없습니다.');
      }

      const freshVoterCode = freshVoterCodeSnap.data() as VoterCode;
      if (freshVoterCode.used) {
        throw new Error('이미 사용된 투표 코드입니다.');
      }

      // Re-read election to verify still active
      const freshElectionSnap = await transaction.get(electionRef);
      if (!freshElectionSnap.exists()) {
        throw new Error('선거를 찾을 수 없습니다.');
      }
      const freshElection = freshElectionSnap.data() as Election;
      if (freshElection.status !== 'active') {
        throw new Error('현재 투표가 진행 중이 아닙니다.');
      }

      // Create vote document
      const voteRef = doc(collection(db, COLLECTIONS.VOTES));
      transaction.set(voteRef, {
        electionId,
        candidateId,
        encryptedVote,
        voteHash,
        previousHash: previousBlockHash,
        classId: voterCode.classId,
        timestamp: firestoreTimestamp,
        verified: false,
      });

      // Mark voterCode as used
      transaction.update(voterCodeRef, {
        used: true,
        usedAt: firestoreTimestamp,
      });

      // Create new hashChain block
      const blockRef = doc(collection(db, COLLECTIONS.HASH_CHAIN));
      transaction.set(blockRef, {
        index: newBlockIndex,
        timestamp: firestoreTimestamp,
        voteHash,
        previousHash: previousBlockHash,
        blockHash,
        classId: voterCode.classId,
      });

      // Increment election.totalVoted and update hashChainHead
      transaction.update(electionRef, {
        totalVoted: (freshElection.totalVoted ?? 0) + 1,
        hashChainHead: blockHash,
        updatedAt: firestoreTimestamp,
      });
    });

    // 11. Create audit log entry (outside transaction to not block vote)
    const ipHash = hashData(clientIp);
    try {
      await addDoc(collection(db, COLLECTIONS.AUDIT_LOGS), {
        electionId,
        action: 'vote_cast' as const,
        actorId: 'anonymous',
        details: `블록 #${newBlockIndex} 투표 완료 (반: ${voterCode.classId})`,
        timestamp: firestoreTimestamp,
        ipHash,
      });
    } catch {
      // Audit log failure should not fail the vote
      console.error('감사 로그 기록 실패');
    }

    // 12. Return success with receipt
    return NextResponse.json(
      {
        success: true,
        receipt: {
          voteHash,
          timestamp,
          blockIndex: newBlockIndex,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : '투표 처리 중 오류가 발생했습니다.';

    console.error('투표 API 오류:', error);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
