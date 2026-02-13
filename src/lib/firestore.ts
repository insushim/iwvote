import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/constants';
import { setDoc, deleteDoc } from 'firebase/firestore';
import type {
  School,
  Election,
  ElectionStatus,
  Vote,
  VoterCode,
  HashBlock,
  AuditLog,
  AuditAction,
  UserProfile,
  UserRole,
} from '@/types';

// ============================================================
// Users
// ============================================================

/**
 * Create a user profile document (doc ID = Firebase Auth UID).
 */
export async function createUserProfile(
  uid: string,
  data: Omit<UserProfile, 'id' | 'createdAt' | 'approvedAt' | 'approvedBy'>
): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.USERS, uid), {
    ...data,
    createdAt: serverTimestamp(),
    approvedAt: null,
    approvedBy: null,
  });
}

/**
 * Get user profile by UID.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docSnap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as UserProfile;
}

/**
 * Check if any superadmin exists.
 */
export async function hasSuperAdmin(): Promise<boolean> {
  const q = query(
    collection(db, COLLECTIONS.USERS),
    where('role', '==', 'superadmin'),
    limit(1)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

/**
 * Get all users, optionally filtered by role.
 */
export async function getUsers(role?: UserRole): Promise<UserProfile[]> {
  const constraints: QueryConstraint[] = [];
  if (role) {
    constraints.push(where('role', '==', role));
  }
  constraints.push(orderBy('createdAt', 'desc'));

  const q = query(collection(db, COLLECTIONS.USERS), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as UserProfile);
}

/**
 * Approve a pending user (set role to admin).
 */
export async function approveUser(uid: string, approverUid: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
    role: 'admin',
    approved: true,
    approvedAt: serverTimestamp(),
    approvedBy: approverUid,
  });
}

/**
 * Reject (delete) a pending user.
 */
export async function rejectUser(uid: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.USERS, uid));
}

/**
 * Update user role.
 */
export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), { role });
}

// ============================================================
// Schools
// ============================================================

/**
 * Get a school by its document ID.
 */
export async function getSchool(schoolId: string): Promise<School | null> {
  const docRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as School;
}

/**
 * Create a school document with a specific ID (typically user UID).
 */
