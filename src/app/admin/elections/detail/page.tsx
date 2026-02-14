'use client';

import { Suspense, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  Users,
  UserCheck,
  BarChart3,
  Vote,
  Shield,
  Hash,
  KeyRound,
  Play,
  Pause,
  StopCircle,
  CheckCircle2,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useElection } from '@/hooks/useElection';
import { updateElectionStatus, purgeElectionData } from '@/lib/firestore';
import { cn } from '@/lib/utils';
import {
  ELECTION_STATUS_LABELS,
  ELECTION_TYPE_LABELS,
} from '@/constants';
import type { ElectionStatus } from '@/types';

// ===== Status transitions =====

interface StatusAction {
  targetStatus: ElectionStatus;
  label: string;
  icon: typeof Play;
  variant: 'primary' | 'secondary' | 'danger' | 'outline';
  confirmTitle: string;
  confirmMessage: string;
}

const STATUS_ACTIONS: Partial<Record<ElectionStatus, StatusAction[]>> = {
  draft: [
    {
      targetStatus: 'active',
      label: '투표 시작',
      icon: Play,
      variant: 'primary',
      confirmTitle: '투표 바로 시작',
      confirmMessage:
        '준비 단계를 건너뛰고 바로 투표를 시작하시겠습니까? 유권자들이 즉시 투표할 수 있게 됩니다.',
    },
    {
      targetStatus: 'ready',
      label: '준비 완료',
      icon: CheckCircle2,
      variant: 'secondary',
      confirmTitle: '준비 완료 상태로 변경',
      confirmMessage:
        '선거를 준비 완료 상태로 변경하시겠습니까? 준비 완료 후에는 후보자 수정이 제한됩니다.',
    },
  ],
  ready: [
    {
      targetStatus: 'active',
      label: '투표 시작',
      icon: Play,
      variant: 'primary',
      confirmTitle: '투표 시작',
      confirmMessage:
        '지금 투표를 시작하시겠습니까? 유권자들이 투표할 수 있게 됩니다.',
    },
  ],
  active: [
    {
      targetStatus: 'paused',
      label: '일시 중지',
      icon: Pause,
      variant: 'secondary',
      confirmTitle: '투표 일시 중지',
      confirmMessage:
        '투표를 일시 중지하시겠습니까? 일시 중지 동안에는 투표가 불가능합니다.',
    },
    {
      targetStatus: 'closed',
      label: '투표 종료',
      icon: StopCircle,
      variant: 'danger',
      confirmTitle: '투표 종료',
      confirmMessage:
        '투표를 종료하시겠습니까? 종료 후에는 더 이상 투표를 받을 수 없습니다.',
    },
  ],
  paused: [
    {
      targetStatus: 'active',
      label: '투표 재개',
      icon: Play,
      variant: 'primary',
      confirmTitle: '투표 재개',
      confirmMessage: '투표를 재개하시겠습니까?',
    },
    {
      targetStatus: 'closed',
      label: '투표 종료',
      icon: StopCircle,
      variant: 'danger',
      confirmTitle: '투표 종료',
      confirmMessage:
        '투표를 종료하시겠습니까? 종료 후에는 더 이상 투표를 받을 수 없습니다.',
    },
  ],
  closed: [
    {
      targetStatus: 'finalized',
      label: '결과 확정',
      icon: Lock,
      variant: 'primary',
      confirmTitle: '결과 확정',
      confirmMessage:
        '선거 결과를 확정하시겠습니까? 확정 후에는 변경이 불가능합니다.',
    },
  ],
};

// ===== Navigation tabs =====

const NAV_TABS = [
  { href: 'candidates', label: '후보자', icon: Users },
  { href: 'voters', label: '유권자', icon: UserCheck },
  { href: 'codes', label: '투표코드', icon: KeyRound },
  { href: 'monitor', label: '실시간현황', icon: BarChart3 },
  { href: 'results', label: '개표결과', icon: Vote },
  { href: 'audit', label: '해시감사', icon: Hash },
] as const;

// ===== Badge variant mapping =====

function getStatusBadgeVariant(
  status: ElectionStatus
): 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' {
  const map: Record<ElectionStatus, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
    draft: 'default',
    ready: 'primary',
    active: 'success',
    paused: 'warning',
    closed: 'error',
    finalized: 'info',
  };
  return map[status] || 'default';
}

