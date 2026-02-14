'use client';

import { Suspense, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  AlertTriangle,
  X,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import {
  CandidateForm,
  validateCandidate,
  type CandidateFormData,
} from '@/components/admin/CandidateForm';
import { useSchoolElection } from '@/hooks/useSchoolElection';
import {
  addCandidate,
  updateCandidate,
  removeCandidate,
} from '@/lib/firestore';
import { cn } from '@/lib/utils';
import { ELECTION_STATUS_LABELS } from '@/constants';
import type { Candidate } from '@/types';

// ===== Helpers =====

function createEmptyCandidate(number: number): CandidateFormData {
  return {
    number,
    name: '',
    grade: 0,
    classNum: 0,
    photoURL: '',
    slogan: '',
    pledges: [''],
  };
}

function CandidatesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const electionId = searchParams.get('id') ?? '';
  const { election, loading, error, authorized } = useSchoolElection(electionId);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCandidate, setNewCandidate] = useState<CandidateFormData>(
    createEmptyCandidate(1)
  );
  const [editCandidate, setEditCandidate] = useState<CandidateFormData | null>(
    null
  );
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<Candidate | null>(null);
  const [saving, setSaving] = useState(false);

  const isDraft = election?.status === 'draft';

  // ===== Add candidate =====

  const handleAdd = useCallback(async () => {
    if (!election) return;

    const errors = validateCandidate(newCandidate);
    if (Object.keys(errors).length > 0) {
      setAddErrors(errors);
      toast.error('후보자 정보를 확인해주세요.');
      return;
    }

    setSaving(true);
    try {
      await addCandidate(electionId, {
        ...newCandidate,
        number: election.candidates.length + 1,
      });
      toast.success(`${newCandidate.name} 후보가 추가되었습니다.`);
      setShowAddForm(false);
      setNewCandidate(createEmptyCandidate(election.candidates.length + 2));
      setAddErrors({});
    } catch (err) {
      const msg = err instanceof Error ? err.message : '후보자 추가에 실패했습니다.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [election, electionId, newCandidate]);

  // ===== Start editing =====

  const startEdit = useCallback((candidate: Candidate) => {
    setEditingId(candidate.id);
    setEditCandidate({
      number: candidate.number,
      name: candidate.name,
      grade: candidate.grade,
      classNum: candidate.classNum,
      photoURL: candidate.photoURL,
      slogan: candidate.slogan,
      pledges: [...candidate.pledges],
    });
    setEditErrors({});
  }, []);

  // ===== Save edit =====

  const handleSaveEdit = useCallback(async () => {
    if (!editCandidate || !editingId) return;

    const errors = validateCandidate(editCandidate);
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      toast.error('후보자 정보를 확인해주세요.');
      return;
    }

    setSaving(true);
    try {
      await updateCandidate(electionId, editingId, editCandidate);
      toast.success(`${editCandidate.name} 후보 정보가 수정되었습니다.`);
      setEditingId(null);
      setEditCandidate(null);
      setEditErrors({});
    } catch (err) {
      const msg = err instanceof Error ? err.message : '후보자 수정에 실패했습니다.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [editCandidate, editingId, electionId]);

  // ===== Delete candidate =====

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return;

    setSaving(true);
    try {
      await removeCandidate(electionId, deleteConfirm.id);
      toast.success(`${deleteConfirm.name} 후보가 삭제되었습니다.`);
      setDeleteConfirm(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '후보자 삭제에 실패했습니다.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [deleteConfirm, electionId]);

  // ===== Loading =====

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" label="후보자 정보를 불러오는 중..." />
      </div>
    );
  }

  // ===== Authorization =====

  if (authorized === false) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <p className="text-lg font-medium text-gray-700">접근 권한이 없습니다.</p>
        <Button variant="outline" onClick={() => router.back()}>돌아가기</Button>
      </div>
    );
  }

  // ===== Error =====

  if (error || !election) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <p className="text-lg font-medium text-gray-700">
          {error || '선거를 찾을 수 없습니다.'}
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <button
        onClick={() => router.push(`/admin/elections/detail?id=${electionId}`)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" />
        {election.title}
      </button>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">후보자 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            등록된 후보자 {election.candidates.length}명
            {!isDraft && (
              <span className="ml-2 text-amber-600">
                (현재 상태: {ELECTION_STATUS_LABELS[election.status]} - 수정 불가)
              </span>
            )}
          </p>
        </div>
        {isDraft && (
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowAddForm(true)}
            iconLeft={<Plus className="h-4 w-4" />}
          >
            후보자 추가
          </Button>
        )}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <Card padding="lg" variant="bordered">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  새 후보자 추가
                </h3>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setAddErrors({});
                  }}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <CandidateForm
                candidate={newCandidate}
                index={0}
                onChange={(_, data) => {
                  setNewCandidate(data);
                  setAddErrors({});
                }}
                onRemove={() => setShowAddForm(false)}
                errors={addErrors}
              />
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setShowAddForm(false);
                    setAddErrors({});
                  }}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleAdd}
                  loading={saving}
                  iconLeft={<Save className="h-4 w-4" />}
                >
                  추가
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Candidate list */}
      {election.candidates.length === 0 ? (
        <Card padding="lg" className="text-center">
          <div className="py-12">
            <UserPlus className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">등록된 후보자가 없습니다.</p>
            {isDraft && (
              <Button
                variant="outline"
                size="md"
                onClick={() => setShowAddForm(true)}
                iconLeft={<Plus className="h-4 w-4" />}
                className="mt-4"
              >
                후보자 추가하기
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {election.candidates.map((candidate) => {
              const isEditing = editingId === candidate.id;

              if (isEditing && editCandidate) {
                return (
                  <motion.div
                    key={candidate.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Card padding="lg" variant="bordered" className="border-blue-300">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-blue-700">
                          후보자 수정
                        </h3>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditCandidate(null);
                            setEditErrors({});
                          }}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <CandidateForm
                        candidate={editCandidate}
                        index={0}
                        onChange={(_, data) => {
                          setEditCandidate(data);
                          setEditErrors({});
                        }}
                        onRemove={() => {
                          setEditingId(null);
                          setEditCandidate(null);
                        }}
                        errors={editErrors}
                      />
                      <div className="mt-4 flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="md"
                          onClick={() => {
                            setEditingId(null);
                            setEditCandidate(null);
                            setEditErrors({});
                          }}
                        >
                          취소
                        </Button>
                        <Button
                          variant="primary"
                          size="md"
                          onClick={handleSaveEdit}
                          loading={saving}
                          iconLeft={<Save className="h-4 w-4" />}
                        >
                          저장
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={candidate.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card padding="none" variant="default">
                    <div className="flex items-start gap-4 p-5">
                      {/* Photo / Number */}
                      <div className="shrink-0">
                        {candidate.photoURL ? (
                          <img
                            src={candidate.photoURL}
                            alt={candidate.name}
                            className="h-20 w-20 rounded-xl object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-blue-50 text-2xl font-bold text-blue-600">
                            {candidate.number}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                            {candidate.number}
                          </span>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {candidate.name}
                          </h3>
                          <Badge variant="default" size="sm">
                            {candidate.grade}학년 {candidate.classNum}반
                          </Badge>
                        </div>

                        {candidate.slogan && (
                          <p className="mt-1.5 text-sm text-gray-600 italic">
                            &quot;{candidate.slogan}&quot;
                          </p>
                        )}

                        {candidate.pledges.length > 0 && (
                          <div className="mt-3">
                            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-400">
                              공약
                            </p>
                            <ul className="space-y-1">
                              {candidate.pledges.map((pledge, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-sm text-gray-600"
                                >
                                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-medium text-blue-600">
                                    {i + 1}
                                  </span>
                                  {pledge}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {isDraft && (
                        <div className="flex shrink-0 gap-1">
                          <button
                            onClick={() => startEdit(candidate)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                            title="수정"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(candidate)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            title="삭제"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => !saving && setDeleteConfirm(null)}
        title="후보자 삭제"
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={() => setDeleteConfirm(null)}
              disabled={saving}
            >
              취소
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleDelete}
              loading={saving}
            >
              삭제
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">
              <strong>{deleteConfirm?.name}</strong> 후보를 삭제하시겠습니까?
            </p>
            <p className="mt-1 text-xs text-gray-500">
              이 작업은 되돌릴 수 없습니다.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" label="로딩 중..." /></div>}>
      <CandidatesPageContent />
    </Suspense>
  );
}
