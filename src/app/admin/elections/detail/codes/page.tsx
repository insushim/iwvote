'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Download,
  Printer,
  RefreshCw,
  Zap,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { CodeGenerator } from '@/components/admin/CodeGenerator';
import { CodePrintSheet } from '@/components/admin/CodePrintSheet';
import { useElection } from '@/hooks/useElection';
import { useAuthContext } from '@/context/AuthContext';
import { getSchool } from '@/lib/firestore';
import { classIdToLabel, formatDate } from '@/lib/utils';
import type { VoterCode, School } from '@/types';

function CodesPageContent() {
  const searchParams = useSearchParams();
  const electionId = searchParams.get('id') ?? '';
  const { election, loading: electionLoading, error: electionError } = useElection(electionId);
  const { user } = useAuthContext();

  const [codes, setCodes] = useState<VoterCode[]>([]);
  const [codesLoading, setCodesLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [school, setSchool] = useState<School | null>(null);

  // Fetch school data for student counts and class info
  useEffect(() => {
    if (!user) return;
    getSchool(user.uid).then(setSchool).catch(() => {});
  }, [user]);

  const fetchCodes = useCallback(async () => {
    setCodesLoading(true);
    try {
      const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const { COLLECTIONS } = await import('@/constants');

      const q = query(
        collection(db, COLLECTIONS.VOTER_CODES),
        where('electionId', '==', electionId),
        orderBy('classId', 'asc'),
        orderBy('studentNumber', 'asc')
      );

      const snap = await getDocs(q);
      const fetchedCodes: VoterCode[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as VoterCode[];

      setCodes(fetchedCodes);
    } catch (err) {
      console.error('Failed to fetch codes:', err);
      toast.error('투표 코드를 불러오는데 실패했습니다.');
    } finally {
      setCodesLoading(false);
    }
  }, [electionId]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  // Group codes by class
  const codesByClass = useMemo(() => {
    const grouped: Record<string, VoterCode[]> = {};
    codes.forEach((code) => {
      const classId = code.classId;
      if (!grouped[classId]) {
        grouped[classId] = [];
      }
      grouped[classId].push(code);
    });

    // Sort within each class by studentNumber
    Object.values(grouped).forEach((arr) => {
      arr.sort((a, b) => a.studentNumber - b.studentNumber);
    });

    return grouped;
  }, [codes]);

  const sortedClassIds = useMemo(() => {
    return Object.keys(codesByClass).sort((a, b) => {
      const [aG, aC] = a.split('-').map(Number);
      const [bG, bC] = b.split('-').map(Number);
      if (aG !== bG) return aG - bG;
      return aC - bC;
    });
  }, [codesByClass]);

  // Classes config for CodeGenerator
  const classConfigs = useMemo(() => {
    if (!election) return [];

    // If election has explicit targetClasses, use those
    if (election.targetClasses.length > 0) {
      return election.targetClasses.map((classId) => {
        const studentCount = school?.studentsPerClass?.[classId] || 30;
        return { classId, count: studentCount };
      });
    }

    // For school_president: derive from targetGrades + school classesPerGrade
    if (election.targetGrades.length > 0 && school) {
      const configs: { classId: string; count: number }[] = [];
      for (const grade of election.targetGrades) {
        const numClasses = school.classesPerGrade?.[grade] || 3;
        for (let c = 1; c <= numClasses; c++) {
          const classId = `${grade}-${c}`;
          const studentCount = school.studentsPerClass?.[classId] || 30;
          configs.push({ classId, count: studentCount });
        }
      }
      return configs;
    }

    return [];
  }, [election, school]);

  // Print codes for selected class
  const printCodes = useMemo(() => {
    if (!selectedClass || !codesByClass[selectedClass]) return [];
    return codesByClass[selectedClass].map((c) => ({
      code: c.code,
      classId: c.classId,
      studentNumber: c.studentNumber,
    }));
  }, [selectedClass, codesByClass]);

  // All codes for print
  const allPrintCodes = useMemo(() => {
    return codes.map((c) => ({
      code: c.code,
      classId: c.classId,
      studentNumber: c.studentNumber,
    }));
  }, [codes]);

  const downloadCSV = useCallback(() => {
    if (codes.length === 0) {
      toast.error('다운로드할 코드가 없습니다.');
      return;
    }

    const header = '반,번호,투표코드,상태\n';
    const rows = codes
      .sort((a, b) => {
        if (a.classId !== b.classId) return a.classId.localeCompare(b.classId);
        return a.studentNumber - b.studentNumber;
      })
      .map(
        (c) =>
          `${classIdToLabel(c.classId)},${c.studentNumber},${c.code},${c.used ? '사용됨' : '미사용'}`
      )
      .join('\n');

    const csvContent = '\uFEFF' + header + rows; // BOM for Korean encoding
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `투표코드_${election?.title ?? electionId}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('CSV 파일이 다운로드되었습니다.');
  }, [codes, election, electionId]);

  const handlePrintClass = (classId: string) => {
    setSelectedClass(classId);
    setTimeout(() => window.print(), 300);
  };

  const handlePrintAll = () => {
    setSelectedClass(null);
    setTimeout(() => window.print(), 300);
  };

  // Generate codes for all classes
  const handleGenerateAll = async () => {
    if (!election) return;
    setShowGenerator(true);
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

  const totalCodes = codes.length;
  const usedCodes = codes.filter((c) => c.used).length;

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
            <h1 className="text-xl font-bold text-gray-900">투표 코드 관리</h1>
            <p className="text-sm text-gray-500">{election.title}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="md"
            iconLeft={<Zap className="h-4 w-4" />}
            onClick={handleGenerateAll}
          >
            전체 코드 생성
          </Button>
          <Button
            variant="outline"
            size="md"
            iconLeft={<RefreshCw className="h-4 w-4" />}
            onClick={fetchCodes}
            loading={codesLoading}
          >
            새로고침
          </Button>
          <Button
            variant="outline"
            size="md"
            iconLeft={<Download className="h-4 w-4" />}
            onClick={downloadCSV}
            disabled={codes.length === 0}
          >
            전체 코드 CSV 다운로드
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card padding="md" className="bg-blue-50">
          <p className="text-sm text-blue-600">전체 코드</p>
          <p className="text-2xl font-bold text-blue-900">{totalCodes}개</p>
        </Card>
        <Card padding="md" className="bg-green-50">
          <p className="text-sm text-green-600">사용됨</p>
          <p className="text-2xl font-bold text-green-900">{usedCodes}개</p>
        </Card>
        <Card padding="md" className="bg-gray-50">
          <p className="text-sm text-gray-600">미사용</p>
          <p className="text-2xl font-bold text-gray-900">{totalCodes - usedCodes}개</p>
        </Card>
      </div>

      {/* Codes table per class */}
      {codesLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" label="코드 로딩중..." />
        </div>
      ) : codes.length === 0 ? (
        <Card padding="lg">
          <div className="py-8 text-center">
            <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-gray-500">생성된 투표 코드가 없습니다.</p>
            <p className="text-sm text-gray-400">
              &quot;전체 코드 생성&quot; 버튼을 클릭하여 코드를 생성하세요.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedClassIds.map((classId) => {
            const classCodes = codesByClass[classId];
            const classUsed = classCodes.filter((c) => c.used).length;

            return (
              <motion.div
                key={classId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card padding="none">
                  <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">
                        {classIdToLabel(classId)}
                      </h3>
                      <Badge
                        variant={classUsed === classCodes.length ? 'success' : 'default'}
                        size="sm"
                      >
                        {classUsed}/{classCodes.length} 사용
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      iconLeft={<Printer className="h-3.5 w-3.5" />}
                      onClick={() => handlePrintClass(classId)}
                    >
                      반별 인쇄
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-2.5 text-left font-medium text-gray-600">반</th>
                          <th className="px-4 py-2.5 text-left font-medium text-gray-600">번호</th>
                          <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                            투표코드
                          </th>
                          <th className="px-4 py-2.5 text-center font-medium text-gray-600">
                            상태
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {classCodes.map((code, idx) => (
                          <tr
                            key={code.id}
                            className={`border-t border-gray-100 ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                            }`}
                          >
                            <td className="px-4 py-2 text-gray-700">
                              {classIdToLabel(code.classId)}
                            </td>
                            <td className="px-4 py-2 text-gray-700">{code.studentNumber}번</td>
                            <td className="px-4 py-2">
                              <code className="rounded bg-gray-100 px-2 py-0.5 font-mono text-sm font-bold text-gray-900">
                                {code.code}
                              </code>
                            </td>
                            <td className="px-4 py-2 text-center">
                              {code.used ? (
                                <Badge variant="success" size="sm">
                                  사용됨
                                </Badge>
                              ) : (
                                <Badge variant="default" size="sm">
                                  미사용
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Code Generator Modal */}
      <Modal
        isOpen={showGenerator}
        onClose={() => setShowGenerator(false)}
        title="투표 코드 생성"
        size="lg"
      >
        <CodeGenerator
          electionId={electionId}
          classes={classConfigs}
          onCodesGenerated={async () => {
            setShowGenerator(false);
            await fetchCodes();
            // Update total voters count
            if (election) {
              const totalCount = classConfigs.reduce((sum, c) => sum + c.count, 0);
              const { updateElection } = await import('@/lib/firestore');
              await updateElection(electionId, { totalVoters: totalCount });
            }
          }}
        />
      </Modal>

      {/* Print sheets (hidden on screen, shown on print) */}
      {selectedClass ? (
        <CodePrintSheet codes={printCodes} electionTitle={election.title} />
      ) : (
        <CodePrintSheet codes={allPrintCodes} electionTitle={election.title} />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Spinner size="lg" label="로딩 중..." /></div>}>
      <CodesPageContent />
    </Suspense>
  );
}
