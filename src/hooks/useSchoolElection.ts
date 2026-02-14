'use client';

import { useAuthContext } from '@/context/AuthContext';
import { useElection } from '@/hooks/useElection';

/**
 * Wraps useElection with school ownership verification.
 * Returns `authorized` — true if current user's school matches the election's school,
 * false if mismatch, or null while still loading.
 */
export function useSchoolElection(electionId: string) {
  const { schoolId, isSuperAdmin } = useAuthContext();
  const result = useElection(electionId);

  const authorized = result.election
    ? (isSuperAdmin || result.election.schoolId === schoolId)
    : null; // still loading or not found

  return { ...result, authorized };
}
