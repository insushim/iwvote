'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  doc as firestoreDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/constants';

interface RealtimeVoteData {
  classCounts: Record<string, { voted: number; total: number }>;
  totalVoted: number;
  totalVoters: number;
  turnoutRate: number;
  recentVotes: { classId: string; timestamp: number }[];
  loading: boolean;
  error: string | null;
}

export function useRealtimeVotes(electionId: string): RealtimeVoteData {
  const [classCounts, setClassCounts] = useState<Record<string, { voted: number; total: number }>>({});
  const [totalVoted, setTotalVoted] = useState(0);
  const [totalVoters, setTotalVoters] = useState(0);
  const [recentVotes, setRecentVotes] = useState<{ classId: string; timestamp: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!electionId) return;

    const unsubscribers: (() => void)[] = [];

    // Listen to election document for totalVoters / totalVoted
    const electionDocUnsub = onSnapshot(
      firestoreDoc(db, COLLECTIONS.ELECTIONS, electionId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setTotalVoters(data.totalVoters ?? 0);
          setTotalVoted(data.totalVoted ?? 0);
        }
      },
      (err) => {
        setError(err.message);
      }
    );
    unsubscribers.push(electionDocUnsub);

    // Listen to voter codes for per-class counts
    const codesQuery = query(
      collection(db, COLLECTIONS.VOTER_CODES),
      where('electionId', '==', electionId)
    );

    const codesUnsub = onSnapshot(
      codesQuery,
      (snap) => {
        const counts: Record<string, { voted: number; total: number }> = {};

        snap.docs.forEach((d) => {
          const data = d.data();
          const classId = data.classId as string;
          if (!counts[classId]) {
            counts[classId] = { voted: 0, total: 0 };
          }
          counts[classId].total += 1;
          if (data.used) {
            counts[classId].voted += 1;
          }
        });

        setClassCounts(counts);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    unsubscribers.push(codesUnsub);

    // Listen to votes for recent activity timeline
    const votesQuery = query(
      collection(db, COLLECTIONS.VOTES),
      where('electionId', '==', electionId),
      orderBy('timestamp', 'desc')
    );

    const votesUnsub = onSnapshot(
      votesQuery,
      (snap) => {
        const recent = snap.docs.slice(0, 30).map((d) => {
          const data = d.data();
          return {
            classId: data.classId as string,
            timestamp: data.timestamp?.toMillis?.() ?? Date.now(),
          };
        });
        setRecentVotes(recent);
      },
      (err) => {
        setError(err.message);
      }
    );
    unsubscribers.push(votesUnsub);

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [electionId]);

  const turnoutRate = totalVoters > 0 ? (totalVoted / totalVoters) * 100 : 0;

  return {
    classCounts,
    totalVoted,
    totalVoters,
    turnoutRate,
    recentVotes,
    loading,
    error,
  };
}
