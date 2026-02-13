'use client';

import { useState, useCallback } from 'react';
import { getChain } from '@/lib/firestore';
import { computeBlockHash } from '@/lib/hashChain';
import type { HashBlock } from '@/types';

interface BlockVerification {
  index: number;
  valid: boolean;
  error?: string;
}

interface UseHashChainReturn {
  blocks: HashBlock[];
  loading: boolean;
  verifying: boolean;
  verified: boolean | null;
  verificationResults: BlockVerification[];
  firstInvalidIndex: number | null;
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
  const [verificationResults, setVerificationResults] = useState<BlockVerification[]>([]);
  const [firstInvalidIndex, setFirstInvalidIndex] = useState<number | null>(null);
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
      const message = err instanceof Error ? err.message : '해시 체인을 불러오는데 실패했습니다.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [electionId]);

  const runVerification = useCallback(async () => {
    setVerifying(true);
    setError(null);
    setFirstInvalidIndex(null);

    try {
      if (blocks.length === 0) {
        await fetchBlocks();
      }

      const currentBlocks = blocks.length > 0 ? blocks : await getChain(electionId).then((data) => {
        const sorted = [...data].sort((a, b) => a.index - b.index);
        setBlocks(sorted);
        return sorted;
      });

      const results: BlockVerification[] = [];
      let foundInvalid: number | null = null;

      for (let i = 0; i < currentBlocks.length; i++) {
        const block = currentBlocks[i];
        const prevBlock = i > 0 ? currentBlocks[i - 1] : null;

        let valid = true;
        let errorMsg: string | undefined;

        // Check index continuity
        if (i === 0 && block.index !== 0) {
          valid = false;
          errorMsg = '첫 블록의 인덱스가 0이 아닙니다.';
        } else if (i > 0 && block.index !== (prevBlock?.index ?? 0) + 1) {
          valid = false;
          errorMsg = '블록 인덱스 연속성 오류입니다.';
        }

        // Check previous hash linkage
        if (valid && i > 0 && prevBlock && block.previousHash !== prevBlock.blockHash) {
          valid = false;
          errorMsg = '이전 해시 연결이 올바르지 않습니다.';
        }

        // Re-compute and verify block hash
        if (valid) {
          const timestamp = block.timestamp?.toMillis
            ? block.timestamp.toMillis()
            : Number(block.timestamp);

          const expectedHash = computeBlockHash(
            block.index,
            timestamp,
            block.voteHash,
            block.previousHash
          );

          if (block.blockHash !== expectedHash) {
            valid = false;
            errorMsg = '블록 해시가 일치하지 않습니다.';
          }
        }

        if (!valid && foundInvalid === null) {
          foundInvalid = i;
        }

        results.push({ index: i, valid, error: errorMsg });
      }

      setVerificationResults(results);
      setFirstInvalidIndex(foundInvalid);
      setVerified(foundInvalid === null);
    } catch (err) {
      const message = err instanceof Error ? err.message : '검증에 실패했습니다.';
      setError(message);
      setVerified(false);
    } finally {
      setVerifying(false);
    }
  }, [blocks, electionId, fetchBlocks]);

  const findByHash = useCallback(
    (hash: string): HashBlock | null => {
      const normalizedHash = hash.trim().toLowerCase();
      return (
        blocks.find(
          (b) =>
            b.voteHash.toLowerCase() === normalizedHash ||
            b.blockHash.toLowerCase() === normalizedHash
        ) ?? null
      );
    },
    [blocks]
  );

  return {
    blocks,
    loading,
    verifying,
    verified,
    verificationResults,
    firstInvalidIndex,
    error,
    fetchBlocks,
    runVerification,
    findByHash,
  };
}
