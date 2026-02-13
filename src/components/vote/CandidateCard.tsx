'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Check, ChevronDown, ChevronUp, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GRADE_LABELS } from '@/constants';
import type { Candidate } from '@/types';

export interface CandidateCardProps {
  candidate: Candidate;
  selected: boolean;
  onSelect: (candidateId: string) => void;
  showPhoto: boolean;
}

export function CandidateCard({ candidate, selected, onSelect, showPhoto }: CandidateCardProps) {
  const [showPledges, setShowPledges] = useState(false);

  return (
    <motion.div
      layout
      animate={selected ? { scale: 1.02 } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        'relative cursor-pointer rounded-2xl border-2 bg-white p-4 transition-colors duration-200',
        'hover:shadow-md',
        selected
          ? 'border-blue-500 bg-blue-50/50 shadow-md'
          : 'border-gray-200 hover:border-gray-300'
      )}
      onClick={() => onSelect(candidate.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(candidate.id);
        }
      }}
      aria-pressed={selected}
      aria-label={`기호 ${candidate.number}번 ${candidate.name}`}
    >
      {/* Selected checkmark */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 shadow-md"
        >
          <Check className="h-5 w-5 text-white" strokeWidth={3} />
        </motion.div>
      )}

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-4">
        {/* Candidate number badge */}
        <div className="flex flex-col items-center gap-2">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold',
              selected
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700'
            )}
          >
            {candidate.number}
          </div>

          {/* Photo */}
          {showPhoto && (
            <div className="relative h-[120px] w-[120px] shrink-0 overflow-hidden rounded-xl bg-gray-100">
              {candidate.photoURL ? (
                <Image
                  src={candidate.photoURL}
                  alt={`${candidate.name} 사진`}
                  fill
                  className="object-cover"
                  sizes="120px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-100">
                  <User className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left">
          <h3 className="text-xl font-bold text-gray-900">{candidate.name}</h3>
          <p className="mt-0.5 text-sm text-gray-500">
            {GRADE_LABELS[candidate.grade]} {candidate.classNum}반
          </p>
          {candidate.slogan && (
            <p className="mt-2 text-sm font-medium text-gray-700 line-clamp-1">
              &ldquo;{candidate.slogan}&rdquo;
            </p>
          )}

          {/* Pledges toggle */}
          {candidate.pledges && candidate.pledges.length > 0 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPledges(!showPledges);
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
              >
                공약 보기
                {showPledges ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              <motion.div
                initial={false}
                animate={{
                  height: showPledges ? 'auto' : 0,
                  opacity: showPledges ? 1 : 0,
                }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <ul className="mt-2 space-y-1.5 pl-1">
                  {candidate.pledges.map((pledge, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm text-gray-600"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                        {idx + 1}
                      </span>
                      <span>{pledge}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
