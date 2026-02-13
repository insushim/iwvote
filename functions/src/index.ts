import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// Audit log helper
async function createAuditLog(
  electionId: string,
  action: string,
  actorId: string,
  details: string
) {
  await db.collection('auditLogs').add({
    electionId,
    action,
    actorId,
    details,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    ipHash: '',
  });
}

// Cloud Function: onVoteCreated
// Triggered when a new vote is added - creates audit log
export const onVoteCreated = functions.firestore
  .document('elections/{electionId}/votes/{voteId}')
  .onCreate(async (snap, context) => {
    const { electionId } = context.params;
    const voteData = snap.data();

    await createAuditLog(
      electionId,
      'vote_cast',
      'voter',
      `반 ${voteData.classId}에서 투표가 기록되었습니다.`
    );
  });

// Cloud Function: onElectionStatusChange
// Triggered when election status changes
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

// Cloud Function: verifyHashChainIntegrity
// Scheduled function to verify hash chain integrity periodically
export const verifyHashChain = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '인증이 필요합니다.');
  }

  const { electionId } = data;
  if (!electionId) {
    throw new functions.https.HttpsError('invalid-argument', '선거 ID가 필요합니다.');
  }

  const chainSnapshot = await db
    .collection(`elections/${electionId}/hashChain`)
    .orderBy('index', 'asc')
    .get();

  if (chainSnapshot.empty) {
    return { valid: true, blockCount: 0 };
  }

  const blocks = chainSnapshot.docs.map(doc => doc.data());
  let valid = true;
  let brokenAt = -1;

  for (let i = 1; i < blocks.length; i++) {
    if (blocks[i].previousHash !== blocks[i - 1].blockHash) {
      valid = false;
      brokenAt = i;
      break;
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
