'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/constants';
import type { Election } from '@/types';

// ===== useElection: single election with real-time updates =====

interface UseElectionReturn {
  election: Election | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch a single election with real-time updates via onSnapshot.
 *
 * @param electionId - The Firestore document ID of the election.
 * @returns { election, loading, error }
 */
export function useElection(electionId: string): UseElectionReturn {
  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!electionId) {
      setLoading(false);
      setError('선거 ID가 제공되지 않았습니다.');
      return;
    }

    const docRef = doc(db, COLLECTIONS.ELECTIONS, electionId);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setElection(null);
          setError('선거를 찾을 수 없습니다.');
        } else {
          setElection({
            id: snapshot.id,
            ...snapshot.data(),
          } as Election);
          setError(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('선거 실시간 구독 오류:', err);
        setError('선거 정보를 불러오는데 실패했습니다.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [electionId]);

  // refetch is a no-op since onSnapshot provides real-time updates automatically.
  // Kept for backward compatibility with components that call refetch after mutations.
  const refetch = useCallback(async () => {
    // No-op: onSnapshot handles real-time updates
  }, []);

  return { election, loading, error, refetch };
}

// ===== useElections: multiple elections =====

interface UseElectionsReturn {
  elections: Election[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch all elections, optionally filtered by schoolId, with real-time updates.
 *
 * @param schoolId - Optional school ID to filter elections.
 * @returns { elections, loading, error }
 */
export function useElections(schoolId?: string): UseElectionsReturn {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const constraints = [];
    if (schoolId) {
      constraints.push(where('schoolId', '==', schoolId));
    }
    constraints.push(orderBy('createdAt', 'desc'));

    const q = query(collection(db, COLLECTIONS.ELECTIONS), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const electionList = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Election
        );
        setElections(electionList);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('선거 목록 실시간 구독 오류:', err);
        setError('선거 목록을 불러오는데 실패했습니다.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [schoolId]);

  return { elections, loading, error };
}
