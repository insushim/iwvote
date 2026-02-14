'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, GripVertical, Image, AlertCircle, Loader2, Upload, X } from 'lucide-react';
import { compressImage } from '@/lib/imageCompress';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import {
  MAX_PLEDGES,
  MAX_PLEDGE_LENGTH,
  MAX_SLOGAN_LENGTH,
  GRADE_LABELS,
} from '@/constants';
import type { Candidate } from '@/types';

export type CandidateFormData = Omit<Candidate, 'id'>;

interface CandidateFormProps {
  candidate: CandidateFormData;
  index: number;
  onChange: (index: number, data: CandidateFormData) => void;
  onRemove: (index: number) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export function CandidateForm({
  candidate,
  index,
  onChange,
  onRemove,
  errors = {},
  disabled = false,
}: CandidateFormProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (field: keyof CandidateFormData, value: CandidateFormData[keyof CandidateFormData]) => {
      onChange(index, { ...candidate, [field]: value });
    },
    [candidate, index, onChange]
  );

  const handlePledgeChange = useCallback(
    (pledgeIndex: number, value: string) => {
      const newPledges = [...candidate.pledges];
      newPledges[pledgeIndex] = value;
      handleChange('pledges', newPledges);
    },
    [candidate.pledges, handleChange]
  );

  const addPledge = useCallback(() => {
    if (candidate.pledges.length >= MAX_PLEDGES) return;
    handleChange('pledges', [...candidate.pledges, '']);
  }, [candidate.pledges, handleChange]);

  const removePledge = useCallback(
    (pledgeIndex: number) => {
      const newPledges = candidate.pledges.filter((_, i) => i !== pledgeIndex);
      handleChange('pledges', newPledges);
    },
    [candidate.pledges, handleChange]
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드할 수 있습니다.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('파일 크기는 10MB 이하여야 합니다.');
        return;
      }

      setUploading(true);
      try {
        const dataUrl = await compressImage(file);
        handleChange('photoURL', dataUrl);
      } catch (error) {
        console.error('Photo compress failed:', error);
        alert('사진 처리에 실패했습니다. 다시 시도해주세요.');
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [handleChange]
  );