// ===== Page Content Component =====

function ElectionDetailPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const electionId = searchParams.get('id') ?? '';
  const { election, loading, error } = useElection(electionId);

  const [confirmAction, setConfirmAction] = useState<StatusAction | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purging, setPurging] = useState(false);

  // Vote rate calculation
  const voteRate = useMemo(() => {
    if (!election || election.totalVoters === 0) return 0;
    return Math.round((election.totalVoted / election.totalVoters) * 100);
  }, [election]);

  // Handle status transition (election updates in realtime via onSnapshot)
  const handleStatusChange = useCallback(
    async (targetStatus: ElectionStatus) => {
      if (!election) return;
      setTransitioning(true);
      try {
        await updateElectionStatus(election.id, targetStatus);
        toast.success(
          `선거 상태가 '${ELECTION_STATUS_LABELS[targetStatus]}'(으)로 변경되었습니다.`
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '상태 변경에 실패했습니다.';
        toast.error(message);
      } finally {
        setTransitioning(false);
        setConfirmAction(null);
      }
    },
    [election]
  );

  // Handle data purge (PIPA compliance)
  const handlePurge = useCallback(async () => {
    if (!election) return;
    setPurging(true);
    try {
      const result = await purgeElectionData(election.id);
      toast.success(
        `데이터 파기 완료: 투표 ${result.deletedVotes}건, 코드 ${result.deletedCodes}건 삭제`
      );
      setShowPurgeModal(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : '데이터 파기에 실패했습니다.';
      toast.error(message);
    } finally {
      setPurging(false);
    }
  }, [election]);

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" label="선거 정보를 불러오는 중..." />
      </div>
    );
  }

  // Error state
  if (error || !election) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <p className="text-lg font-medium text-gray-700">
          {error || '선거를 찾을 수 없습니다.'}
        </p>
        <Button variant="outline" onClick={() => router.push('/admin/elections')}>
          선거 목록으로 돌아가기
        </Button>
      </div>
    );
  }

  const actions = STATUS_ACTIONS[election.status] || [];
  const isFinalized = election.status === 'finalized';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Back button */}
      <button
        onClick={() => router.push('/admin/elections')}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" />
        선거 목록
      </button>

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{election.title}</h1>
            <Badge
              variant={getStatusBadgeVariant(election.status)}
              size="md"
              dot
            >
              {ELECTION_STATUS_LABELS[election.status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {ELECTION_TYPE_LABELS[election.type]}
            {election.description && ` - ${election.description}`}
          </p>
          {isFinalized && (
            <div className="mt-2 flex items-center gap-2 text-sm text-purple-600">
              <Lock className="h-4 w-4" />
              결과가 확정되었습니다. 더 이상 변경할 수 없습니다.
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const ActionIcon = action.icon;
            return (
              <Button
                key={action.targetStatus}
                variant={action.variant}
                size="md"
                onClick={() => setConfirmAction(action)}
                iconLeft={<ActionIcon className="h-4 w-4" />}
              >
                {action.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">전체 유권자</p>
                <p className="text-xl font-bold text-gray-900">
                  {election.totalVoters.toLocaleString()}
                  <span className="text-sm font-normal text-gray-400">명</span>
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">투표 완료</p>
                <p className="text-xl font-bold text-gray-900">
                  {election.totalVoted.toLocaleString()}
                  <span className="text-sm font-normal text-gray-400">명</span>
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <BarChart3 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">투표율</p>
                <p className="text-xl font-bold text-gray-900">
                  {voteRate}
                  <span className="text-sm font-normal text-gray-400">%</span>
                </p>
              </div>
            </div>
            <ProgressBar
              value={voteRate}
              size="sm"
              showPercentage={false}
              className="mt-2"
            />
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">후보자 수</p>
                <p className="text-xl font-bold text-gray-900">
                  {election.candidates.length}
                  <span className="text-sm font-normal text-gray-400">명</span>
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Navigation Tabs */}
      <Card padding="none" className="mb-8">
        <div className="flex overflow-x-auto border-b border-gray-200">
          {NAV_TABS.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <a
                key={tab.href}
                href={`/admin/elections/detail/${tab.href}/?id=${electionId}`}
                className={cn(
                  'flex shrink-0 items-center gap-2 border-b-2 px-5 py-3.5 text-sm font-medium transition-colors',
                  'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                )}
              >
                <TabIcon className="h-4 w-4" />
                {tab.label}
              </a>
            );
          })}
        </div>

        {/* Election info summary */}
        <div className="p-5">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                선거 유형
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {ELECTION_TYPE_LABELS[election.type]}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                대상 학년
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {election.targetGrades.length > 0 ? (
                  election.targetGrades.map((g) => (
                    <Badge key={g} variant="default" size="sm">
                      {g}학년
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">-</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                대상 반
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {election.targetClasses.length > 0 ? (
                  election.targetClasses.map((c) => {
                    const [g, cl] = c.split('-');
                    return (
                      <Badge key={c} variant="default" size="sm">
                        {g}-{cl}반
                      </Badge>
                    );
                  })
                ) : (
                  <span className="text-sm text-gray-500">-</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                투표 시작
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {election.startTime
                  ? election.startTime.toDate().toLocaleString('ko-KR')
                  : '미설정'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                투표 종료
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {election.endTime
                  ? election.endTime.toDate().toLocaleString('ko-KR')
                  : '미설정'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                해시 체인
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {election.hashChainHead ? (
                  <span className="font-mono text-xs">
                    {election.hashChainHead.slice(0, 16)}...
                  </span>
                ) : (
                  <span className="text-gray-400">아직 생성되지 않음</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Candidates quick preview */}
      {election.candidates.length > 0 && (
        <Card
          padding="lg"
          header={
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                등록된 후보자
              </h3>
              <a
                href={`/admin/elections/detail/candidates/?id=${electionId}`}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                전체보기
              </a>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {election.candidates.map((candidate) => (
              <div
                key={candidate.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
              >
                {candidate.photoURL ? (
                  <img
                    src={candidate.photoURL}
                    alt={candidate.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                    {candidate.number}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                      {candidate.number}
                    </span>
                    <span className="truncate font-medium text-gray-900">
                      {candidate.name}
                    </span>
                  </div>
                  <p className="truncate text-xs text-gray-500">
                    {candidate.slogan}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Data Purge Section (finalized elections only) */}
      {isFinalized && (
        <Card padding="lg" className="mt-6 border-red-200 bg-red-50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-red-800">
                개인정보 파기 (개인정보보호법 제21조)
              </h3>
              <p className="mt-1 text-xs text-red-600">
                선거 결과 확정 후 개인정보(투표 코드, 투표 기록, 후보자 사진)를 파기합니다.
                해시 체인과 감사 로그는 보존됩니다. 이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowPurgeModal(true)}
            >
              데이터 파기
            </Button>
          </div>
        </Card>
      )}

      {/* Data Purge Confirmation Modal */}
      <Modal
        isOpen={showPurgeModal}
        onClose={() => !purging && setShowPurgeModal(false)}
        title="개인정보 파기 확인"
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={() => setShowPurgeModal(false)}
              disabled={purging}
            >
              취소
            </Button>
            <Button
              variant="danger"
              size="md"
              loading={purging}
              onClick={handlePurge}
            >
              파기 실행
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            다음 데이터가 영구적으로 삭제됩니다:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
            <li>모든 투표 코드</li>
            <li>모든 투표 기록</li>
            <li>후보자 사진</li>
          </ul>
          <p className="text-sm font-medium text-red-600">
            이 작업은 되돌릴 수 없습니다.
          </p>
        </div>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={!!confirmAction}
        onClose={() => !transitioning && setConfirmAction(null)}
        title={confirmAction?.confirmTitle || ''}
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={() => setConfirmAction(null)}
              disabled={transitioning}
            >
              취소
            </Button>
            <Button
              variant={confirmAction?.variant === 'danger' ? 'danger' : 'primary'}
              size="md"
              loading={transitioning}
              onClick={() =>
                confirmAction && handleStatusChange(confirmAction.targetStatus)
              }
            >
              확인
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-sm text-gray-600">{confirmAction?.confirmMessage}</p>
        </div>
      </Modal>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" label="로딩 중..." /></div>}>
      <ElectionDetailPageContent />
    </Suspense>
  );
}
