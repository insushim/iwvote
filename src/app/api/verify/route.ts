import { NextRequest, NextResponse } from 'next/server';
import {
  collection,
  getDocs,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, HASH_CHAIN_GENESIS } from '@/constants';
import { computeBlockHash } from '@/lib/hashChain';
import type { VerifyRequest, VerifyResponse, HashBlock } from '@/types';

/**
 * Extract a timestamp in milliseconds from a HashBlock's timestamp field.
 * Handles both Firestore Timestamp objects and raw numbers.
 */
function getTimestampMs(block: HashBlock): number {
  if (block.timestamp && typeof block.timestamp.toMillis === 'function') {
    return block.timestamp.toMillis();
  }
  return Number(block.timestamp);
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<VerifyResponse>> {
  try {
    // 1. Parse body: { electionId, voteHash }
    let body: VerifyRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ found: false }, { status: 400 });
    }

    const { electionId, voteHash } = body;

    if (!electionId || !voteHash) {
      return NextResponse.json({ found: false }, { status: 400 });
    }

    const hashChainCol = collection(db, COLLECTIONS.HASH_CHAIN);

    // 2. Search hashChain collection for matching voteHash
    const matchQuery = query(
      hashChainCol,
      where('voteHash', '==', voteHash),
      limit(1)
    );
    const matchSnap = await getDocs(matchQuery);

    if (matchSnap.empty) {
      return NextResponse.json({ found: false }, { status: 200 });
    }

    const matchedBlock = {
      id: matchSnap.docs[0].id,
      ...matchSnap.docs[0].data(),
    } as HashBlock;
    const blockIndex = matchedBlock.index;
    const blockTimestamp = getTimestampMs(matchedBlock);

    // 3. Verify chain integrity around that block
    let chainValid = true;

    // Verify the matched block's own hash
    const expectedBlockHash = computeBlockHash(
      matchedBlock.index,
      blockTimestamp,
      matchedBlock.voteHash,
      matchedBlock.previousHash
    );

    if (matchedBlock.blockHash !== expectedBlockHash) {
      chainValid = false;
    }

    // Verify link to previous block
    if (chainValid && matchedBlock.index > 0) {
      const prevQuery = query(
        hashChainCol,
        where('index', '==', matchedBlock.index - 1),
        limit(1)
      );
      const prevSnap = await getDocs(prevQuery);

      if (!prevSnap.empty) {
        const prevBlock = prevSnap.docs[0].data() as HashBlock;

        // Previous block's blockHash should match this block's previousHash
        if (prevBlock.blockHash !== matchedBlock.previousHash) {
          chainValid = false;
        }

        // Verify previous block's own hash
        const prevTimestamp = getTimestampMs({
          ...prevBlock,
          id: prevSnap.docs[0].id,
        } as HashBlock);
        const expectedPrevHash = computeBlockHash(
          prevBlock.index,
          prevTimestamp,
          prevBlock.voteHash,
          prevBlock.previousHash
        );
        if (prevBlock.blockHash !== expectedPrevHash) {
          chainValid = false;
        }
      } else {
        // Previous block should exist but doesn't - chain is broken
        chainValid = false;
      }
    } else if (chainValid && matchedBlock.index === 0) {
      // Genesis block: previousHash should be HASH_CHAIN_GENESIS
      if (matchedBlock.previousHash !== HASH_CHAIN_GENESIS) {
        chainValid = false;
      }
    }

    // Verify link to next block (if it exists)
    if (chainValid) {
      const nextQuery = query(
        hashChainCol,
        where('index', '==', matchedBlock.index + 1),
        limit(1)
      );
      const nextSnap = await getDocs(nextQuery);

      if (!nextSnap.empty) {
        const nextBlock = nextSnap.docs[0].data() as HashBlock;

        // This block's blockHash should match next block's previousHash
        if (nextBlock.previousHash !== matchedBlock.blockHash) {
          chainValid = false;
        }

        // Verify next block's own hash
        const nextTimestamp = getTimestampMs({
          ...nextBlock,
          id: nextSnap.docs[0].id,
        } as HashBlock);
        const expectedNextHash = computeBlockHash(
          nextBlock.index,
          nextTimestamp,
          nextBlock.voteHash,
          nextBlock.previousHash
        );
        if (nextBlock.blockHash !== expectedNextHash) {
          chainValid = false;
        }
      }
      // If no next block exists, that's fine - this might be the latest block
    }

    // 4. Return result
    return NextResponse.json(
      {
        found: true,
        blockIndex,
        chainValid,
        timestamp: blockTimestamp,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('투표 검증 API 오류:', error);

    return NextResponse.json({ found: false }, { status: 500 });
  }
}
