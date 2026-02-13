export const APP_NAME = '우리한표';
export const APP_NAME_EN = 'WooriVote';
export const APP_SLOGAN = '소중한 한 표, 투명한 결과';

// Vote Code Character Set (excluding confusing chars: 0/O, 1/I/L)
export const VOTE_CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const VOTE_CODE_LENGTH = 6;

// Election Types
export const ELECTION_TYPE_LABELS: Record<string, string> = {
  school_president: '전교 회장 선거',
  class_president: '반 회장 선거',
  custom: '사용자 정의 투표',
};

// Election Status
export const ELECTION_STATUS_LABELS: Record<string, string> = {
  draft: '작성중',
  ready: '준비완료',
  active: '투표진행중',
  paused: '일시중지',
  closed: '투표종료',
  finalized: '결과확정',
};

export const ELECTION_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-neutral-100 text-neutral-600',
  ready: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-red-100 text-red-700',
  finalized: 'bg-purple-100 text-purple-700',
};

// Rate Limiting
export const RATE_LIMIT_MAX_REQUESTS = 5;
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

// Crypto
export const HASH_CHAIN_GENESIS = '0';

// UI Constants
export const MAX_PLEDGES = 5;
export const MAX_PLEDGE_LENGTH = 100;
export const MAX_SLOGAN_LENGTH = 40;
export const MIN_BUTTON_HEIGHT = 56;

// Auto-redirect delay (ms)
export const VOTE_COMPLETE_REDIRECT_MS = 5000;

// Chart Colors
export const CHART_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#22C55E', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

// Grade labels
export const GRADE_LABELS: Record<number, string> = {
  1: '1학년',
  2: '2학년',
  3: '3학년',
  4: '4학년',
  5: '5학년',
  6: '6학년',
};

// Default school settings
export const DEFAULT_GRADES = [1, 2, 3, 4, 5, 6];

export const DEFAULT_ELECTION_SETTINGS = {
  allowAbstention: true,
  showRealtimeCount: true,
  requireConfirmation: true,
  maxVotesPerVoter: 1,
  shuffleCandidates: false,
  showCandidatePhoto: true,
};

// Firestore collection names
export const COLLECTIONS = {
  SCHOOLS: 'schools',
  ELECTIONS: 'elections',
  VOTES: 'votes',
  VOTER_CODES: 'voterCodes',
  HASH_CHAIN: 'hashChain',
  AUDIT_LOGS: 'auditLogs',
  USERS: 'users',
} as const;
