'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Vote,
  School,
  Users,
  UserPlus,
  Settings,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import {
  CandidateForm,
  validateCandidate,
  type CandidateFormData,
} from '@/components/admin/CandidateForm';
import { createElection, getSchool as getSchoolData } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import {
  DEFAULT_ELECTION_SETTINGS,
  ELECTION_TYPE_LABELS,
  GRADE_LABELS,
} from '@/constants';
import type {
  ElectionType,
  ElectionSettings,
  NewElectionForm,
  Candidate,
} from '@/types';

// ===== Step definitions =====

const STEPS = [
  { id: 'basic', label: '기본 정보', icon: Vote },
  { id: 'target', label: '대상 설정', icon: Users },
  { id: 'candidates', label: '후보자 등록', icon: UserPlus },
  { id: 'settings', label: '투표 설정', icon: Settings },
] as const;

// ===== Title suggestions by type =====

function getSuggestedTitle(type: ElectionType): string {
  const year = new Date().getFullYear();
  switch (type) {
    case 'school_president':
      return `${year}학년도 전교 어린이 회장 선거`;
    case 'class_president':
      return `${year}학년도 반 회장 선거`;
    case 'custom':
      return '';
  }
}

// ===== Empty candidate factory =====

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

// ===== Default form state =====

function getInitialForm(): NewElectionForm {
  return {
    title: '',
    type: 'school_president',
    description: '',
    targetGrades: [4, 5, 6],
    targetClasses: [],
    candidates: [],
    settings: { ...DEFAULT_ELECTION_SETTINGS },
    startTime: '',
    endTime: '',
  };
}

// ===== Page Component =====

