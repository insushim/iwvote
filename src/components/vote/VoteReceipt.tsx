'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Copy, CheckCheck, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import type { VoteReceipt as VoteReceiptType } from '@/types';

export interface VoteReceiptProps {
  receipt: VoteReceiptType;
}

function formatHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

export function VoteReceipt({ receipt }: VoteReceiptProps) {
  const [copied, setCopied] = useState(false);

  const formattedTime = format(
    new Date(receipt.timestamp),
    'yyyy년 M월 d일 a h시 mm분 ss초',
    { locale: ko }
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(receipt.voteHash);
      setCopied(true);
      toast.success('투표 해시가 복사되었어요!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('복사에 실패했어요. 다시 시도해주세요.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mx-auto w-full max-w-sm rounded-xl border-2 border-dashed border-gray-300 bg-white p-5"
    >
      {/* Receipt Header */}
      <div className="flex items-center justify-center gap-2 border-b border-dashed border-gray-200 pb-3">
        <Shield className="h-5 w-5 text-blue-500" />
        <h3 className="text-base font-bold text-gray-900">투표 영수증</h3>
      </div>

      {/* Receipt Body */}
      <div className="mt-4 space-y-3">
        {/* Vote Time */}
        <div>
          <p className="text-xs font-medium text-gray-500">투표 시간</p>
          <p className="mt-0.5 text-sm font-semibold text-gray-800">
            {formattedTime}
          </p>
        </div>

        {/* Vote Hash */}
        <div>
          <p className="text-xs font-medium text-gray-500">투표 해시</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-xs font-mono text-gray-700 break-all">
              {formatHash(receipt.voteHash)}
            </code>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="해시 복사"
            >
              {copied ? (
                <CheckCheck className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="mt-4 rounded-lg bg-blue-50 px-3 py-2.5">
        <p className="text-xs leading-relaxed text-blue-700">
          이 해시는 여러분의 투표가 올바르게 기록되었는지 확인할 수 있는
          특별한 코드예요. 나중에 선생님이 투표 결과를 확인할 때 사용돼요.
        </p>
      </div>

      {/* Footer decoration */}
      <div className="mt-4 border-t border-dashed border-gray-200 pt-3 text-center">
        <p className="text-xs text-gray-400">우리한표 - 안전한 전자투표</p>
      </div>
    </motion.div>
  );
}
