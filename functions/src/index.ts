import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import CryptoJS from 'crypto-js';

admin.initializeApp();
const db = admin.firestore();

// Constants (mirrored from client)
const VOTE_CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const VOTE_CODE_LENGTH = 6;
const HASH_CHAIN_GENESIS = '0';

const COLLECTIONS = {
  ELECTIONS: 'elections',
  VOTES: 'votes',
  VOTER_CODES: 'voterCodes',
  HASH_CHAIN: 'hashChain',
  AUDIT_LOGS: 'auditLogs',
} as const;

// ============================================================
// Crypto helpers (server-side only — keys never leave here)
// ============================================================

function getEncryptionKey(): string {
  const key = process.env.VOTE_ENCRYPTION_KEY ?? '';
  if (!key) throw new Error('VOTE_ENCRYPTION_KEY not configured');
  return key;
}

function getHmacSecret(): string {
  const secret = process.env.VOTE_HMAC_SECRET ?? '';
  if (!secret) throw new Error('VOTE_HMAC_SECRET not configured');
  return secret;
}

function hashVoteCode(code: string): string {
  const normalized = code.toUpperCase().trim();
  return CryptoJS.HmacSHA256(normalized, getHmacSecret()).toString(CryptoJS.enc.Hex);
}

function encryptVote(data: string): string {
  const keyHash = CryptoJS.SHA256(getEncryptionKey());
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(data, keyHash, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const ivHex = iv.toString(CryptoJS.enc.Hex);
  const ciphertextHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
  return `${ivHex}:${ciphertextHex}`;
}

function decryptVote(encryptedData: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 2) throw new Error('Invalid encrypted data format');
  const [ivHex, ciphertextHex] = parts;
  const keyHash = CryptoJS.SHA256(getEncryptionKey());
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const ciphertext = CryptoJS.enc.Hex.parse(ciphertextHex);
  const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext });
  const decrypted = CryptoJS.AES.decrypt(cipherParams, keyHash, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

function computeVoteHash(voteData: string, timestamp: number, previousHash: string): string {
  return CryptoJS.SHA256(`${voteData}|${timestamp}|${previousHash}`).toString(CryptoJS.enc.Hex);
}

function computeBlockHash(index: number, timestamp: number, voteHash: string, previousHash: string): string {
  return CryptoJS.SHA256(`${index}|${timestamp}|${voteHash}|${previousHash}`).toString(CryptoJS.enc.Hex);
}

function validateCodeFormat(code: string): boolean {
  const normalized = code.toUpperCase().trim();
  if (normalized.length !== VOTE_CODE_LENGTH) return false;
  for (const ch of normalized) {
    if (!VOTE_CODE_CHARSET.includes(ch)) return false;
  }
  return true;
}

// Admin role verification helper
async function verifyAdmin(uid: string): Promise<void> {
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError('permission-denied', '관리자 권한이 없습니다.');
  }
  const role = userDoc.data()?.role;
  if (role !== 'admin' && role !== 'superadmin') {
    throw new functions.https.HttpsError('permission-denied', '관리자 권한이 없습니다.');
  }
}

// Audit log helper
async function createAuditLog(electionId: string, action: string, actorId: string, details: string) {
  await db.collection(COLLECTIONS.AUDIT_LOGS).add({
    electionId,
    action,
    actorId,
    details,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    ipHash: '',
  });
}

// ============================================================
// Cloud Function: validateCode
// Validates a vote code and returns election info (no auth required)
// ============================================================

export const validateCode = functions.https.onCall(async (data) => {
  const { code } = data;

  if (!code || typeof code !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', '투표 코드를 입력해주세요.');
  }

  if (!validateCodeFormat(code)) {
    throw new functions.https.HttpsError('invalid-argument', '투표 코드 형식이 올바르지 않아요.');
  }

  const codeHash = hashVoteCode(code);

  const snapshot = await db
    .collection(COLLECTIONS.VOTER_CODES)
    .where('codeHash', '==', codeHash)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new functions.https.HttpsError('not-found', '투표 코드가 올바르지 않아요. 다시 확인해주세요.');
  }

  const voterCode = snapshot.docs[0].data();

  if (voterCode.used) {
    throw new functions.https.HttpsError('already-exists', '이미 사용된 투표 코드예요. 하나의 코드로 한 번만 투표할 수 있어요.');
  }

  return {
    valid: true,
    electionId: voterCode.electionId,
  };
});

// ============================================================
// Cloud Function: castVote
// Handles the entire voting process server-side (no auth required)
// ============================================================

