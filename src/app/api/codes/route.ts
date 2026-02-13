import { NextRequest, NextResponse } from 'next/server';
import {
  collection,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/constants';
import { generateVoteCode, hashVoteCode } from '@/lib/voteCode';
import { hashData } from '@/lib/crypto';
import type {
  CodeGenerateRequest,
  CodeGenerateResponse,
  Election,
} from '@/types';

/**
 * Verify the Firebase auth token from the Authorization header.
 * Since Firebase Admin SDK is not easily usable in Next.js API routes
 * (it requires a service account and server-side only execution),
 * we decode the JWT payload to extract the user ID and check expiration.
 *
 * For production, consider using Firebase Admin SDK with a Node.js runtime
 * or a custom auth middleware.
 */
async function verifyAuthToken(
  request: NextRequest
): Promise<string | null> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  if (!token || token.length < 10) {
    return null;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the JWT payload (base64url)
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(
      Buffer.from(base64, 'base64').toString('utf-8')
    );

    if (!payload.user_id || !payload.exp) {
      return null;
    }

    // Check token expiration
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp < nowSeconds) {
      return null;
    }

    return payload.user_id as string;
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<CodeGenerateResponse>> {
  try {
    // 1. Verify admin auth
    const userId = await verifyAuthToken(request);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: '인증이 필요합니다. 관리자로 로그인해주세요.',
        },
        { status: 401 }
      );
    }

    // 2. Parse body: { electionId, classId, count }
    let body: CodeGenerateRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: '잘못된 요청 형식입니다.' },
        { status: 400 }
      );
    }

    const { electionId, classId, count } = body;

    if (!electionId || !classId || !count) {
      return NextResponse.json(
        {
          success: false,
          error: '선거 ID, 반 ID, 생성 수량은 필수 항목입니다.',
        },
        { status: 400 }
      );
    }

    if (typeof count !== 'number' || count < 1 || count > 100) {
      return NextResponse.json(
        { success: false, error: '생성 수량은 1~100 사이여야 합니다.' },
        { status: 400 }
      );
    }

    // Verify election exists
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

    // Verify election is in a state where codes can be generated
    if (election.status === 'closed' || election.status === 'finalized') {
      return NextResponse.json(
        {
          success: false,
          error: '종료된 선거에는 투표 코드를 생성할 수 없습니다.',
        },
        { status: 400 }
      );
    }

    // Parse classId to extract grade and classNum (format: "G-C", e.g., "3-2")
    const classParts = classId.split('-');
    let grade = 0;
    let classNum = 0;
    if (classParts.length === 2) {
      grade = parseInt(classParts[0], 10);
      classNum = parseInt(classParts[1], 10);
    }

    // 3. Generate 'count' unique vote codes
    const generatedCodes: { code: string; studentNumber: number }[] = [];
    const usedCodes = new Set<string>();

    for (let i = 0; i < count; i++) {
      let code: string;

      // Ensure uniqueness within this batch
      do {
        code = generateVoteCode();
      } while (usedCodes.has(code));

      usedCodes.add(code);
      generatedCodes.push({
        code,
        studentNumber: i + 1,
      });
    }

    // 4-5. Hash each code and store in Firestore voterCodes collection
    const voterCodesCol = collection(db, COLLECTIONS.VOTER_CODES);

    const storePromises = generatedCodes.map(({ code, studentNumber }) => {
      const codeHash = hashVoteCode(code);

      return addDoc(voterCodesCol, {
        code: '', // Never store the original plaintext code
        codeHash,
        classId,
        grade,
        classNum,
        studentNumber,
        used: false,
        usedAt: null,
        createdAt: serverTimestamp(),
      });
    });

    await Promise.all(storePromises);

    // Create audit log
    const ip =
      request.headers.get('x-forwarded-for') ??
      request.headers.get('x-real-ip') ??
      'unknown';
    const clientIp = ip.split(',')[0].trim();
    const ipHash = hashData(clientIp);

    try {
      await addDoc(collection(db, COLLECTIONS.AUDIT_LOGS), {
        electionId,
        action: 'codes_generated' as const,
        actorId: userId,
        details: `${classId}반 투표 코드 ${count}개 생성`,
        timestamp: serverTimestamp(),
        ipHash,
      });
    } catch {
      // Audit log failure should not fail the operation
      console.error('감사 로그 기록 실패');
    }

    // 6. Return the original (unhashed) codes to display/print
    return NextResponse.json(
      {
        success: true,
        codes: generatedCodes,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('투표 코드 생성 API 오류:', error);

    const message =
      error instanceof Error
        ? error.message
        : '투표 코드 생성 중 오류가 발생했습니다.';

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
