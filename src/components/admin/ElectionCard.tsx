'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, Users, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import {
  ELECTION_TYPE_LABELS,
  ELECTION_STATUS_LABELS,
} from '@/constants';
import type { Election } from '@/types';

interface ElectionCardProps {
  election: Election;
  index?: number;
}

function formatTimestamp(ts: { toDate: () => Date } | null): string {
  if (!ts) return '-';
  try {
    const date = ts.toDate();
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return '-';
  }
}

function getStatusBadgeVariant(
  status: string
): 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' {
  const map: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
    draft: 'default',
    ready: 'primary',
    active: 'success',
    paused: 'warning',
    closed: 'error',
    finalized: 'info',
  };
  return map[status] ?? 'default';
}

function getTypeBadgeVariant(
  type: string
): 'default' | 'primary' | 'info' {
  const map: Record<string, 'default' | 'primary' | 'info'> = {
    school_president: 'primary',
    class_president: 'info',
    custom: 'default',
  };
  return map[type] ?? 'default';
}

export function ElectionCard({ election, index = 0 }: ElectionCardProps) {
  const voteRate =
    election.totalVoters > 0
      ? Math.round((election.totalVoted / election.totalVoters) * 100)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group rounded-xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
    >
      {/* Header: title + badges */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-gray-900 sm:text-lg">
            {election.title}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge
              variant={getTypeBadgeVariant(election.type)}
              size="sm"
            >
              {ELECTION_TYPE_LABELS[election.type] ?? election.type}
            </Badge>
            <Badge
              variant={getStatusBadgeVariant(election.status)}
              size="sm"
              dot
            >
              {ELECTION_STATUS_LABELS[election.status] ?? election.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Vote progress */}
      <div className="mt-4">
        <ProgressBar
          value={voteRate}
          label="투표율"
          showPercentage
          size="sm"
        />
      </div>

      {/* Info row */}
      <div className="mt-4 flex flex-col gap-2 text-sm text-gray-500 sm:flex-row sm:items-center sm:gap-4">
        {/* Voter count */}
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-gray-400" />
          <span>
            {election.totalVoted.toLocaleString()} / {election.totalVoters.toLocaleString()}명 투표
          </span>
        </div>

        {/* Date range */}
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span>
            {formatTimestamp(election.startTime)} ~ {formatTimestamp(election.endTime)}
          </span>
        </div>
      </div>

      {/* Action button */}
      <div className="mt-4 flex justify-end">
        <Link href={`/admin/elections/detail?id=${election.id}`}>
          <Button
            variant="outline"
            size="sm"
            iconRight={
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            }
          >
            관리
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
