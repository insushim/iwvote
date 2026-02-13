'use client';

import { Fragment, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { truncateHash, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import type { HashBlock } from '@/types';

interface BlockVerification {
  index: number;
  valid: boolean;
  error?: string;
}

interface AuditLogProps {
  blocks: HashBlock[];
  verificationResults: BlockVerification[];
}

export function AuditLog({ blocks, verificationResults }: AuditLogProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const verificationMap = new Map(
    verificationResults.map((v) => [v.index, v])
  );

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('해시가 클립보드에 복사되었습니다.');
    } catch {
      toast.error('복사에 실패했습니다.');
    }
  }, []);

  const toggleExpand = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  if (blocks.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        해시 블록이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full min-w-[700px] text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-3 py-3 text-left font-semibold text-gray-900">블록#</th>
            <th className="px-3 py-3 text-left font-semibold text-gray-900">타임스탬프</th>
            <th className="px-3 py-3 text-left font-semibold text-gray-900">
              투표해시(앞8자)
            </th>
            <th className="px-3 py-3 text-left font-semibold text-gray-900">
              이전해시(앞8자)
            </th>
            <th className="px-3 py-3 text-left font-semibold text-gray-900">
              블록해시(앞8자)
            </th>
            <th className="px-3 py-3 text-center font-semibold text-gray-900">검증</th>
            <th className="px-3 py-3 text-center font-semibold text-gray-900">상세</th>
          </tr>
        </thead>
        <tbody>
          {blocks.map((block) => {
            const verification = verificationMap.get(block.index);
            const isExpanded = expandedIndex === block.index;

            return (
              <Fragment key={block.id || block.index}>
                <tr
                  className={`border-t border-gray-100 transition-colors hover:bg-gray-50 ${
                    verification && !verification.valid ? 'bg-red-50/50' : ''
                  }`}
                >
                  <td className="px-3 py-2.5 font-mono text-xs font-medium text-gray-700">
                    #{block.index}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-600">
                    {typeof block.timestamp?.toDate === 'function'
                      ? formatDate(block.timestamp, 'MM.dd HH:mm:ss')
                      : '-'}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <code className="font-mono text-xs text-gray-600">
                        {truncateHash(block.voteHash, 8, 0)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(block.voteHash)}
                        className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="전체 해시 복사"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <code className="font-mono text-xs text-gray-600">
                        {truncateHash(block.previousHash, 8, 0)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(block.previousHash)}
                        className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="전체 해시 복사"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <code className="font-mono text-xs text-gray-600">
                        {truncateHash(block.blockHash, 8, 0)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(block.blockHash)}
                        className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="전체 해시 복사"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {verification ? (
                      verification.valid ? (
                        <CheckCircle2 className="mx-auto h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="mx-auto h-5 w-5 text-red-500" />
                      )
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => toggleExpand(block.index)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                </tr>

                {/* Expanded detail row */}
                <AnimatePresence>
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} className="border-t border-gray-100 bg-gray-50/80 p-0">
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2 px-4 py-3">
                            <HashDetail
                              label="투표 해시"
                              hash={block.voteHash}
                              onCopy={copyToClipboard}
                            />
                            <HashDetail
                              label="이전 해시"
                              hash={block.previousHash}
                              onCopy={copyToClipboard}
                            />
                            <HashDetail
                              label="블록 해시"
                              hash={block.blockHash}
                              onCopy={copyToClipboard}
                            />
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-medium text-gray-500">반:</span>
                              <span className="text-gray-700">{block.classId || '-'}</span>
                            </div>
                            {verification && !verification.valid && verification.error && (
                              <div className="mt-1">
                                <Badge variant="error" size="sm">
                                  {verification.error}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HashDetail({
  label,
  hash,
  onCopy,
}: {
  label: string;
  hash: string;
  onCopy: (text: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 shrink-0 font-medium text-gray-500">{label}:</span>
      <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1 font-mono text-gray-600">
        {hash}
      </code>
      <button
        onClick={() => onCopy(hash)}
        className="shrink-0 rounded p-1 text-gray-400 hover:bg-white hover:text-gray-600"
        title="복사"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

