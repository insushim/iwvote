'use client';

import { useState, useMemo, use } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Activity,
  StopCircle,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { LiveMonitor } from '@/components/admin/LiveMonitor';
import { ClassProgress } from '@/components/admin/ClassProgress';
import { useElection } from '@/hooks/useElection';
import { useRealtimeVotes } from '@/hooks/useRealtimeVotes';
import { updateElection } from '@/lib/firestore';
import { classIdToLabel, formatDate } from '@/lib/utils';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MonitorPage({ params }: PageProps) {
  const { id: electionId } = use(params);
  const { election, loading: electionLoading, error: electionError, refetch } = useElection(electionId);
  const {
    classCounts,
    recentVotes,
    loading: votesLoading,
  } = useRealtimeVotes(electionId);

  const [showEndModal, setShowEndModal] = useState(false);
  const [ending, setEnding] = useState(false);

  // Classes that haven't started (0 votes)
  const notStartedClasses = useMemo(() => {
    if (!election) return [];
    return election.targetClasses.filter((classId) => {
      const count = classCounts[classId];
      return !count || count.voted === 0;
    });
  }, [election, classCounts]);

  // Recent vote timeline (last 15)
  const recentTimeline = useMemo(() => {
    return recentVotes.slice(0, 15);
  }, [recentVotes]);

  const handleEndElection = async () => {
    setEnding(true);
    try {
      await updateElection(electionId, { status: 'closed' });
      toast.success('투표가 종료되었습니다.');
      setShowEndModal(false);
      refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : '투표 종료에 실패했습니다.';
      toast.error(message);
    } finally {
      setEnding(false);
    }
  };

  if (electionLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" label="선거 정보 로딩중..." />
      </div>
    );
  }

  if (electionError || !election) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-red-500">{electionError || '선거를 찾을 수 없습니다.'}</p>
        <Link href="/admin/elections" className="mt-4 text-sm text-blue-600 hover:underline">
          선거 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const isActive = election.status === 'active';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/elections/${electionId}`}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">실시간 모니터</h1>
              {isActive && (
                <Badge variant="success" size="sm">
                  <Radio className="mr-1 h-3 w-3 animate-pulse" />
                  실시간
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500">{election.title}</p>
          </div>
        </div>

        {isActive && (
          <Button
            variant="danger"
            size="md"
            iconLeft={<StopCircle className="h-4 w-4" />}
            onClick={() => setShowEndModal(true)}
          >
            투표 종료
          </Button>
        )}
      </div>

      {/* Live Monitor (donut chart + stats) */}
      <LiveMonitor electionId={electionId} />

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Class progress - takes 2 columns */}
        <Card
          padding="md"
          className="lg:col-span-2"
          header={
            <h2 className="text-base font-semibold text-gray-900">반별 투표 현황</h2>
          }
        >
          {votesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="md" label="로딩중..." />
            </div>
          ) : (
            <ClassProgress classCounts={classCounts} />
          )}
        </Card>

        {/* Voting timeline */}
        <Card
          padding="md"
          header={
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-500" />
              <h2 className="text-base font-semibold text-gray-900">투표 타임라인</h2>
            </div>
          }
        >
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {recentTimeline.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">
                아직 투표 기록이 없습니다.
              </p>
            ) : (
              <AnimatePresence mode="popLayout">
                {recentTimeline.map((vote, index) => (
                  <motion.div
                    key={`${vote.classId}-${vote.timestamp}-${index}`}
                    initial={{ opacity: 0, x: -10, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2"
                  >
                    <div className="h-2 w-2 shrink-0 rounded-full bg-green-400" />
                    <p className="text-xs text-gray-600">
                      <span className="font-medium text-gray-900">
                        {classIdToLabel(vote.classId)}
                      </span>{' '}
                      학생이 투표했습니다
                    </p>
                    <span className="ml-auto text-xs text-gray-400">
                      {formatDate(vote.timestamp, 'HH:mm:ss')}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </Card>
      </div>

      {/* Not-started classes alert */}
      {notStartedClasses.length > 0 && isActive && (
        <Card padding="md" className="border-yellow-200 bg-yellow-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />
            <div>
              <h3 className="font-medium text-yellow-800">
                아직 투표를 시작하지 않은 반이 있습니다
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {notStartedClasses.map((classId) => (
                  <Badge key={classId} variant="warning" size="sm">
                    {classIdToLabel(classId)}이 아직 시작하지 않았습니다
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* End Election Confirmation Modal */}
      <Modal
        isOpen={showEndModal}
        onClose={() => setShowEndModal(false)}
        title="투표 종료 확인"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="font-medium text-red-800">
                  정말 투표를 종료하시겠습니까?
                </p>
                <p className="mt-1 text-sm text-red-600">
                  투표가 종료되면 더 이상 투표할 수 없으며, 이 작업은 되돌릴 수 없습니다.
                </p>
              </div>
            </div>
          </div>

          {notStartedClasses.length > 0 && (
            <div className="rounded-lg bg-yellow-50 p-3">
              <p className="text-sm text-yellow-700">
                아직 {notStartedClasses.length}개 반이 투표를 시작하지 않았습니다.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowEndModal(false)}
              disabled={ending}
            >
              취소
            </Button>
            <Button
              variant="danger"
              onClick={handleEndElection}
              loading={ending}
            >
              투표 종료
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