export const castVote = functions.https.onCall(async (data) => {
  const { code, electionId, candidateId } = data;

  // Validate input
  if (!code || typeof code !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', '투표 코드가 필요합니다.');
  }
  if (!electionId || typeof electionId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', '선거 ID가 필요합니다.');
  }
  if (!candidateId || typeof candidateId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', '후보자 선택이 필요합니다.');
  }

  // Hash the code server-side
  const codeHash = hashVoteCode(code);

  // Find the voter code document
  const voterCodesSnap = await db
    .collection(COLLECTIONS.VOTER_CODES)
    .where('codeHash', '==', codeHash)
    .limit(1)
    .get();

  if (voterCodesSnap.empty) {
    throw new functions.https.HttpsError('not-found', '유효하지 않은 투표 코드입니다.');
  }

  const voterCodeDoc = voterCodesSnap.docs[0];
  const voterCodeId = voterCodeDoc.id;
  const voterCodeData = voterCodeDoc.data();

  if (voterCodeData.used) {
    throw new functions.https.HttpsError('already-exists', '이미 사용된 투표 코드입니다.');
  }

  // Run Firestore transaction
  let receiptData: { voteHash: string; timestamp: number; blockIndex: number } | null = null;

  await db.runTransaction(async (transaction) => {
    // Re-read voter code inside transaction
    const voterCodeRef = db.collection(COLLECTIONS.VOTER_CODES).doc(voterCodeId);
    const freshVoterCode = await transaction.get(voterCodeRef);
    if (!freshVoterCode.exists) {
      throw new functions.https.HttpsError('not-found', '투표 코드를 찾을 수 없습니다.');
    }
    const freshVoterCodeData = freshVoterCode.data()!;
    if (freshVoterCodeData.used) {
      throw new functions.https.HttpsError('already-exists', '이미 사용된 투표 코드입니다.');
    }

    // Verify voter code belongs to this election
    if (freshVoterCodeData.electionId !== electionId) {
      throw new functions.https.HttpsError('permission-denied', '이 투표 코드는 해당 선거에 속하지 않습니다.');
    }

    // Re-read election
    const electionRef = db.collection(COLLECTIONS.ELECTIONS).doc(electionId);
    const electionSnap = await transaction.get(electionRef);
    if (!electionSnap.exists) {
      throw new functions.https.HttpsError('not-found', '선거를 찾을 수 없습니다.');
    }
    const election = electionSnap.data()!;
    if (election.status !== 'active') {
      throw new functions.https.HttpsError('failed-precondition', '현재 투표가 진행 중이 아닙니다.');
    }

    // Validate candidateId against election's candidate list
    const isAbstention = candidateId === '__abstention__';
    const isValidCandidate = election.candidates.some((c: { id: string }) => c.id === candidateId);
    if (!isAbstention && !isValidCandidate) {
      throw new functions.https.HttpsError('invalid-argument', '유효하지 않은 후보자입니다.');
    }

    // Encrypt the candidateId server-side
    const encryptedVote = encryptVote(candidateId);
    const timestamp = Date.now();

    // Compute hash chain
    const previousBlockHash = election.hashChainHead || HASH_CHAIN_GENESIS;
    const newBlockIndex = election.totalVoted ?? 0;
    const voteHash = computeVoteHash(encryptedVote, timestamp, previousBlockHash);
    const blockHash = computeBlockHash(newBlockIndex, timestamp, voteHash, previousBlockHash);
    const firestoreTimestamp = admin.firestore.Timestamp.fromMillis(timestamp);

    // Create vote document (candidateId only stored encrypted)
    const voteRef = db.collection(COLLECTIONS.VOTES).doc();
    transaction.set(voteRef, {
      electionId,
      encryptedVote,
      voteHash,
      previousHash: previousBlockHash,
      classId: freshVoterCodeData.classId,
      timestamp: firestoreTimestamp,
      verified: false,
    });

    // Mark voter code as used
    transaction.update(voterCodeRef, {
      used: true,
      usedAt: firestoreTimestamp,
    });

    // Create hash chain block
    const blockRef = db.collection(COLLECTIONS.HASH_CHAIN).doc();
    transaction.set(blockRef, {
      electionId,
      index: newBlockIndex,
      timestamp: firestoreTimestamp,
      voteHash,
      previousHash: previousBlockHash,
      blockHash,
      classId: freshVoterCodeData.classId,
    });

    // Update election counters
    transaction.update(electionRef, {
      totalVoted: (election.totalVoted ?? 0) + 1,
      hashChainHead: blockHash,
      updatedAt: firestoreTimestamp,
    });

    receiptData = { voteHash, timestamp, blockIndex: newBlockIndex };
  });

  return receiptData;
});

