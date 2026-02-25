"use client";

import { useState, useCallback } from "react";
import { httpsCallable } from "firebase/functions";
import { getChain } from "@/lib/firestore";
import { functions } from "@/lib/firebase";
import type { HashBlock } from "@/types";

interface UseHashChainReturn {
  blocks: HashBlock[];
  loading: boolean;
  verifying: boolean;
  verified: boolean | null;
  blockCount: number;
  brokenAt: number | null;
  error: string | null;
  fetchBlocks: () => Promise<void>;
  runVerification: () => Promise<void>;
  findByHash: (hash: string) => HashBlock | null;
}

export function useHashChain(electionId: string): UseHashChainReturn {
  const [blocks, setBlocks] = useState<HashBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [blockCount, setBlockCount] = useState(0);
  const [brokenAt, setBrokenAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchBlocks = useCallback(async () => {
    if (!electionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getChain(electionId);
      const sorted = [...data].sort((a, b) => a.index - b.index);
      setBlocks(sorted);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "해시 체인을 불러오는데 실패했습니다.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [electionId]);

  // Use server-side verifyHashChain Cloud Function for reliable verification
  const runVerification = useCallback(async () => {
    if (!electionId) return;
    setVerifying(true);
    setError(null);
    setBrokenAt(null);

    try {
      const verifyFn = httpsCallable<
        { electionId: string },
        { valid: boolean; blockCount: number; brokenAt?: number }
      >(functions, "verifyHashChain");

      const result = await verifyFn({ electionId });
      const { valid, blockCount: count, brokenAt: broken } = result.data;

      setVerified(valid);
      setBlockCount(count);
      setBrokenAt(broken !== undefined && broken >= 0 ? broken : null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "검증에 실패했습니다.";
      setError(message);
      setVerified(false);
    } finally {
      setVerifying(false);
    }
  }, [electionId]);

  const findByHash = useCallback(
    (hash: string): HashBlock | null => {
      const normalizedHash = hash.trim().toLowerCase();
      return (
        blocks.find(
          (b) =>
            b.voteHash.toLowerCase() === normalizedHash ||
            b.blockHash.toLowerCase() === normalizedHash,
        ) ?? null
      );
    },
    [blocks],
  );

  return {
    blocks,
    loading,
    verifying,
    verified,
    blockCount,
    brokenAt,
    error,
    fetchBlocks,
    runVerification,
    findByHash,
  };
}