export default function NewElectionPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [school, setSchool] = useState<import('@/types').School | null>(null);

  // Fetch school data when user is available
  useEffect(() => {
    if (!user) return;
    getSchoolData(user.uid).then(setSchool).catch(() => {});
  }, [user]);

  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<NewElectionForm>(getInitialForm);
  const [candidates, setCandidates] = useState<CandidateFormData[]>([]);
  const [candidateErrors, setCandidateErrors] = useState<Record<number, Record<string, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  // ===== Derived: max classes per grade from school data =====
  const maxClassesPerGrade = useMemo(() => {
    if (!school) return {} as Record<number, number>;
    return school.classesPerGrade || {};
  }, [school]);

  // ===== Derived: estimated voter count =====
  const estimatedVoters = useMemo(() => {
    if (!school) return 0;
    let count = 0;

    if (form.type === 'school_president') {
      for (const grade of form.targetGrades) {
        const classCount = maxClassesPerGrade[grade] || 0;
        for (let c = 1; c <= classCount; c++) {
          const key = `${grade}-${c}`;
          count += school.studentsPerClass?.[key] || 30;
        }
      }
    } else if (form.type === 'class_president' || form.type === 'custom') {
      for (const classId of form.targetClasses) {
        count += school.studentsPerClass?.[classId] || 30;
      }
    }

    return count;
  }, [form.targetGrades, form.targetClasses, form.type, school, maxClassesPerGrade]);

  // ===== Form update helpers =====

  const updateForm = useCallback(
    <K extends keyof NewElectionForm>(key: K, value: NewElectionForm[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateSettings = useCallback(
    <K extends keyof ElectionSettings>(key: K, value: ElectionSettings[K]) => {
      setForm((prev) => ({
        ...prev,
        settings: { ...prev.settings, [key]: value },
      }));
    },
    []
  );

  // ===== Type change handler =====

  const handleTypeChange = useCallback(
    (type: ElectionType) => {
      const suggestion = getSuggestedTitle(type);
      setForm((prev) => ({
        ...prev,
        type,
        title: suggestion || prev.title,
        targetGrades: type === 'school_president' ? [4, 5, 6] : [],
        targetClasses: [],
      }));
    },
    []
  );

  // ===== Grade toggle =====

  const toggleGrade = useCallback(
    (grade: number) => {
      setForm((prev) => {
        const has = prev.targetGrades.includes(grade);
        const newGrades = has
          ? prev.targetGrades.filter((g) => g !== grade)
          : [...prev.targetGrades, grade].sort();
        return { ...prev, targetGrades: newGrades };
      });
    },
    []
  );

  // ===== Class toggle =====

  const toggleClass = useCallback(
    (classId: string) => {
      setForm((prev) => {
        const has = prev.targetClasses.includes(classId);
        const newClasses = has
          ? prev.targetClasses.filter((c) => c !== classId)
          : [...prev.targetClasses, classId].sort();
        return { ...prev, targetClasses: newClasses };
      });
    },
    []
  );

  // ===== Candidate handlers =====

  const addCandidate = useCallback(() => {
    setCandidates((prev) => [...prev, createEmptyCandidate(prev.length + 1)]);
  }, []);

  const updateCandidateAt = useCallback(
    (index: number, data: CandidateFormData) => {
      setCandidates((prev) => prev.map((c, i) => (i === index ? data : c)));
      setCandidateErrors((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    },
    []
  );

  const removeCandidateAt = useCallback((index: number) => {
    setCandidates((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((c, i) => ({ ...c, number: i + 1 }));
    });
    setCandidateErrors({});
  }, []);

  // ===== Step validation =====

  const validateStep = useCallback(
    (step: number): boolean => {
      switch (step) {
        case 0: {
          if (!form.type) {
            toast.error('선거 유형을 선택해주세요.');
            return false;
          }
          if (!form.title.trim()) {
            toast.error('선거 제목을 입력해주세요.');
            return false;
          }
          return true;
        }
        case 1: {
          if (form.type === 'school_president') {
            if (form.targetGrades.length === 0) {
              toast.error('대상 학년을 1개 이상 선택해주세요.');
              return false;
            }
          } else if (form.type === 'class_president') {
            if (form.targetClasses.length === 0) {
              toast.error('대상 반을 1개 이상 선택해주세요.');
              return false;
            }
          } else {
            if (form.targetGrades.length === 0 && form.targetClasses.length === 0) {
              toast.error('대상 학년 또는 반을 선택해주세요.');
              return false;
            }
          }
          return true;
        }
        case 2: {
          if (candidates.length < 2) {
            toast.error('후보자를 2명 이상 등록해주세요.');
            return false;
          }
          let hasError = false;
          const newErrors: Record<number, Record<string, string>> = {};
          candidates.forEach((c, i) => {
            const errs = validateCandidate(c);
            if (Object.keys(errs).length > 0) {
              newErrors[i] = errs;
              hasError = true;
            }
          });
          setCandidateErrors(newErrors);
          if (hasError) {
            toast.error('후보자 정보를 확인해주세요.');
            return false;
          }
          return true;
        }
        case 3: {
          if (!form.startTime) {
            toast.error('투표 시작 시간을 설정해주세요.');
            return false;
          }
          if (!form.endTime) {
            toast.error('투표 종료 시간을 설정해주세요.');
            return false;
          }
          if (new Date(form.startTime) >= new Date(form.endTime)) {
            toast.error('종료 시간은 시작 시간 이후여야 합니다.');
            return false;
          }
          return true;
        }
        default:
          return true;
      }
    },
    [form, candidates]
  );

  // ===== Navigation =====

  const goNext = useCallback(() => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }, [currentStep, validateStep]);

  const goBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  // ===== Submit =====

  const handleSubmit = useCallback(async () => {
    if (!validateStep(3)) return;
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    setSubmitting(true);
    try {
      const candidatesWithIds: Candidate[] = candidates.map((c, i) => ({
        ...c,
        id: `cand_${Date.now()}_${i}`,
        number: i + 1,
      }));

      const electionId = await createElection({
        schoolId: school?.id || user.uid,
        title: form.title,
        type: form.type,
        description: form.description,
        targetGrades: form.targetGrades,
        targetClasses: form.targetClasses,
        candidates: candidatesWithIds,
        status: 'draft',
        startTime: form.startTime ? Timestamp.fromDate(new Date(form.startTime)) : null,
        endTime: form.endTime ? Timestamp.fromDate(new Date(form.endTime)) : null,
        settings: form.settings,
        hashChainHead: null,
        totalVoters: 0,
        totalVoted: 0,
        createdBy: user.uid,
      });

      toast.success('선거가 성공적으로 생성되었습니다!');
      router.push(`/admin/elections/${electionId}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '선거 생성에 실패했습니다.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [form, candidates, user, school, router, validateStep]);

  // ===== Loading =====

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" label="로딩 중..." />
      </div>
    );
  }

  // ===== Render =====

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
          돌아가기
        </button>
        <h1 className="text-2xl font-bold text-gray-900">새 선거 만들기</h1>
        <p className="mt-1 text-gray-500">
          단계별로 선거 정보를 입력하세요.
        </p>
      </div>

      {/* Step Indicators */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const StepIcon = step.icon;
            const isActive = idx === currentStep;
            const isCompleted = idx < currentStep;
            return (
              <div key={step.id} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => {
                      if (idx < currentStep) setCurrentStep(idx);
                    }}
                    disabled={idx > currentStep}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200',
                      isCompleted
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : isActive
                          ? 'border-blue-600 bg-white text-blue-600'
                          : 'border-gray-300 bg-white text-gray-400',
                      idx < currentStep && 'cursor-pointer hover:bg-blue-700'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </button>
                  <span
                    className={cn(
                      'mt-2 text-xs font-medium',
                      isActive ? 'text-blue-600' : isCompleted ? 'text-blue-600' : 'text-gray-400'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'mx-2 h-0.5 flex-1',
                      idx < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Step 1: Basic Info */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <Card padding="lg">
                <h2 className="mb-6 text-lg font-semibold text-gray-900">
                  선거 유형 선택
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {(
                    [
                      {
                        type: 'school_president' as ElectionType,
                        icon: School,
                        desc: '전교생 대상 회장 선거',
                      },
                      {
                        type: 'class_president' as ElectionType,
                        icon: Users,
                        desc: '학급 단위 회장 선거',
                      },
                      {
                        type: 'custom' as ElectionType,
                        icon: Vote,
                        desc: '자유 형식 투표/설문',
                      },
                    ] as const
                  ).map((item) => {
                    const Icon = item.icon;
                    const isSelected = form.type === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => handleTypeChange(item.type)}
                        className={cn(
                          'flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all duration-200',
                          isSelected
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-12 w-12 items-center justify-center rounded-full',
                            isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                          )}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <p
                            className={cn(
                              'font-semibold',
                              isSelected ? 'text-blue-700' : 'text-gray-900'
                            )}
                          >
                            {ELECTION_TYPE_LABELS[item.type]}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>

              <Card padding="lg">
                <h2 className="mb-6 text-lg font-semibold text-gray-900">
                  선거 정보
                </h2>
                <div className="space-y-4">
                  <Input
                    label="선거 제목"
                    value={form.title}
                    onChange={(e) => updateForm('title', e.target.value)}
                    placeholder="예: 2026학년도 전교 어린이 회장 선거"
                    inputSize="lg"
                  />
                  {form.type && !form.title && (
                    <button
                      type="button"
                      onClick={() =>
                        updateForm('title', getSuggestedTitle(form.type))
                      }
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <AlertCircle className="h-3.5 w-3.5" />
                      추천 제목 사용하기: &quot;{getSuggestedTitle(form.type)}&quot;
                    </button>
                  )}
                  <div className="w-full">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      설명 (선택사항)
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => updateForm('description', e.target.value)}
                      placeholder="선거에 대한 추가 설명을 입력하세요."
                      rows={3}
                      className={cn(
                        'w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm',
                        'placeholder:text-gray-400',
                        'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200',
                        'resize-none'
                      )}
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Step 2: Target Settings */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <Card padding="lg">
                <h2 className="mb-2 text-lg font-semibold text-gray-900">
                  투표 대상 설정
                </h2>
                <p className="mb-6 text-sm text-gray-500">
                  {form.type === 'school_president'
                    ? '투표에 참여할 학년을 선택하세요.'
                    : form.type === 'class_president'
                      ? '투표에 참여할 반을 선택하세요.'
                      : '투표에 참여할 학년과 반을 선택하세요.'}
                </p>

                {/* School President: Grade selection */}
                {(form.type === 'school_president' || form.type === 'custom') && (
                  <div className="mb-6">
                    <h3 className="mb-3 text-sm font-medium text-gray-700">
                      대상 학년
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {[1, 2, 3, 4, 5, 6].map((grade) => {
                        const isSelected = form.targetGrades.includes(grade);
                        return (
                          <button
                            key={grade}
                            type="button"
                            onClick={() => toggleGrade(grade)}
                            className={cn(
                              'flex h-14 w-20 flex-col items-center justify-center rounded-lg border-2 text-sm font-medium transition-all duration-150',
                              isSelected
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                            )}
                          >
                            <span className="text-lg font-bold">{grade}</span>
                            <span className="text-xs">학년</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Class President: Grade dropdown + Class checkboxes */}
                {form.type === 'class_president' && (
                  <ClassPresidentSelector
                    selectedGrade={form.targetGrades[0] || 0}
                    selectedClasses={form.targetClasses}
                    maxClassesPerGrade={maxClassesPerGrade}
                    onGradeChange={(grade) => {
                      setForm((prev) => ({
                        ...prev,
                        targetGrades: grade > 0 ? [grade] : [],
                        targetClasses: [],
                      }));
                    }}
                    onClassToggle={toggleClass}
                  />
                )}

                {/* Custom: Grade + class checkboxes */}
                {form.type === 'custom' && form.targetGrades.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-medium text-gray-700">
                      대상 반 (선택사항)
                    </h3>
                    {form.targetGrades.map((grade) => {
                      const classCount = maxClassesPerGrade[grade] || 5;
                      return (
                        <div key={grade} className="mb-4">
                          <p className="mb-2 text-sm font-medium text-gray-600">
                            {GRADE_LABELS[grade]}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {Array.from({ length: classCount }, (_, i) => i + 1).map(
                              (classNum) => {
                                const classId = `${grade}-${classNum}`;
                                const isSelected = form.targetClasses.includes(classId);
                                return (
                                  <button
                                    key={classId}
                                    type="button"
                                    onClick={() => toggleClass(classId)}
                                    className={cn(
                                      'rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-150',
                                      isSelected
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                    )}
                                  >
                                    {classNum}반
                                  </button>
                                );
                              }
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Estimated voters */}
                <div className="mt-6 rounded-lg bg-blue-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">
                      예상 유권자 수: 약 {estimatedVoters > 0 ? `${estimatedVoters}명` : '- 명'}
                    </span>
                  </div>
                  {estimatedVoters === 0 && (
                    <p className="mt-1 text-xs text-blue-500">
                      {school
                        ? '대상을 선택하면 예상 인원이 표시됩니다.'
                        : '학교 정보가 없어 예상 인원을 계산할 수 없습니다.'}
                    </p>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Step 3: Candidates */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    후보자 등록
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    최소 2명 이상의 후보자를 등록해주세요.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={addCandidate}
                  iconLeft={<Plus className="h-4 w-4" />}
                >
                  후보자 추가
                </Button>
              </div>

              {candidates.length === 0 ? (
                <Card padding="lg" className="text-center">
                  <div className="py-8">
                    <UserPlus className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-4 text-gray-500">
                      아직 등록된 후보자가 없습니다.
                    </p>
                    <p className="mt-1 text-sm text-gray-400">
                      &quot;후보자 추가&quot; 버튼을 눌러 후보자를 등록하세요.
                    </p>
                    <Button
                      variant="outline"
                      size="md"
                      onClick={addCandidate}
                      iconLeft={<Plus className="h-4 w-4" />}
                      className="mt-4"
                    >
                      첫 번째 후보자 추가
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {candidates.map((candidate, idx) => (
                      <CandidateForm
                        key={idx}
                        candidate={candidate}
                        index={idx}
                        onChange={updateCandidateAt}
                        onRemove={removeCandidateAt}
                        errors={candidateErrors[idx] || {}}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Settings */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Time settings */}
              <Card padding="lg">
                <h2 className="mb-6 text-lg font-semibold text-gray-900">
                  투표 시간 설정
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="w-full">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      시작 시간
                    </label>
                    <input
                      type="datetime-local"
                      value={form.startTime}
                      onChange={(e) => updateForm('startTime', e.target.value)}
                      className={cn(
                        'h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm',
                        'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200'
                      )}
                    />
                  </div>
                  <div className="w-full">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      종료 시간
                    </label>
                    <input
                      type="datetime-local"
                      value={form.endTime}
                      onChange={(e) => updateForm('endTime', e.target.value)}
                      className={cn(
                        'h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm',
                        'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200'
                      )}
                    />
                  </div>
                </div>
              </Card>

              {/* Toggle settings */}
              <Card padding="lg">
                <h2 className="mb-6 text-lg font-semibold text-gray-900">
                  투표 옵션
                </h2>
                <div className="space-y-4">
                  <ToggleRow
                    label="기권 허용"
                    description="유권자가 '기권' 선택지를 사용할 수 있습니다."
                    checked={form.settings.allowAbstention}
                    onChange={(v) => updateSettings('allowAbstention', v)}
                  />
                  <ToggleRow
                    label="실시간 투표 현황 공개"
                    description="투표 진행 중 실시간 투표율을 표시합니다."
                    checked={form.settings.showRealtimeCount}
                    onChange={(v) => updateSettings('showRealtimeCount', v)}
                  />
                  <ToggleRow
                    label="투표 확인 단계"
                    description="투표 전 선택 내용을 한 번 더 확인합니다."
                    checked={form.settings.requireConfirmation}
                    onChange={(v) => updateSettings('requireConfirmation', v)}
                  />
                  <ToggleRow
                    label="후보자 순서 무작위"
                    description="투표 화면에서 후보자 순서를 랜덤으로 표시합니다."
                    checked={form.settings.shuffleCandidates}
                    onChange={(v) => updateSettings('shuffleCandidates', v)}
                  />
                  <ToggleRow
                    label="후보자 사진 표시"
                    description="투표 화면에서 후보자 사진을 보여줍니다."
                    checked={form.settings.showCandidatePhoto}
                    onChange={(v) => updateSettings('showCandidatePhoto', v)}
                  />
                </div>
              </Card>

              {/* Review Summary */}
              <Card padding="lg">
                <h2 className="mb-6 text-lg font-semibold text-gray-900">
                  선거 요약
                </h2>
                <div className="space-y-3">
                  <SummaryRow label="유형" value={ELECTION_TYPE_LABELS[form.type]} />
                  <SummaryRow label="제목" value={form.title} />
                  {form.description && (
                    <SummaryRow label="설명" value={form.description} />
                  )}
                  <SummaryRow
                    label="대상 학년"
                    value={
                      form.targetGrades.length > 0
                        ? form.targetGrades.map((g) => `${g}학년`).join(', ')
                        : '-'
                    }
                  />
                  {form.targetClasses.length > 0 && (
                    <SummaryRow
                      label="대상 반"
                      value={form.targetClasses
                        .map((c) => {
                          const [g, cl] = c.split('-');
                          return `${g}학년 ${cl}반`;
                        })
                        .join(', ')}
                    />
                  )}
                  <SummaryRow
                    label="후보자"
                    value={`${candidates.length}명 (${candidates.map((c) => c.name).filter(Boolean).join(', ')})`}
                  />
                  <SummaryRow
                    label="투표 시간"
                    value={
                      form.startTime && form.endTime
                        ? `${formatLocalDateTime(form.startTime)} ~ ${formatLocalDateTime(form.endTime)}`
                        : '미설정'
                    }
                  />
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex flex-wrap gap-2">
                      {form.settings.allowAbstention && (
                        <Badge variant="info">기권 허용</Badge>
                      )}
                      {form.settings.showRealtimeCount && (
                        <Badge variant="info">실시간 현황</Badge>
                      )}
                      {form.settings.requireConfirmation && (
                        <Badge variant="info">확인 단계</Badge>
                      )}
                      {form.settings.shuffleCandidates && (
                        <Badge variant="info">순서 무작위</Badge>
                      )}
                      {form.settings.showCandidatePhoto && (
                        <Badge variant="info">사진 표시</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="mt-8 flex items-center justify-between">
        <div>
          {currentStep > 0 && (
            <Button
              variant="outline"
              size="lg"
              onClick={goBack}
              iconLeft={<ChevronLeft className="h-4 w-4" />}
            >
              이전
            </Button>
          )}
        </div>
        <div>
          {currentStep < STEPS.length - 1 ? (
            <Button
              variant="primary"
              size="lg"
              onClick={goNext}
              iconRight={<ChevronRight className="h-4 w-4" />}
            >
              다음
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              loading={submitting}
              iconLeft={<Check className="h-4 w-4" />}
            >
              선거 생성
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Sub-components =====

function ClassPresidentSelector({
  selectedGrade,
  selectedClasses,
  maxClassesPerGrade,
  onGradeChange,
  onClassToggle,
}: {
  selectedGrade: number;
  selectedClasses: string[];
  maxClassesPerGrade: Record<number, number>;
  onGradeChange: (grade: number) => void;
  onClassToggle: (classId: string) => void;
}) {
  const classCount = maxClassesPerGrade[selectedGrade] || 5;

  return (
    <div className="space-y-4">
      <div className="w-full">
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          학년 선택
        </label>
        <select
          value={selectedGrade}
          onChange={(e) => onGradeChange(Number(e.target.value))}
          className={cn(
            'h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm sm:w-48',
            'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200'
          )}
        >
          <option value={0}>학년 선택</option>
          {[1, 2, 3, 4, 5, 6].map((g) => (
            <option key={g} value={g}>
              {GRADE_LABELS[g]}
            </option>
          ))}
        </select>
      </div>

      {selectedGrade > 0 && (
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            반 선택
          </label>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: classCount }, (_, i) => i + 1).map((classNum) => {
              const classId = `${selectedGrade}-${classNum}`;
              const isSelected = selectedClasses.includes(classId);
              return (
                <button
                  key={classId}
                  type="button"
                  onClick={() => onClassToggle(classId)}
                  className={cn(
                    'rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-150',
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  {classNum}반
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
      <div className="mr-4">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
          checked ? 'bg-blue-600' : 'bg-gray-200'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="w-20 shrink-0 text-sm font-medium text-gray-500">
        {label}
      </span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  );
}

function formatLocalDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}
