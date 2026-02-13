'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Vote, Ban } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CandidateCard } from './CandidateCard';
import type { Election } from '@/types';

const ABSTENTION_ID = '__abstention__';

export interface BallotPaperProps {
  election: Election;
  onVote: (candidateId: string) => void;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function BallotPaper({ election, onVote }: BallotPaperProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const candidates = useMemo(() => {
    if (election.settings.shuffleCandidates) {
      return shuffleArray(election.candidates);
    }
    return [...election.candidates].sort((a, b) => a.number - b.number);
  }, [election.candidates, election.settings.shuffleCandidates]);

  const handleSelect = (candidateId: string) => {
    setSelectedId(candidateId === selectedId ? null : candidateId);
  };

  const handleVote = () => {
    if (selectedId) {
      onVote(selectedId);
    }
  };

  const selectedName =
    selectedId === ABSTENTION_ID
      ? '기권'
      : candidates.find((c) => c.id === selectedId)?.name;

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{election.title}</h1>
        <p className="mt-2 text-sm text-gray-500">
          후보를 한 명 선택한 후 아래 투표하기 버튼을 눌러주세요
        </p>
      </div>

      {/* Candidate List */}
      <div className="space-y-3">
        {candidates.map((candidate, index) => (
          <motion.div
            key={candidate.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.3 }}
          >
            <CandidateCard
              candidate={candidate}
              selected={selectedId === candidate.id}
              onSelect={handleSelect}
              showPhoto={election.settings.showCandidatePhoto}
            />
          </motion.div>
        ))}

        {/* Abstention option */}
        {election.settings.allowAbstention && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: candidates.length * 0.08,
              duration: 0.3,
            }}
            className={`
              cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200
              ${
                selectedId === ABSTENTION_ID
                  ? 'border-orange-400 bg-orange-50/50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }
            `}
            onClick={() => handleSelect(ABSTENTION_ID)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelect(ABSTENTION_ID);
              }
            }}
            aria-pressed={selectedId === ABSTENTION_ID}
            aria-label="기권"
          >
            <div className="flex items-center gap-3">
              <div
                className={`
                  flex h-10 w-10 items-center justify-center rounded-full
                  ${
                    selectedId === ABSTENTION_ID
                      ? 'bg-orange-400 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }
                `}
              >
                <Ban className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-700">기권</h3>
                <p className="text-sm text-gray-500">
                  어떤 후보도 선택하지 않아요
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Vote Button */}
      <motion.div
        className="mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Button
          size="xl"
          fullWidth
          disabled={!selectedId}
          onClick={handleVote}
          iconLeft={<Vote className="h-5 w-5" />}
          className="h-14"
        >
          {selectedId
            ? `${selectedName}${selectedId === ABSTENTION_ID ? '' : ' 후보'}에게 투표하기`
            : '후보를 선택해주세요'}
        </Button>
      </motion.div>
    </div>
  );
}