export async function createSchoolWithId(
  schoolId: string,
  data: Omit<School, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.SCHOOLS, schoolId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Create a new school document with auto-generated ID.
 */
export async function createSchool(
  data: Omit<School, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.SCHOOLS), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Save school settings. Creates the document if it doesn't exist, otherwise updates.
 */
export async function saveSchool(
  schoolId: string,
  data: Partial<Omit<School, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(docRef, {
      name: '',
      grades: [],
      classesPerGrade: {},
      studentsPerClass: {},
      adminIds: [],
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Update an existing school document.
 */
export async function updateSchool(
  schoolId: string,
  data: Partial<Omit<School, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ============================================================
// Elections
// ============================================================

/**
 * Get all elections for a school, ordered by creation time descending.
 */
export async function getElections(schoolId: string): Promise<Election[]> {
  const q = query(
    collection(db, COLLECTIONS.ELECTIONS),
    where('schoolId', '==', schoolId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Election);
}

/**
 * Get a single election by its document ID.
 */
export async function getElection(electionId: string): Promise<Election | null> {
  const docRef = doc(db, COLLECTIONS.ELECTIONS, electionId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Election;
}

/**
 * Create a new election document.
 */
export async function createElection(
  data: Omit<Election, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.ELECTIONS), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update an existing election document.
 */
export async function updateElection(
  electionId: string,
  data: Partial<Omit<Election, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ELECTIONS, electionId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update only the status of an election.
 * Automatically sets startTime when activating and endTime when closing/finalizing.
 */
export async function updateElectionStatus(
  electionId: string,
  status: ElectionStatus
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ELECTIONS, electionId);
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (status === 'active') {
    updateData.startTime = serverTimestamp();
  } else if (status === 'closed' || status === 'finalized') {
    updateData.endTime = serverTimestamp();
  }

  await updateDoc(docRef, updateData);
}

// ============================================================
// Candidates (embedded in election.candidates array)
// ============================================================

/**
 * Add a candidate to an election's candidates array.
 */
export async function addCandidate(
  electionId: string,
  candidate: Omit<import('@/types').Candidate, 'id'>
): Promise<void> {
  const election = await getElection(electionId);
  if (!election) throw new Error('선거를 찾을 수 없습니다.');

  const newCandidate = {
    ...candidate,
    id: `cand_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };

  await updateElection(electionId, {
    candidates: [...election.candidates, newCandidate],
  });
}

/**
 * Update a specific candidate within an election.
 */
export async function updateCandidate(
  electionId: string,
  candidateId: string,
  data: Partial<Omit<import('@/types').Candidate, 'id'>>
): Promise<void> {
  const election = await getElection(electionId);
  if (!election) throw new Error('선거를 찾을 수 없습니다.');

  const candidates = election.candidates.map((c) =>
    c.id === candidateId ? { ...c, ...data } : c
  );

  await updateElection(electionId, { candidates });
}

/**
 * Remove a candidate from an election and re-number remaining candidates.
 */
export async function removeCandidate(
  electionId: string,
  candidateId: string
): Promise<void> {
  const election = await getElection(electionId);
  if (!election) throw new Error('선거를 찾을 수 없습니다.');

  const candidates = election.candidates
    .filter((c) => c.id !== candidateId)
    .map((c, i) => ({ ...c, number: i + 1 }));

  await updateElection(electionId, { candidates });
}

// ============================================================
// Votes
// ============================================================

/**
 * Cast a vote using a Firestore transaction to ensure atomicity.
 * This function:
 * 1. Verifies the election is active
 * 2. Marks the voter code as used
 * 3. Creates the vote document
 * 4. Increments the election's totalVoted counter
 *
 * @returns The created vote document ID.
 */
export async function castVote(
  electionId: string,
  codeDocId: string,
  voteData: Omit<Vote, 'id' | 'timestamp'>
): Promise<string> {
  const voteId = await runTransaction(db, async (transaction) => {
    // 1. Read the election and verify it is active
    const electionRef = doc(db, COLLECTIONS.ELECTIONS, electionId);
    const electionSnap = await transaction.get(electionRef);

    if (!electionSnap.exists()) {
      throw new Error('선거를 찾을 수 없습니다.');
    }

    const electionData = electionSnap.data();
    if (electionData.status !== 'active') {
      throw new Error('현재 투표가 진행중이지 않습니다.');
    }

    // 2. Read the voter code and verify it hasn't been used
    const codeRef = doc(db, COLLECTIONS.VOTER_CODES, codeDocId);
    const codeSnap = await transaction.get(codeRef);

    if (!codeSnap.exists()) {
      throw new Error('유효하지 않은 투표 코드입니다.');
    }

    const codeData = codeSnap.data();
    if (codeData.used) {
      throw new Error('이미 사용된 투표 코드입니다.');
    }

    // 3. Create the vote document
    const voteRef = doc(collection(db, COLLECTIONS.VOTES));
    transaction.set(voteRef, {
      ...voteData,
      timestamp: serverTimestamp(),
    });

    // 4. Mark the voter code as used
    transaction.update(codeRef, {
      used: true,
      usedAt: serverTimestamp(),
    });

    // 5. Increment the election's voted counter
    transaction.update(electionRef, {
      totalVoted: (electionData.totalVoted ?? 0) + 1,
      updatedAt: serverTimestamp(),
    });

    return voteRef.id;
  });

  return voteId;
}

/**
 * Get all votes for an election, ordered by timestamp ascending.
 */
export async function getVotesByElection(electionId: string): Promise<Vote[]> {
  const q = query(
    collection(db, COLLECTIONS.VOTES),
    where('electionId', '==', electionId),
    orderBy('timestamp', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Vote);
}

/**
 * Get all votes for a specific class in an election.
 */
export async function getVotesByClass(
  electionId: string,
  classId: string
): Promise<Vote[]> {
  const q = query(
    collection(db, COLLECTIONS.VOTES),
    where('electionId', '==', electionId),
    where('classId', '==', classId),
    orderBy('timestamp', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Vote);
}

// ============================================================
// Voter Codes
// ============================================================

/**
 * Create multiple voter codes in batch.
 * Each code object should include the hashed code for secure storage.
 */
export async function createVoterCodes(
  codes: Omit<VoterCode, 'id' | 'createdAt'>[]
): Promise<string[]> {
  const ids: string[] = [];

  for (const code of codes) {
    const docRef = await addDoc(collection(db, COLLECTIONS.VOTER_CODES), {
      ...code,
      createdAt: serverTimestamp(),
    });
    ids.push(docRef.id);
  }

  return ids;
}

/**
 * Get all voter codes for a specific class.
 */
export async function getVoterCodes(
  classId: string,
  constraints?: QueryConstraint[]
): Promise<VoterCode[]> {
  const baseConstraints: QueryConstraint[] = [
    where('classId', '==', classId),
    orderBy('studentNumber', 'asc'),
  ];

  const q = query(
    collection(db, COLLECTIONS.VOTER_CODES),
    ...baseConstraints,
    ...(constraints ?? [])
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as VoterCode);
}

/**
 * Get all voter codes for a specific election, optionally filtered by classId.
 */
export async function getVoterCodesByElection(
  electionId: string,
  classId?: string
): Promise<VoterCode[]> {
  const constraints: QueryConstraint[] = [
    where('electionId', '==', electionId),
    orderBy('studentNumber', 'asc'),
  ];
  if (classId) {
    constraints.splice(1, 0, where('classId', '==', classId));
  }

  const q = query(collection(db, COLLECTIONS.VOTER_CODES), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as VoterCode);
}

/**
 * Get voter code statistics grouped by classId for an election.
 */
export async function getVoterCodeStats(
  electionId: string
): Promise<Record<string, { total: number; used: number }>> {
  const codes = await getVoterCodesByElection(electionId);
  const stats: Record<string, { total: number; used: number }> = {};

  for (const code of codes) {
    if (!stats[code.classId]) {
      stats[code.classId] = { total: 0, used: 0 };
    }
    stats[code.classId].total++;
    if (code.used) stats[code.classId].used++;
  }

  return stats;
}

/**
 * Find a voter code document by its HMAC hash.
 * Used to look up a code during vote submission without storing plaintext.
 */
export async function getVoterCodeByHash(codeHash: string): Promise<VoterCode | null> {
  const q = query(
    collection(db, COLLECTIONS.VOTER_CODES),
    where('codeHash', '==', codeHash),
    limit(1)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() } as VoterCode;
}

/**
 * Mark a voter code as used with a timestamp.
 */
export async function markCodeAsUsed(codeDocId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.VOTER_CODES, codeDocId);
  await updateDoc(docRef, {
    used: true,
    usedAt: serverTimestamp(),
  });
}

// ============================================================
// Hash Chain
// ============================================================

/**
 * Add a new block to the hash chain.
 */
export async function addBlock(
  block: Omit<HashBlock, 'id' | 'timestamp'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.HASH_CHAIN), {
    ...block,
    timestamp: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get the full hash chain for an election, ordered by block index ascending.
 */
export async function getChain(electionId: string): Promise<HashBlock[]> {
  const q = query(
    collection(db, COLLECTIONS.HASH_CHAIN),
    where('electionId', '==', electionId),
    orderBy('index', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as HashBlock);
}

/**
 * Get the latest (most recent) block in the hash chain.
 */
export async function getLatestBlock(electionId: string): Promise<HashBlock | null> {
  const q = query(
    collection(db, COLLECTIONS.HASH_CHAIN),
    where('electionId', '==', electionId),
    orderBy('index', 'desc'),
    limit(1)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() } as HashBlock;
}

// ============================================================
// Audit Logs
// ============================================================

/**
 * Create a new audit log entry.
 */
export async function createAuditLog(
  data: Omit<AuditLog, 'id' | 'timestamp'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.AUDIT_LOGS), {
    ...data,
    timestamp: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get audit logs for an election (or all if electionId omitted), ordered by timestamp descending.
 */
export async function getAuditLogs(
  electionId?: string,
  maxResults?: number
): Promise<AuditLog[]> {
  const constraints: QueryConstraint[] = [];

  if (electionId) {
    constraints.push(where('electionId', '==', electionId));
  }

  constraints.push(orderBy('timestamp', 'desc'));

  if (maxResults) {
    constraints.push(limit(maxResults));
  }

  const q = query(collection(db, COLLECTIONS.AUDIT_LOGS), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as AuditLog);
}

/**
 * Get a count of votes cast today for a given school.
 * Note: This is approximate — it counts votes across all elections for the school.
 */
export async function getTodayVoteCount(schoolId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = Timestamp.fromDate(today);

  // First get elections for this school
  const elections = await getElections(schoolId);
  if (elections.length === 0) return 0;

  let total = 0;
  for (const election of elections) {
    const q = query(
      collection(db, COLLECTIONS.VOTES),
      where('electionId', '==', election.id),
      where('timestamp', '>=', startOfDay)
    );
    const snapshot = await getDocs(q);
    total += snapshot.size;
  }

  return total;
}
