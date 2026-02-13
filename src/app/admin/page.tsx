'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Plus, Inbox } from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';
import { DashboardStats, type DashboardStatsData } from '@/components/admin/DashboardStats';
import { ElectionCard } from '@/components/admin/ElectionCard';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import {
  getElections,
  getAuditLogs,
  getTodayVoteCount,
} from '@/lib/firestore';
import {
  ELECTION_STATUS_LABELS,
} from '@/constants';
import type { Election, AuditLog } from '@/types';

const AUDIT_ACTION_LABELS: Record<string, string> = {
  election_created: '새 선거를 생성했습니다',
  election_updated: '선거 정보를 수정했습니다',
  election_started: '선거를 시작했습니다',
  election_paused: '선거를 일시 중지했습니다',
  election_closed: '선거를 종료했습니다',
  election_finalized: '선거 결과를 확정했습니다',
  vote_cast: '투표가 접수되었습니다',
  codes_generated: '투표 코드를 생성했습니다',
  candidate_added: '후보자를 추가했습니다',
  candidate_removed: '후보자를 삭제했습니다',
  hash_chain_verified: '해시 체인을 검증했습니다',
};

function formatRelativeTime(ts: { toDate: () => Date } | null): string {
  if (!ts) return '';
  try {
    const date = ts.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;

    return new Intl.DateTimeFormat('ko-KR', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return '';
  }
}

export default function AdminDashboardPage() {
  const { user, userProfile, isSuperAdmin } = useAuthContext();
  const [elections, setElections] = useState<Election[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<DashboardStatsData>({
    activeElections: 0,
    todayVotes: 0,
    avgTurnout: 0,
    completedElections: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return;
      const schoolId = user.uid;
      try {
        const [allElections, logs, todayVotes] = await Promise.all([
          getElections(schoolId),
          getAuditLogs(undefined, 10),
          getTodayVoteCount(schoolId),
        ]);

        setElections(allElections);
        setAuditLogs(logs);

        const activeElections = allElections.filter(
          (e: Election) => e.status === 'active'
        );
        const completedElections = allElections.filter(
          (e: Election) => e.status === 'closed' || e.status === 'finalized'
        );

        // Calculate average turnout across all elections with voters
        const electionsWithVoters = allElections.filter(
          (e: Election) => e.totalVoters > 0
        );
        const avgTurnout =
          electionsWithVoters.length > 0
            ? Math.round(
                electionsWithVoters.reduce(
                  (sum: number, e: Election) => sum + (e.totalVoted / e.totalVoters) * 100,
                  0
                ) / electionsWithVoters.length
              )
            : 0;

        setStats({
          activeElections: allElections.length,
          todayVotes,
          avgTurnout,
          completedElections: completedElections.length,
        });
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  const recentElections = elections.slice(0, 6);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" color="blue" />
          <p className="text-sm text-gray-500">대시보드를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">대시보드</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            안녕하세요, {userProfile?.displayName ?? user?.displayName ?? '관리자'}님
            {isSuperAdmin && <span className="ml-1.5 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">슈퍼관리자</span>}
          </p>
        </div>
        <a href="/admin/elections/new/">
          <Button
            size="md"
            iconLeft={<Plus className="h-4 w-4" />}
          >
            새 선거 만들기
          </Button>
        </a>
      </div>

      {/* Stats grid */}
      <DashboardStats stats={stats} />

      {/* Active elections section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            최근 선거
          </h2>
          {recentElections.length > 0 && (
            <a
              href="/admin/elections/"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              전체 보기
            </a>
          )}
        </div>

        {recentElections.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentElections.map((election, idx) => (
              <ElectionCard
                key={election.id}
                election={election}
                index={idx}
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-12"
          >
            <Inbox className="h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-500">
              아직 선거가 없습니다
            </p>
            <a href="/admin/elections/new/" className="mt-4">
              <Button
                variant="outline"
                size="sm"
                iconLeft={<Plus className="h-4 w-4" />}
              >
                새 선거 만들기
              </Button>
            </a>
          </motion.div>
        )}
      </section>

      {/* Recent activity timeline */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">최근 활동</h2>
        </div>

        {auditLogs.length > 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="divide-y divide-gray-100">
              {auditLogs.map((log, idx) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  className="flex items-start gap-3 px-4 py-3 sm:px-5"
                >
                  {/* Timeline dot */}
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-400" />

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700">
                      {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                    </p>
                    {log.details && (
                      <p className="mt-0.5 truncate text-xs text-gray-400">
                        {log.details}
                      </p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span className="shrink-0 text-xs text-gray-400">
                    {formatRelativeTime(log.timestamp)}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-8">
            <Activity className="h-10 w-10 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">
              아직 활동 기록이 없습니다
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
