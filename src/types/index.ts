import { Timestamp } from 'firebase/firestore';

// ===== School =====
export interface School {
  id: string;
  name: string;
  grades: number[];
  classesPerGrade: Record<number, number>;
  studentsPerClass: Record<string, number>;
  adminIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ===== Election =====
export type ElectionType = 'school_president' | 'class_president' | 'custom';
export type ElectionStatus = 'draft' | 'ready' | 'active' | 'paused' | 'closed' | 'finalized';

export interface Candidate {
  id: string;
  number: number;
  name: string;
  grade: number;
  classNum: number;
  photoURL: string;
  slogan: string;
  pledges: string[];
}

export interface ElectionSettings {
  allowAbstention: boolean;
  showRealtimeCount: boolean;
  requireConfirmation: boolean;
  maxVotesPerVoter: number;
  shuffleCandidates: boolean;
  showCandidatePhoto: boolean;
}

export interface Election {
  id: string;
  schoolId: string;
  title: string;
  type: ElectionType;
  description: string;
  targetGrades: number[];
  targetClasses: string[];
  candidates: Candidate[];
  status: ElectionStatus;
  startTime: Timestamp | null;
  endTime: Timestamp | null;
  settings: ElectionSettings;
  hashChainHead: string | null;
  totalVoters: number;
  totalVoted: number;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ===== Vote =====
export interface Vote {
  id: string;
  electionId: string;
  candidateId: string;
  encryptedVote: string;
  voteHash: string;
  previousHash: string;
  classId: string;
  timestamp: Timestamp;
  verified: boolean;
}

// ===== Voter Code =====
export interface VoterCode {
  id: string;
  electionId: string;
  code: string;
  codeHash: string;
  classId: string;
  grade: number;
  classNum: number;
  studentNumber: number;
  used: boolean;
  usedAt: Timestamp | null;
  createdAt: Timestamp;
}

// ===== Hash Chain =====
export interface HashBlock {
  id: string;
  index: number;
  timestamp: Timestamp;
  voteHash: string;
  previousHash: string;
  blockHash: string;
  classId: string;
}

// ===== Audit Log =====
export type AuditAction =
  | 'election_created'
  | 'election_updated'
  | 'election_started'
  | 'election_paused'
  | 'election_closed'
  | 'election_finalized'
  | 'vote_cast'
  | 'codes_generated'
  | 'candidate_added'
  | 'candidate_removed'
  | 'hash_chain_verified';

export interface AuditLog {
  id: string;
  electionId: string;
  action: AuditAction;
  actorId: string;
  details: string;
  timestamp: Timestamp;
  ipHash: string;
}

// ===== UI Types =====
export interface ClassVoteCount {
  classId: string;
  grade: number;
  classNum: number;
  voted: number;
  total: number;
}

export interface CandidateResult {
  candidateId: string;
  candidateName: string;
  candidateNumber: number;
  totalVotes: number;
  percentage: number;
  classCounts: Record<string, number>;
}

export interface ElectionResult {
  electionId: string;
  totalVotes: number;
  totalVoters: number;
  turnout: number;
  candidates: CandidateResult[];
  abstentions: number;
  classTurnout: Record<string, { voted: number; total: number; rate: number }>;
}

export interface VoteReceipt {
  voteHash: string;
  timestamp: number;
  blockIndex: number;
}

// ===== Form Types =====
export interface NewElectionForm {
  title: string;
  type: ElectionType;
  description: string;
  targetGrades: number[];
  targetClasses: string[];
  candidates: Omit<Candidate, 'id'>[];
  settings: ElectionSettings;
  startTime: string;
  endTime: string;
}

export interface StepProps {
  onNext: () => void;
  onBack?: () => void;
}

// ===== API Types =====
export interface VoteRequest {
  code: string;
  electionId: string;
  candidateId: string;
}

export interface VoteResponse {
  success: boolean;
  receipt?: VoteReceipt;
  error?: string;
}

export interface VerifyRequest {
  electionId: string;
  voteHash: string;
}

export interface VerifyResponse {
  found: boolean;
  blockIndex?: number;
  chainValid?: boolean;
  timestamp?: number;
}

export interface CodeGenerateRequest {
  electionId: string;
  classId: string;
  count: number;
}

export interface CodeGenerateResponse {
  success: boolean;
  codes?: { code: string; studentNumber: number }[];
  error?: string;
}
