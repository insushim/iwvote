'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Search,
  RefreshCw,
  PlayCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Input } from '@/components/ui/Input';
import { AuditLog } from '@/components/admin/AuditLog';
import { useElection } from '@/hooks/useElection';
import { useHashChain } from '@/hooks/useHashChain';
import { classIdToLabel, formatDate } from '@/lib/utils';

function AuditPageContent() {
  const searchParams = useSearchParams();
  const electionId = searchParams.get('id') ?? '';
  const { election, loading: electionLoading, error: electionError } = useElection(electionId);
  const {
    blocks,
    loading: blocksLoading,
    verifying,
    verified,
    verificationResults,
    firstInvalidIndex,
    error: chainError,
    fetchBlocks,
    runVerification,
    findByHash,
  } = useHashChain(electionId);

  const [searchHash, setSearchHash] = useState('');
  const [searchResult, setSearchResult] = useState<{
    found: boolean;
    block?: {
      index: number;
      voteHash: string;
      blockHash: string;
      classId: string;
      timestamp: string;
    };
  } | null>(null);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  const handleVerify = async () => {
    await runVerification();
    if (verified === true) {
      toast.success('해시 체인 검증이 완료되었습니다. 정상입니다.');
    }
  };

  const handleSearch = () => {
    if (!searchHash.trim()) {
      toast.error('검색할 해시를 입력하세요.');
      return;
    }

    const block = findByHash(searchHash);
    if (block) {
      const timestamp = typeof block.timestamp?.toDate === 'function'
        ? formatDate(block.timestamp, 'yyyy.MM.dd HH:mm:ss')
        : '-';

      setSearchResult({
        found: true,
        block: {
          index: block.index,
          voteHash: block.voteHash,
          blockHash: block.blockHash,
          classId: block.classId,
          timestamp,
        },
      });
      toast.success('투표 기록을 찾았습니다.');
    } else {
      setSearchResult({ found: false });
      toast.error('해당 해시와 일치하는 투표 기록이 없습니다.');
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
        <a href="/admin/elections/" className="mt-4 text-sm text-blue-600 hover:underline">
          선거 목록으로 돌아가기
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <a
            href={`/admin/elections/detail/?id=${electionId}`}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </a>
          <div>
            <h1 className="text-xl font-bold text-gray-900">해시 체인 감사</h1>
            <p className="text-sm text-gray-500">{election.title}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="md"
            iconLeft={<RefreshCw className="h-4 w-4" />}
            onClick={fetchBlocks}
            loading={blocksLoading}
          >
            새로고침
          </Button>
          <Button
            variant="primary"
            size="md"
            iconLeft={<PlayCircle className="h-4 w-4" />}
            onClick={handleVerify}
            loading={verifying}
          >
            해시 체인 검증 실행
          </Button>
        </div>
      </div>

      {/* Verification Result */}
      {verified !== null && (
        <Card padding="md">
          {verified ? (
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <ShieldCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-800">
                  전체 {blocks.length}개 투표의 해시 체인이 정상입니다
                </h3>
                <p className="text-sm text-green-600">
                  모든 블록의 해시 연결과 무결성이 확인되었습니다.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <ShieldAlert className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-red-800">
                  {firstInvalidIndex !== null
                    ? `${firstInvalidIndex}번째 블록에서 무결성 오류 발견`
                    : '해시 체인 검증에 실패했습니다'}
                </h3>
                <p className="text-sm text-red-600">
                  {chainError || '해시 체인에 변조가 감지되었습니다. 상세 내용을 확인하세요.'}
                </p>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card padding="md" className="bg-blue-50">
          <p className="text-sm text-blue-600">전체 블록 수</p>
          <p className="text-2xl font-bold text-blue-900">{blocks.length}개</p>
        </Card>
        <Card padding="md" className="bg-green-50">
          <p className="text-sm text-green-600">검증 성공</p>
          <p className="text-2xl font-bold text-green-900">
            {verificationResults.filter((r) => r.valid).length}개
          </p>
        </Card>
        <Card padding="md" className={verified === false ? 'bg-red-50' : 'bg-gray-50'}>
          <p className="text-sm text-red-600">검증 실패</p>
          <p className="text-2xl font-bold text-red-900">
            {verificationResults.filter((r) => !r.valid).length}개
          </p>
        </Card>
      </div>

      {/* Block list table */}
      <Card
        padding="md"
        header={
          <h2 className="text-base font-semibold text-gray-900">블록 목록</h2>
        }
      >
        {blocksLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" label="블록 로딩중..." />
          </div>
        ) : (
          <AuditLog blocks={blocks} verificationResults={verificationResults} />
        )}
      </Card>

      {/* Individual vote hash verification */}
      <Card
        padding="md"
        header={
          <h2 className="text-base font-semibold text-gray-900">투표 영수증 해시로 검증</h2>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            투표 후 발급받은 영수증 해시를 입력하여 투표가 정상적으로 기록되었는지 확인할 수 있습니다.
          </p>

          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="투표 해시 또는 블록 해시를 입력하세요..."
                value={searchHash}
                onChange={(e) => setSearchHash(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
              />
            </div>
            <Button
              variant="primary"
              size="md"
              iconLeft={<Search className="h-4 w-4" />}
              onClick={handleSearch}
              disabled={!searchHash.trim() || blocksLoading}
            >
              검증
            </Button>
          </div>

          {/* Search result */}
          {searchResult && (
            <div className="mt-4">
              {searchResult.found && searchResult.block ? (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">
                      투표 기록을 찾았습니다
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex gap-2">
                      <span className="w-24 shrink-0 font-medium text-gray-600">
                        블록 번호:
                      </span>
                      <span className="text-gray-900">#{searchResult.block.index}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-24 shrink-0 font-medium text-gray-600">
                        투표 해시:
                      </span>
                      <code className="truncate font-mono text-xs text-gray-700">
                        {searchResult.block.voteHash}
                      </code>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-24 shrink-0 font-medium text-gray-600">
                        블록 해시:
                      </span>
                      <code className="truncate font-mono text-xs text-gray-700">
                        {searchResult.block.blockHash}
                      </code>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-24 shrink-0 font-medium text-gray-600">반:</span>
                      <span className="text-gray-900">
                        {classIdToLabel(searchResult.block.classId)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-24 shrink-0 font-medium text-gray-600">시간:</span>
                      <span className="text-gray-900">{searchResult.block.timestamp}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-800">
                      해당 해시와 일치하는 투표 기록이 없습니다
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-red-600">
                    해시를 다시 확인하거나, 블록 목록을 새로고침해주세요.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Spinner size="lg" label="로딩 중..." /></div>}>
      <AuditPageContent />
    </Suspense>
  );
}
