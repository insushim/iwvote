'use client';

import { useState, useEffect, useCallback, useMemo, use } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Download,
  Shield,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { ResultChart } from '@/components/admin/ResultChart';
import { ClassResultTable } from '@/components/admin/ClassResultTable';
import { useElection } from '@/hooks/useElection';
import { useHashChain } from '@/hooks/useHashChain';
import { updateElection, getVotesByElection } from '@/lib/firestore';
import { CHART_COLORS } from '@/constants';
import type { ElectionResult, CandidateResult } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ResultsPage({ params }: PageProps) {
  const { id: electionId } = use(params);
  const { election, loading: electionLoading, error: electionError, refetch } = useElection(electionId);
  const {
    verified,
    verifying,
    runVerification,
    fetchBlocks,
  } = useHashChain(electionId);

  const [results, setResults] = useState<ElectionResult | null>(null);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // Compute results from votes
  const computeResults = useCallback(async () => {
    if (!election) return;
    setResultsLoading(true);

    try {
      const votes = await getVotesByElection(electionId);

      // Count votes per candidate
      const candidateCounts: Record<string, { total: number; classCounts: Record<string, number> }> = {};
      election.candidates.forEach((c) => {
        candidateCounts[c.id] = { total: 0, classCounts: {} };
      });

      let abstentions = 0;

      votes.forEach((vote) => {
        if (vote.candidateId === 'abstain' || vote.candidateId === '') {
          abstentions++;
          return;
        }
        if (candidateCounts[vote.candidateId]) {
          candidateCounts[vote.candidateId].total++;
          const classId = vote.classId;
          candidateCounts[vote.candidateId].classCounts[classId] =
            (candidateCounts[vote.candidateId].classCounts[classId] ?? 0) + 1;
        }
      });

      const totalVotes = votes.length;
      const totalVoters = election.totalVoters;
      const turnout = totalVoters > 0 ? (totalVotes / totalVoters) * 100 : 0;

      const validVotes = totalVotes - abstentions;

      const candidateResults: CandidateResult[] = election.candidates.map((c) => {
        const count = candidateCounts[c.id];
        return {
          candidateId: c.id,
          candidateName: c.name,
          candidateNumber: c.number,
          totalVotes: count.total,
          percentage: validVotes > 0 ? (count.total / validVotes) * 100 : 0,
          classCounts: count.classCounts,
        };
      });

      // Compute class turnout
      const classTurnout: Record<string, { voted: number; total: number; rate: number }> = {};

      // Count votes per class
      const votesByClass: Record<string, number> = {};
      votes.forEach((v) => {
        votesByClass[v.classId] = (votesByClass[v.classId] ?? 0) + 1;
      });

      election.targetClasses.forEach((classId) => {
        const voted = votesByClass[classId] ?? 0;
        // We don't have per-class total from election object directly;
        // approximate using totalVoters / targetClasses count, or use real data
        const total = Math.round(totalVoters / election.targetClasses.length);
        classTurnout[classId] = {
          voted,
          total,
          rate: total > 0 ? (voted / total) * 100 : 0,
        };
      });

      setResults({
        electionId,
        totalVotes,
        totalVoters,
        turnout,
        candidates: candidateResults,
        abstentions,
        classTurnout,
      });
    } catch (err) {
      console.error('Failed to compute results:', err);
      toast.error('결과를 계산하는데 실패했습니다.');
    } finally {
      setResultsLoading(false);
    }
  }, [election, electionId]);

  useEffect(() => {
    if (election) {
      computeResults();
      fetchBlocks();
    }
  }, [election, computeResults, fetchBlocks]);

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      await updateElection(electionId, { status: 'finalized' });
      toast.success('선거 결과가 확정되었습니다.');
      setShowFinalizeModal(false);
      refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : '결과 확정에 실패했습니다.';
      toast.error(message);
    } finally {
      setFinalizing(false);
    }
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  // Bar chart data
  const barData = useMemo(() => {
    if (!results) return [];
    return results.candidates
      .sort((a, b) => a.candidateNumber - b.candidateNumber)
      .map((c) => ({
        name: `${c.candidateNumber}번 ${c.candidateName}`,
        votes: c.totalVotes,
        percentage: c.percentage,
      }));
  }, [results]);

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

  // Only accessible when closed or finalized
  if (election.status !== 'closed' && election.status !== 'finalized') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Lock className="h-12 w-12 text-gray-300" />
        <p className="mt-4 text-gray-500">투표가 종료된 후에 결과를 확인할 수 있습니다.</p>
        <Link
          href={`/admin/elections/${electionId}`}
          className="mt-4 text-sm text-blue-600 hover:underline"
        >
          선거 관리로 돌아가기
        </Link>
      </div>
    );
  }

  const isFinalized = election.status === 'finalized';

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/elections/${electionId}`}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">선거 결과</h1>
            <p className="text-sm text-gray-500">{election.title}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Hash chain integrity badge */}
          {verified === true && (
            <Badge variant="success" size="md">
              <ShieldCheck className="mr-1 h-4 w-4" />
              해시 체인 정상
            </Badge>
          )}
          {verified === false && (
            <Badge variant="error" size="md">
              <ShieldAlert className="mr-1 h-4 w-4" />
              해시 체인 오류
            </Badge>
          )}
          {verified === null && (
            <Button
              variant="outline"
              size="sm"
              iconLeft={<Shield className="h-4 w-4" />}
              onClick={runVerification}
              loading={verifying}
            >
              무결성 검증
            </Button>
          )}

          <Button
            variant="outline"
            size="md"
            iconLeft={<Download className="h-4 w-4" />}
            onClick={handleDownloadPDF}
          >
            결과 PDF 다운로드
          </Button>

          {!isFinalized && (
            <Button
              variant="primary"
              size="md"
              iconLeft={<CheckCircle2 className="h-4 w-4" />}
              onClick={() => setShowFinalizeModal(true)}
            >
              결과 확정
            </Button>
          )}

          {isFinalized && (
            <Badge variant="success" size="md">
              <CheckCircle2 className="mr-1 h-4 w-4" />
              결과 확정됨
            </Badge>
          )}
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block">
        <h1 className="text-center text-2xl font-bold">{election.title} - 선거 결과</h1>
      </div>

      {resultsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" label="결과 계산중..." />
        </div>
      ) : results ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card padding="md" className="bg-blue-50">
              <p className="text-xs text-blue-600">총 투표수</p>
              <p className="text-2xl font-bold text-blue-900">{results.totalVotes}</p>
            </Card>
            <Card padding="md" className="bg-green-50">
              <p className="text-xs text-green-600">투표율</p>
              <p className="text-2xl font-bold text-green-900">{results.turnout.toFixed(1)}%</p>
            </Card>
            <Card padding="md" className="bg-purple-50">
              <p className="text-xs text-purple-600">유효 투표</p>
              <p className="text-2xl font-bold text-purple-900">
                {results.totalVotes - results.abstentions}
              </p>
            </Card>
            <Card padding="md" className="bg-gray-50">
              <p className="text-xs text-gray-600">기권</p>
              <p className="text-2xl font-bold text-gray-900">{results.abstentions}</p>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Donut chart */}
            <Card
              padding="md"
              header={
                <h2 className="text-base font-semibold text-gray-900">득표율 (도넛 차트)</h2>
              }
            >
              <ResultChart results={results.candidates} />
            </Card>

            {/* Bar chart */}
            <Card
              padding="md"
              header={
                <h2 className="text-base font-semibold text-gray-900">후보별 득표수 (막대 차트)</h2>
              }
            >
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value: number | undefined) => [
                        `${value ?? 0}표`,
                        '득표',
                      ]}
                    />
                    <Bar dataKey="votes" radius={[0, 4, 4, 0]} animationDuration={800}>
                      {barData.map((_, index) => (
                        <Cell
                          key={`bar-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Class result table */}
          <Card
            padding="md"
            header={
              <h2 className="text-base font-semibold text-gray-900">반별 결과</h2>
            }
          >
            <ClassResultTable results={results} candidates={election.candidates} />
          </Card>
        </>
      ) : (
        <Card padding="lg">
          <div className="py-8 text-center text-gray-500">
            결과 데이터를 불러올 수 없습니다.
          </div>
        </Card>
      )}

      {/* Finalize Modal */}
      <Modal
        isOpen={showFinalizeModal}
        onClose={() => setShowFinalizeModal(false)}
        title="결과 확정"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            선거 결과를 확정하시겠습니까? 확정 후에는 결과가 공식적으로 기록됩니다.
          </p>

          {verified === false && (
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-sm text-red-700">
                해시 체인 검증에서 오류가 발견되었습니다. 결과를 확정하기 전에 무결성을 확인해주세요.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowFinalizeModal(false)}
              disabled={finalizing}
            >
              취소
            </Button>
            <Button
              variant="primary"
              onClick={handleFinalize}
              loading={finalizing}
            >
              결과 확정
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