// ============================================================
// Cloud Function: getElectionResults
// Decrypts votes and computes results server-side (auth required)
// ============================================================

export const getElectionResults = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '인증이 필요합니다.');
  }
  await verifyAdmin(context.auth.uid);

  const { electionId } = data;
  if (!electionId || typeof electionId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', '선거 ID가 필요합니다.');
  }

  // Get election
  const electionSnap = await db.collection(COLLECTIONS.ELECTIONS).doc(electionId).get();
  if (!electionSnap.exists) {
    throw new functions.https.HttpsError('not-found', '선거를 찾을 수 없습니다.');
  }
  const election = electionSnap.data()!;
  if (election.status !== 'closed' && election.status !== 'finalized') {
    throw new functions.https.HttpsError('failed-precondition', '투표가 종료된 후에 결과를 확인할 수 있습니다.');
  }

  // Get all votes
  const votesSnap = await db
    .collection(COLLECTIONS.VOTES)
    .where('electionId', '==', electionId)
    .orderBy('timestamp', 'asc')
    .get();

  // Count votes per candidate by decrypting server-side
  const candidateCounts: Record<string, { total: number; classCounts: Record<string, number> }> = {};
  for (const candidate of election.candidates) {
    candidateCounts[candidate.id] = { total: 0, classCounts: {} };
  }

  let abstentions = 0;

  for (const doc of votesSnap.docs) {
    const vote = doc.data();
    let resolvedCandidateId: string;

    try {
      resolvedCandidateId = vote.encryptedVote
        ? decryptVote(vote.encryptedVote)
        : (vote.candidateId ?? '');
    } catch {
      // Fallback for legacy votes with plaintext candidateId
      resolvedCandidateId = vote.candidateId ?? '';
    }

    if (resolvedCandidateId === '__abstention__' || resolvedCandidateId === 'abstain' || resolvedCandidateId === '') {
      abstentions++;
      continue;
    }

    if (candidateCounts[resolvedCandidateId]) {
      candidateCounts[resolvedCandidateId].total++;
      const classId = vote.classId;
      candidateCounts[resolvedCandidateId].classCounts[classId] =
        (candidateCounts[resolvedCandidateId].classCounts[classId] ?? 0) + 1;
    }
  }

  const totalVotes = votesSnap.size;
  const totalVoters = election.totalVoters ?? 0;
  const turnout = totalVoters > 0 ? (totalVotes / totalVoters) * 100 : 0;
  const validVotes = totalVotes - abstentions;

  const candidates = election.candidates.map((c: { id: string; name: string; number: number }) => {
    const count = candidateCounts[c.id];
    return {
      candidateId: c.id,
      candidateName: c.name,
      candidateNumber: c.number,
      totalVotes: count.total,
      percentage: validVotes > 0 ? (count.total / validVotes) * 100 : 0,
      classCounts: count.classCounts,
    };
  });

  // Class turnout
  const votesByClass: Record<string, number> = {};
  for (const doc of votesSnap.docs) {
    const v = doc.data();
    votesByClass[v.classId] = (votesByClass[v.classId] ?? 0) + 1;
  }

  const classTurnout: Record<string, { voted: number; total: number; rate: number }> = {};
  for (const classId of (election.targetClasses ?? [])) {
    const voted = votesByClass[classId] ?? 0;
    const total = Math.round(totalVoters / (election.targetClasses?.length ?? 1));
    classTurnout[classId] = {
      voted,
      total,
      rate: total > 0 ? (voted / total) * 100 : 0,
    };
  }

  return {
    electionId,
    totalVotes,
    totalVoters,
    turnout,
    candidates,
    abstentions,
    classTurnout,
  };
});

// ============================================================
// Firestore triggers (audit logging)
// ============================================================

export const onVoteCreated = functions.firestore
  .document('votes/{voteId}')
  .onCreate(async (snap) => {
    const voteData = snap.data();
    await createAuditLog(
      voteData.electionId,
      'vote_cast',
      'voter',
      `반 ${voteData.classId}에서 투표가 기록되었습니다.`
    );
  });