  const handleRemovePhoto = useCallback(() => {
    handleChange('photoURL', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleChange]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Card variant="bordered" padding="none" className="overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center justify-between bg-gray-50 px-4 py-3 cursor-pointer"
          onClick={() => setCollapsed(!collapsed)}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
              {candidate.number}
            </div>
            <div>
              <span className="font-medium text-gray-900">
                {candidate.name || `후보자 ${candidate.number}`}
              </span>
              {candidate.grade > 0 && (
                <span className="ml-2 text-sm text-gray-500">
                  {candidate.grade}학년 {candidate.classNum > 0 ? `${candidate.classNum}반` : ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!disabled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(index);
                }}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <motion.div
              animate={{ rotate: collapsed ? -90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <GripVertical className="h-4 w-4 text-gray-400" />
            </motion.div>
          </div>
        </div>

        {/* Body */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 p-4">
                {/* Name & Photo Upload Row */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="이름"
                    value={candidate.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="후보자 이름"
                    error={errors.name}
                    disabled={disabled}
                  />
                  <div className="w-full">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      후보자 사진
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={disabled || uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                    {candidate.photoURL ? (
                      <div className="flex items-center gap-3 rounded-lg border border-gray-300 bg-white p-2">
                        <img
                          src={candidate.photoURL}
                          alt="후보자 사진"
                          className="h-16 w-16 shrink-0 rounded-lg object-cover border border-gray-200"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm text-gray-600">사진 업로드 완료</p>
                        </div>
                        {!disabled && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                            aria-label="사진 삭제"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ) : uploading ? (
                      <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/50 p-4">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                        <span className="text-sm text-blue-600">업로드 중...</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={disabled}
                        className={cn(
                          'flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 transition-colors',
                          'border-gray-300 bg-gray-50/50 text-gray-500',
                          'hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600',
                          'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-gray-300 disabled:hover:bg-gray-50/50 disabled:hover:text-gray-500'
                        )}
                      >
                        <Upload className="h-5 w-5" />
                        <span className="text-sm font-medium">사진 업로드</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Grade & Class Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="w-full">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      학년
                    </label>
                    <select
                      value={candidate.grade}
                      onChange={(e) => handleChange('grade', Number(e.target.value))}
                      disabled={disabled}
                      className={cn(
                        'h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm',
                        'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200',
                        'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
                        errors.grade && 'border-red-400 focus:border-red-500 focus:ring-red-200'
                      )}
                    >
                      <option value={0}>학년 선택</option>
                      {[1, 2, 3, 4, 5, 6].map((g) => (
                        <option key={g} value={g}>
                          {GRADE_LABELS[g]}
                        </option>
                      ))}
                    </select>
                    {errors.grade && (
                      <p className="mt-1.5 text-sm text-red-600">{errors.grade}</p>
                    )}
                  </div>
                  <div className="w-full">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      반
                    </label>
                    <select
                      value={candidate.classNum}
                      onChange={(e) => handleChange('classNum', Number(e.target.value))}
                      disabled={disabled}
                      className={cn(
                        'h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm',
                        'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200',
                        'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
                        errors.classNum && 'border-red-400 focus:border-red-500 focus:ring-red-200'
                      )}
                    >
                      <option value={0}>반 선택</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((c) => (
                        <option key={c} value={c}>
                          {c}반
                        </option>
                      ))}
                    </select>
                    {errors.classNum && (
                      <p className="mt-1.5 text-sm text-red-600">{errors.classNum}</p>
                    )}
                  </div>
                </div>

                {/* Slogan */}
                <div className="w-full">
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      슬로건
                    </label>
                    <span
                      className={cn(
                        'text-xs',
                        candidate.slogan.length > MAX_SLOGAN_LENGTH
                          ? 'text-red-500'
                          : 'text-gray-400'
                      )}
                    >
                      {candidate.slogan.length}/{MAX_SLOGAN_LENGTH}
                    </span>
                  </div>
                  <input
                    value={candidate.slogan}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_SLOGAN_LENGTH) {
                        handleChange('slogan', e.target.value);
                      }
                    }}
                    placeholder="한 줄 슬로건 (예: 모두가 행복한 학교를 만들겠습니다)"
                    disabled={disabled}
                    className={cn(
                      'h-10 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm',
                      'placeholder:text-gray-400',
                      'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200',
                      'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
                      errors.slogan && 'border-red-400 focus:border-red-500 focus:ring-red-200'
                    )}
                  />
                  {errors.slogan && (
                    <p className="mt-1.5 text-sm text-red-600">{errors.slogan}</p>
                  )}
                </div>

                {/* Pledges */}
                <div className="w-full">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      공약 ({candidate.pledges.length}/{MAX_PLEDGES})
                    </label>
                    {!disabled && candidate.pledges.length < MAX_PLEDGES && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={addPledge}
                        iconLeft={<Plus className="h-3.5 w-3.5" />}
                      >
                        공약 추가
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <AnimatePresence initial={false}>
                      {candidate.pledges.map((pledge, pledgeIdx) => (
                        <motion.div
                          key={pledgeIdx}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                          className="flex items-start gap-2"
                        >
                          <span className="mt-2.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-medium text-blue-600">
                            {pledgeIdx + 1}
                          </span>
                          <div className="flex-1">
                            <div className="relative">
                              <input
                                value={pledge}
                                onChange={(e) => {
                                  if (e.target.value.length <= MAX_PLEDGE_LENGTH) {
                                    handlePledgeChange(pledgeIdx, e.target.value);
                                  }
                                }}
                                placeholder={`공약 ${pledgeIdx + 1}`}
                                disabled={disabled}
                                className={cn(
                                  'h-10 w-full rounded-lg border border-gray-300 bg-white px-3.5 pr-16 text-sm',
                                  'placeholder:text-gray-400',
                                  'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200',
                                  'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
                                  errors[`pledge_${pledgeIdx}`] &&
                                    'border-red-400 focus:border-red-500 focus:ring-red-200'
                                )}
                              />
                              <span
                                className={cn(
                                  'absolute right-3 top-1/2 -translate-y-1/2 text-xs',
                                  pledge.length > MAX_PLEDGE_LENGTH
                                    ? 'text-red-500'
                                    : 'text-gray-400'
                                )}
                              >
                                {pledge.length}/{MAX_PLEDGE_LENGTH}
                              </span>
                            </div>
                            {errors[`pledge_${pledgeIdx}`] && (
                              <p className="mt-1 text-xs text-red-600">
                                {errors[`pledge_${pledgeIdx}`]}
                              </p>
                            )}
                          </div>
                          {!disabled && (
                            <button
                              type="button"
                              onClick={() => removePledge(pledgeIdx)}
                              className="mt-2 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                              aria-label={`공약 ${pledgeIdx + 1} 삭제`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {candidate.pledges.length === 0 && (
                      <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500">
                        <AlertCircle className="h-4 w-4" />
                        <span>공약을 추가해주세요. (최대 {MAX_PLEDGES}개)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preview */}
                {candidate.name && (
                  <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50/50 p-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
                      미리보기
                    </p>
                    <div className="flex items-start gap-3">
                      {candidate.photoURL ? (
                        <img
                          src={candidate.photoURL}
                          alt={candidate.name}
                          className="h-16 w-16 rounded-full object-cover border border-gray-200"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '';
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-600">
                          {candidate.number}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                            {candidate.number}
                          </span>
                          <span className="font-semibold text-gray-900">
                            {candidate.name}
                          </span>
                          {candidate.grade > 0 && (
                            <span className="text-sm text-gray-500">
                              {candidate.grade}학년
                              {candidate.classNum > 0 ? ` ${candidate.classNum}반` : ''}
                            </span>
                          )}
                        </div>
                        {candidate.slogan && (
                          <p className="mt-1 text-sm text-gray-600 italic">
                            &quot;{candidate.slogan}&quot;
                          </p>
                        )}
                        {candidate.pledges.filter(Boolean).length > 0 && (
                          <ul className="mt-2 space-y-0.5">
                            {candidate.pledges.filter(Boolean).map((p, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-1.5 text-sm text-gray-600"
                              >
                                <span className="mt-0.5 text-blue-500">&#8226;</span>
                                {p}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ===== Validation =====

export function validateCandidate(
  candidate: CandidateFormData
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!candidate.name.trim()) {
    errors.name = '이름을 입력해주세요.';
  }
  if (candidate.grade === 0) {
    errors.grade = '학년을 선택해주세요.';
  }
  if (candidate.classNum === 0) {
    errors.classNum = '반을 선택해주세요.';
  }
  if (!candidate.slogan.trim()) {
    errors.slogan = '슬로건을 입력해주세요.';
  }
  if (candidate.slogan.length > MAX_SLOGAN_LENGTH) {
    errors.slogan = `슬로건은 ${MAX_SLOGAN_LENGTH}자 이내로 입력해주세요.`;
  }
  if (candidate.pledges.length === 0) {
    errors.pledges = '공약을 최소 1개 이상 추가해주세요.';
  }
  candidate.pledges.forEach((p, i) => {
    if (!p.trim()) {
      errors[`pledge_${i}`] = '공약 내용을 입력해주세요.';
    }
    if (p.length > MAX_PLEDGE_LENGTH) {
      errors[`pledge_${i}`] = `공약은 ${MAX_PLEDGE_LENGTH}자 이내로 입력해주세요.`;
    }
  });

  return errors;
}
