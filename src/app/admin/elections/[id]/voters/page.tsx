'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  Save,
  Download,
  KeyRound,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { ClassVoterSetup } from '@/components/admin/ClassVoterSetup';
import { VoterTable } from '@/components/admin/VoterTable';
import { useElection } from '@/hooks/useElection';
import { useAuth } from '@/hooks/useAuth';
import {
  getSchool,
  updateElection,
  getVoterCodesByElection,
  getVoterCodeStats,
} from '@/lib/firestore';
import { cn } from '@/lib/utils';
import { GRADE_LABELS } from '@/constants';
import type { School, VoterCode } from '@/types';

// ===== Types =====

interface ClassInfo {
  classId: string;
  grade: number;
  classNum: number;
  studentCount: number;
  codesGenerated: boolean;
  codesUsed: number;
  codesTotal: number;
}

export default function VotersPage() {
  const params = useParams();
  const router = useRouter();
  const electionId = params.id as string;
  const { election, loading: electionLoading, error: electionError } = useElection(electionId);
  const { user } = useAuth();

  const [school, setSchool] = useState<School | null>(null);
  const [schoolLoading, setSchoolLoading] = useState(true);
  const [activeGrade, setActiveGrade] = useState<number>(0);
  const [classData, setClassData] = useState<Record<string, number>>({});
  const [codeStats, setCodeStats] = useState<Record<string, { total: number; used: number }>>({});
  const [saving, setSaving] = useState(false);
  const [voterCodes, setVoterCodes] = useState<VoterCode[]>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [selectedClassForCodes, setSelectedClassForCodes] = useState<string | null>(null);

  // Fetch school data
  useEffect(() => {
    async function fetchSchool() {
      if (!user) return;
      try {
        const data = await getSchool(user.uid);
        setSchool(data);
      } catch {
        // Silently fail - school data is optional
      } finally {
        setSchoolLoading(false);
      }
    }
    fetchSchool();
  }, [user]);

  // Fetch voter code stats
  useEffect(() => {
    async function fetchStats() {
      if (!electionId) return;
      try {
        const stats = await getVoterCodeStats(electionId);
        setCodeStats(stats);
      } catch {
        // Silently fail
      }
    }
    fetchStats();
  }, [electionId]);

  // Initialize class data from election targetClasses or targetGrades
  useEffect(() => {
    if (!election) return;

    const initial: Record<string, number> = {};
    if (election.targetClasses.length > 0) {
      for (const classId of election.targetClasses) {
        initial[classId] = school?.studentsPerClass?.[classId] || 30;
      }
    } else if (election.targetGrades.length > 0 && school) {
      for (const grade of election.targetGrades) {
        const classCount = school.classesPerGrade?.[grade] || 3;
        for (let c = 1; c <= classCount; c++) {
          const classId = `${grade}-${c}`;
          initial[classId] = school.studentsPerClass?.[classId] || 30;
        }
      }
    }

    setClassData(initial);

    // Set first active grade
    const grades = election.targetGrades.length > 0
      ? election.targetGrades
      : [...new Set(Object.keys(initial).map((k) => parseInt(k.split('-')[0])))].sort();
    if (grades.length > 0 && activeGrade === 0) {
      setActiveGrade(grades[0]);
    }
  }, [election, school, activeGrade]);

  // Compute class info list
  const classInfoList = useMemo((): ClassInfo[] => {
    return Object.entries(classData)
      .map(([classId, studentCount]) => {
        const [g, c] = classId.split('-');
        const stats = codeStats[classId];
        return {
          classId,
          grade: parseInt(g),
          classNum: parseInt(c),
          studentCount,
          codesGenerated: !!stats && stats.total > 0,
          codesUsed: stats?.used || 0,
          codesTotal: stats?.total || 0,
        };
      })
      .sort((a, b) => a.grade - b.grade || a.classNum - b.classNum);
  }, [classData, codeStats]);

  // Available grades
  const availableGrades = useMemo(() => {
    const grades = [...new Set(classInfoList.map((c) => c.grade))].sort();
    return grades;
  }, [classInfoList]);

  // Filtered classes for active grade
  const filteredClasses = useMemo(() => {
    if (activeGrade === 0) return classInfoList;
    return classInfoList.filter((c) => c.grade === activeGrade);
  }, [classInfoList, activeGrade]);

  // Total counts
  const totalStudents = useMemo(
    () => classInfoList.reduce((sum, c) => sum + c.studentCount, 0),
    [classInfoList]
  );

  // Auto-fill from school data
  const handleAutoFill = useCallback(() => {
    if (!school || !election) {
      toast.error('학교 정보를 불러올 수 없습니다.');
      return;
    }

    const newData: Record<string, number> = {};
    const grades = election.targetGrades.length > 0 ? election.targetGrades : [1, 2, 3, 4, 5, 6];

    for (const grade of grades) {
      const classCount = school.classesPerGrade?.[grade] || 3;
      for (let c = 1; c <= classCount; c++) {
        const classId = `${grade}-${c}`;
        newData[classId] = school.studentsPerClass?.[classId] || 30;
      }
    }

    setClassData(newData);
    toast.success('학교 설정에서 학생 수를 가져왔습니다.');
  }, [school, election]);

  // Update student count for a class
  const handleClassCountChange = useCallback((classId: string, count: number) => {
    setClassData((prev) => ({ ...prev, [classId]: Math.max(0, count) }));
  }, []);

  // Save voter setup
  const handleSave = useCallback(async () => {
    if (!election) return;

    setSaving(true);
    try {
      const targetClasses = Object.keys(classData);
      const totalVoters = Object.values(classData).reduce((sum, c) => sum + c, 0);

      await updateElection(electionId, {
        targetClasses,
        totalVoters,
      });

      toast.success('유권자 설정이 저장되었습니다.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '저장에 실패했습니다.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [election, electionId, classData]);

  // Fetch voter codes for a class
  const handleViewCodes = useCallback(
    async (classId: string) => {
      setSelectedClassForCodes(classId);
      setCodesLoading(true);
      try {
        const codes = await getVoterCodesByElection(electionId, classId);
        setVoterCodes(codes);
      } catch {
        toast.error('투표 코드를 불러오는데 실패했습니다.');
        setVoterCodes([]);
      } finally {
        setCodesLoading(false);
      }
    },
    [electionId]
  );

  // Loading
  if (electionLoading || schoolLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" label="유권자 정보를 불러오는 중..." />
      </div>
    );
  }

  // Error
  if (electionError || !election) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <p className="text-lg font-medium text-gray-700">
          {electionError || '선거를 찾을 수 없습니다.'}
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <button
        onClick={() => router.push(`/admin/elections/${electionId}`)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" />
        {election.title}
      </button>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">유권자 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            반별 학생 수를 설정하고 투표 코드를 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={handleAutoFill}
            iconLeft={<Download className="h-4 w-4" />}
          >
            학교 설정에서 가져오기
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            loading={saving}
            iconLeft={<Save className="h-4 w-4" />}
          >
            저장
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card padding="sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
            <p className="text-xs text-gray-500">총 유권자 수</p>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {classInfoList.length}
            </p>
            <p className="text-xs text-gray-500">총 반 수</p>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {classInfoList.filter((c) => c.codesGenerated).length}
            </p>
            <p className="text-xs text-gray-500">코드 생성 완료</p>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">
              {classInfoList.filter((c) => !c.codesGenerated).length}
            </p>
            <p className="text-xs text-gray-500">코드 미생성</p>
          </div>
        </Card>
      </div>

      {/* Grade Tabs */}
      {availableGrades.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {availableGrades.map((grade) => (
            <button
              key={grade}
              onClick={() => setActiveGrade(grade)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150',
                activeGrade === grade
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              )}
            >
              {GRADE_LABELS[grade]}
            </button>
          ))}
        </div>
      )}

      {/* Class setup and table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  반
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  학생 수
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  코드 생성
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  상태
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredClasses.map((classInfo) => (
                <tr key={classInfo.classId} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="font-medium text-gray-900">
                      {classInfo.grade}학년 {classInfo.classNum}반
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={classInfo.studentCount}
                      onChange={(e) =>
                        handleClassCountChange(
                          classInfo.classId,
                          parseInt(e.target.value) || 0
                        )
                      }
                      className={cn(
                        'h-8 w-20 rounded-md border border-gray-300 px-2 text-center text-sm',
                        'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200'
                      )}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {classInfo.codesGenerated ? (
                      <Badge variant="success" size="sm" dot>
                        {classInfo.codesTotal}개
                      </Badge>
                    ) : (
                      <Badge variant="default" size="sm">
                        미생성
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {classInfo.codesGenerated ? (
                      <span className="text-sm text-gray-600">
                        {classInfo.codesUsed}/{classInfo.codesTotal} 사용
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {classInfo.codesGenerated ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewCodes(classInfo.classId)}
                      >
                        코드 보기
                      </Button>
                    ) : (
                      <Link
                        href={`/admin/elections/${electionId}/codes?class=${classInfo.classId}`}
                      >
                        <Button variant="outline" size="sm" iconLeft={<KeyRound className="h-3.5 w-3.5" />}>
                          코드 생성
                        </Button>
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredClasses.length === 0 && (
          <div className="px-4 py-12 text-center">
            <Users className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">
              해당 학년에 설정된 반이 없습니다.
            </p>
          </div>
        )}
      </Card>

      {/* Code generation link */}
      <div className="mt-6 flex justify-center">
        <Link href={`/admin/elections/${electionId}/codes`}>
          <Button
            variant="outline"
            size="lg"
            iconLeft={<KeyRound className="h-4 w-4" />}
          >
            투표코드 관리 페이지로 이동
          </Button>
        </Link>
      </div>

      {/* Voter codes table (inline view) */}
      {selectedClassForCodes && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <Card
            padding="lg"
            header={
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">
                  {selectedClassForCodes.replace('-', '학년 ')}반 투표 코드
                </h3>
                <button
                  onClick={() => {
                    setSelectedClassForCodes(null);
                    setVoterCodes([]);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  닫기
                </button>
              </div>
            }
          >
            {codesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="md" label="코드를 불러오는 중..." />
              </div>
            ) : voterCodes.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                생성된 투표 코드가 없습니다.
              </p>
            ) : (
              <VoterTable codes={voterCodes} />
            )}
          </Card>
        </motion.div>
      )}
    </div>
  );
}
