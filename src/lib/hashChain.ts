import CryptoJS from 'crypto-js';
import { HASH_CHAIN_GENESIS } from '@/constants';
import type { HashBlock } from '@/types';

/**
 * Compute a SHA-256 hash for a vote.
 * Combines vote data, timestamp, and the previous hash to form a chain link.
 *
 * @param voteData - The vote data string (e.g. encrypted vote or candidateId).
 * @param timestamp - The timestamp of the vote in milliseconds.
 * @param previousHash - The hash of the previous entry in the chain.
 * @returns The hex-encoded SHA-256 hash.
 */
export function computeVoteHash(
  voteData: string,
  timestamp: number,
  previousHash: string
): string {
  const input = `${voteData}|${timestamp}|${previousHash}`;
  return CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex);
}

/**
 * Compute a SHA-256 block hash for the hash chain.
 * Combines block metadata to create a verifiable block hash.
 *
 * @param index - The block index in the chain.
 * @param timestamp - The block creation timestamp in milliseconds.
 * @param voteHash - The vote hash contained in this block.
 * @param previousHash - The block hash of the previous block.
 * @returns The hex-encoded SHA-256 block hash.
 */
export function computeBlockHash(
  index: number,
  timestamp: number,
  voteHash: string,
  previousHash: string
): string {
  const input = `${index}|${timestamp}|${voteHash}|${previousHash}`;
  return CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex);
}

/**
 * Verify the integrity of an entire hash chain.
 * Checks that each block's hash is correctly computed and that
 * the previousHash links form an unbroken chain.
 *
 * @param blocks - Array of HashBlock objects sorted by index ascending.
 * @returns true if the chain is valid, false if any block is tampered or broken.
 */
export function verifyChain(blocks: HashBlock[]): boolean {
  if (blocks.length === 0) {
    return true;
  }

  const sorted = [...blocks].sort((a, b) => a.index - b.index);

  // Verify genesis block
  const genesis = sorted[0];
  if (genesis.index !== 0) {
    return false;
  }
  if (genesis.previousHash !== HASH_CHAIN_GENESIS) {
    return false;
  }

  const genesisTimestamp = genesis.timestamp.toMillis
    ? genesis.timestamp.toMillis()
    : Number(genesis.timestamp);

  const expectedGenesisHash = computeBlockHash(
    genesis.index,
    genesisTimestamp,
    genesis.voteHash,
    genesis.previousHash
  );
  if (genesis.blockHash !== expectedGenesisHash) {
    return false;
  }

  // Verify each subsequent block
  for (let i = 1; i < sorted.length; i++) {
    const currentBlock = sorted[i];
    const previousBlock = sorted[i - 1];

    // Check index continuity
    if (currentBlock.index !== previousBlock.index + 1) {
      return false;
    }

    // Check previousHash links to the prior block's blockHash
    if (currentBlock.previousHash !== previousBlock.blockHash) {
      return false;
    }

    // Recompute and verify block hash
    const blockTimestamp = currentBlock.timestamp.toMillis
      ? currentBlock.timestamp.toMillis()
      : Number(currentBlock.timestamp);

    const expectedHash = computeBlockHash(
      currentBlock.index,
      blockTimestamp,
      currentBlock.voteHash,
      currentBlock.previousHash
    );

    if (currentBlock.blockHash !== expectedHash) {
      return false;
    }
  }

  return true;
}

/**
 * Create the genesis (first) block for a new hash chain.
 * The genesis block has index 0 and previousHash "0".
 *
 * @returns A partial HashBlock suitable for storing as the first chain entry.
 */
export function createGenesisBlock(): Omit<HashBlock, 'id' | 'timestamp' | 'classId'> {
  const timestamp = Date.now();
  const voteHash = CryptoJS.SHA256(`genesis|${timestamp}`).toString(CryptoJS.enc.Hex);
  const previousHash = HASH_CHAIN_GENESIS;
  const blockHash = computeBlockHash(0, timestamp, voteHash, previousHash);

  return {
    index: 0,
    voteHash,
    previousHash,
    blockHash,
  };
}
