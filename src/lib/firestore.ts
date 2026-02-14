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
  serverTimestamp,
  Timestamp,
  setDoc,
  deleteDoc,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/constants';
import type {
  School,
  Election,
  ElectionStatus,
  VoterCode,
  HashBlock,
  AuditLog,
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
// Voter Codes
// ============================================================

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

// ============================================================
// Hash Chain
// ============================================================

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

// ============================================================
// Data Purge (PIPA Compliance — 개인정보보호법 제21조)
// ============================================================

/**
 * Purge personal data for a finalized election.
 * Deletes voter codes and votes, keeping only anonymized hash chain and audit logs.
 * Must only be called on finalized elections.
 */
export async function purgeElectionData(electionId: string): Promise<{ deletedVotes: number; deletedCodes: number }> {
  // Verify election is finalized
  const election = await getElection(electionId);
  if (!election) throw new Error('선거를 찾을 수 없습니다.');
  if (election.status !== 'finalized') {
    throw new Error('결과가 확정된 선거만 데이터를 파기할 수 있습니다.');
  }

  let deletedVotes = 0;
  let deletedCodes = 0;

  // Delete all voter codes for this election
  const codesQuery = query(
    collection(db, COLLECTIONS.VOTER_CODES),
    where('electionId', '==', electionId)
  );
  const codesSnap = await getDocs(codesQuery);
  for (const d of codesSnap.docs) {
    await deleteDoc(doc(db, COLLECTIONS.VOTER_CODES, d.id));
    deletedCodes++;
  }

  // Delete all votes for this election
  const votesQuery = query(
    collection(db, COLLECTIONS.VOTES),
    where('electionId', '==', electionId)
  );
  const votesSnap = await getDocs(votesQuery);
  for (const d of votesSnap.docs) {
    await deleteDoc(doc(db, COLLECTIONS.VOTES, d.id));
    deletedVotes++;
  }

  // Clear candidate photos from election doc (data URLs)
  const candidatesWithoutPhotos = election.candidates.map((c) => ({
    ...c,
    photoURL: '',
  }));
  await updateElection(electionId, {
    candidates: candidatesWithoutPhotos,
    totalVoters: 0,
    totalVoted: 0,
  });

  return { deletedVotes, deletedCodes };
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