export const onElectionStatusChange = functions.firestore
  .document('elections/{electionId}')
  .onUpdate(async (change, context) => {
    const { electionId } = context.params;
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== after.status) {
      const statusMessages: Record<string, string> = {
        ready: '선거가 준비 완료 상태로 변경되었습니다.',
        active: '투표가 시작되었습니다.',
        paused: '투표가 일시 중지되었습니다.',
        closed: '투표가 종료되었습니다.',
        finalized: '선거 결과가 확정되었습니다.',
      };

      await createAuditLog(
        electionId,
        `election_${after.status}`,
        after.createdBy || 'system',
        statusMessages[after.status] || `상태가 ${after.status}(으)로 변경되었습니다.`
      );
    }
  });

// ============================================================
// Cloud Function: generateVoterCodes
// Generates vote codes server-side (auth required)
// HMAC hashing happens here — secret never leaves server
// ============================================================

export const generateVoterCodes = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '인증이 필요합니다.');
  }
  await verifyAdmin(context.auth.uid);

  const { electionId, classId, grade, classNum, count } = data;

  if (!electionId || typeof electionId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', '선거 ID가 필요합니다.');
  }
  if (!classId || typeof classId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', '반 정보가 필요합니다.');
  }
  if (typeof grade !== 'number' || typeof classNum !== 'number') {
    throw new functions.https.HttpsError('invalid-argument', '학년/반 번호가 필요합니다.');
  }
  if (typeof count !== 'number' || count < 1 || count > 100) {
    throw new functions.https.HttpsError('invalid-argument', '생성 수량은 1~100 사이여야 합니다.');
  }

  // Verify election exists
  const electionSnap = await db.collection(COLLECTIONS.ELECTIONS).doc(electionId).get();
  if (!electionSnap.exists) {
    throw new functions.https.HttpsError('not-found', '선거를 찾을 수 없습니다.');
  }

  // Generate codes server-side
  const crypto = await import('crypto');
  const codes: { code: string; studentNumber: number }[] = [];
  const batch = db.batch();

  for (let i = 0; i < count; i++) {
    // Generate random code using Node crypto
    let code = '';
    const randomBytes = crypto.randomBytes(VOTE_CODE_LENGTH);
    for (let j = 0; j < VOTE_CODE_LENGTH; j++) {
      code += VOTE_CODE_CHARSET[randomBytes[j] % VOTE_CODE_CHARSET.length];
    }

    const codeHash = hashVoteCode(code);
    const docRef = db.collection(COLLECTIONS.VOTER_CODES).doc();

    batch.set(docRef, {
      code: code, // Admin needs to view/print codes
      codeHash,
      electionId,
      classId,
      grade,
      classNum,
      studentNumber: i + 1,
      used: false,
      usedAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    codes.push({ code, studentNumber: i + 1 });
  }

  await batch.commit();

  await createAuditLog(
    electionId,
    'codes_generated',
    context.auth.uid,
    `${classId} 반 투표 코드 ${count}개 생성`
  );

  return { codes };
});

// ============================================================
// Cloud Function: verifyHashChain (auth required)
// ============================================================

export const verifyHashChain = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '인증이 필요합니다.');
  }
  await verifyAdmin(context.auth.uid);

  const { electionId } = data;
  if (!electionId) {
    throw new functions.https.HttpsError('invalid-argument', '선거 ID가 필요합니다.');
  }

  const chainSnapshot = await db
    .collection(COLLECTIONS.HASH_CHAIN)
    .where('electionId', '==', electionId)
    .orderBy('index', 'asc')
    .get();

  if (chainSnapshot.empty) {
    return { valid: true, blockCount: 0 };
  }

  const blocks = chainSnapshot.docs.map(doc => doc.data());
  let valid = true;
  let brokenAt = -1;

  // Verify genesis
  if (blocks[0].previousHash !== HASH_CHAIN_GENESIS) {
    valid = false;
    brokenAt = 0;
  }

  if (valid) {
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const ts = block.timestamp?.toMillis ? block.timestamp.toMillis() : Number(block.timestamp);
      const expectedHash = computeBlockHash(block.index, ts, block.voteHash, block.previousHash);

      if (block.blockHash !== expectedHash) {
        valid = false;
        brokenAt = i;
        break;
      }

      if (i > 0 && block.previousHash !== blocks[i - 1].blockHash) {
        valid = false;
        brokenAt = i;
        break;
      }
    }
  }

  await createAuditLog(
    electionId,
    'hash_chain_verified',
    context.auth.uid,
    valid
      ? `해시 체인 검증 완료: ${blocks.length}개 블록 모두 정상`
      : `해시 체인 검증 실패: ${brokenAt}번째 블록에서 오류 발견`
  );

  return { valid, blockCount: blocks.length, brokenAt };
});
