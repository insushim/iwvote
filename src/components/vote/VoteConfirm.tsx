'use client';

import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface VoteConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  candidateName: string;
  candidateNumber: number;
  isAbstention?: boolean;
  loading?: boolean;
}

export function VoteConfirm({
  isOpen,
  onClose,
  onConfirm,
  candidateName,
  candidateNumber,
  isAbstention = false,
  loading = false,
}: VoteConfirmProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      showCloseButton={!loading}
      closeOnOverlay={!loading}
      size="sm"
    >
      <div className="text-center">
        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900">
          투표를 확인해주세요
        </h3>

        {/* Selected candidate */}
        <div className="mt-5 rounded-xl bg-gray-50 px-4 py-5">
          {isAbstention ? (
            <div>
              <p className="text-lg font-bold text-gray-700">기권</p>
              <p className="mt-1 text-sm text-gray-500">
                어떤 후보도 선택하지 않아요
              </p>
            </div>
          ) : (
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                {candidateNumber}
              </div>
              <p className="mt-2 text-xl font-bold text-gray-900">
                {candidateName}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                기호 {candidateNumber}번
              </p>
            </div>
          )}
        </div>

        {/* Warning */}
        <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-orange-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-orange-500" />
          <p className="text-sm font-medium text-orange-700">
            한 번 투표하면 변경할 수 없습니다
          </p>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={onClose}
            disabled={loading}
          >
            돌아가기
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={onConfirm}
            loading={loading}
          >
            투표하기
          </Button>
        </div>
      </div>
    </Modal>
  );
}
