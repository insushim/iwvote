'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { VoterCode } from '@/types';

interface VoterTableProps {
  codes: VoterCode[];
  pageSize?: number;
  showClassFilter?: boolean;
}

export function VoterTable({
  codes,
  pageSize = 20,
  showClassFilter = true,
}: VoterTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'used' | 'unused'>('all');

  // Available classes for filter
  const availableClasses = useMemo(() => {
    const classSet = new Set(codes.map((c) => c.classId));
    return [...classSet].sort();
  }, [codes]);

  // Filtered codes
  const filteredCodes = useMemo(() => {
    let result = codes;

    if (filterClass !== 'all') {
      result = result.filter((c) => c.classId === filterClass);
    }
    if (filterStatus === 'used') {
      result = result.filter((c) => c.used);
    } else if (filterStatus === 'unused') {
      result = result.filter((c) => !c.used);
    }

    return result;
  }, [codes, filterClass, filterStatus]);

  // Pagination
  const totalPages = Math.ceil(filteredCodes.length / pageSize);
  const paginatedCodes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCodes.slice(start, start + pageSize);
  }, [filteredCodes, currentPage, pageSize]);

  // Stats
  const usedCount = codes.filter((c) => c.used).length;
  const unusedCount = codes.length - usedCount;

  // Page change
  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    },
    [totalPages]
  );

  // Reset page on filter change
  const handleFilterChange = useCallback(
    (type: 'class' | 'status', value: string) => {
      if (type === 'class') setFilterClass(value);
      else setFilterStatus(value as 'all' | 'used' | 'unused');
      setCurrentPage(1);
    },
    []
  );

  // Format timestamp
  const formatTimestamp = (ts: { toDate: () => Date } | null): string => {
    if (!ts) return '-';
    try {
      return ts.toDate().toLocaleString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  return (
    <div>
      {/* Filters and stats */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Status summary */}
          <div className="flex items-center gap-2">
            <Badge variant="success" size="sm" dot>
              사용됨 {usedCount}
            </Badge>
            <Badge variant="default" size="sm" dot>
              미사용 {unusedCount}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Class filter */}
          {showClassFilter && availableClasses.length > 1 && (
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-gray-400" />
              <select
                value={filterClass}
                onChange={(e) => handleFilterChange('class', e.target.value)}
                className={cn(
                  'h-8 rounded-md border border-gray-300 bg-white px-2 text-xs',
                  'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200'
                )}
              >
                <option value="all">전체 반</option>
                {availableClasses.map((cls) => {
                  const [g, c] = cls.split('-');
                  return (
                    <option key={cls} value={cls}>
                      {g}학년 {c}반
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className={cn(
              'h-8 rounded-md border border-gray-300 bg-white px-2 text-xs',
              'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200'
            )}
          >
            <option value="all">전체 상태</option>
            <option value="used">사용됨</option>
            <option value="unused">미사용</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                반
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                번호
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                코드
              </th>
              <th className="px-4 py-2.5 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                상태
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                사용시간
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedCodes.map((code, idx) => (
              <motion.tr
                key={code.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.02 }}
                className={cn(
                  'transition-colors hover:bg-gray-50',
                  code.used && 'bg-green-50/30'
                )}
              >
                <td className="whitespace-nowrap px-4 py-2.5 text-sm text-gray-700">
                  {code.grade}학년 {code.classNum}반
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-sm text-gray-700">
                  {code.studentNumber}번
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  <span className="inline-block rounded bg-gray-100 px-2 py-0.5 font-mono text-sm font-medium tracking-wider text-gray-800">
                    {code.code}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-center">
                  {code.used ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      사용됨
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
                      <Clock className="h-3.5 w-3.5" />
                      미사용
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-sm text-gray-500">
                  {formatTimestamp(code.usedAt)}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {paginatedCodes.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            {filteredCodes.length === 0
              ? '투표 코드가 없습니다.'
              : '필터 조건에 맞는 코드가 없습니다.'}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            총 {filteredCodes.length}개 중 {(currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, filteredCodes.length)}개 표시
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={cn(
                'rounded-md p-1.5 transition-colors',
                currentPage === 1
                  ? 'cursor-not-allowed text-gray-300'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              )}
              aria-label="이전 페이지"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {generatePageNumbers(currentPage, totalPages).map((page, idx) => {
              if (page === -1) {
                return (
                  <span key={`ellipsis-${idx}`} className="px-1 text-gray-400">
                    ...
                  </span>
                );
              }
              return (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={cn(
                    'h-8 min-w-[2rem] rounded-md px-2 text-sm font-medium transition-colors',
                    page === currentPage
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={cn(
                'rounded-md p-1.5 transition-colors',
                currentPage === totalPages
                  ? 'cursor-not-allowed text-gray-300'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              )}
              aria-label="다음 페이지"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Pagination helper =====

function generatePageNumbers(current: number, total: number): number[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: number[] = [];

  // Always show first page
  pages.push(1);

  if (current > 3) {
    pages.push(-1); // ellipsis
  }

  // Show pages around current
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push(-1); // ellipsis
  }

  // Always show last page
  if (!pages.includes(total)) {
    pages.push(total);
  }

  return pages;
}
