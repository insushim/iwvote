'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Settings,
  Save,
  School,
  Users,
  UserPlus,
  CheckSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useAuthContext } from '@/context/AuthContext';
import { getSchool, saveSchool } from '@/lib/firestore';
import { DEFAULT_GRADES } from '@/constants';
import type { School as SchoolType } from '@/types';

export default function SettingsPage() {
  const { user, loading: authLoading, userProfile } = useAuthContext();

  const [schoolName, setSchoolName] = useState('');
  const [selectedGrades, setSelectedGrades] = useState<number[]>([]);
  const [classesPerGrade, setClassesPerGrade] = useState<Record<number, number>>({});
  const [studentsPerClass, setStudentsPerClass] = useState<Record<string, number>>({});
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  // Load school data
  const loadSchoolData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      setSchoolId(user.uid);
      const school = await getSchool(user.uid);
      if (school) {
        setSchoolName(school.name || userProfile?.schoolName || '');
        setSelectedGrades(school.grades || [4, 5, 6]);
        setClassesPerGrade(school.classesPerGrade || { 4: 3, 5: 3, 6: 3 });
        setStudentsPerClass(school.studentsPerClass || {});
        setAdminEmails(school.adminIds || (user.email ? [user.email] : []));
      } else {
        // No school document yet - set defaults from user profile
        setSchoolName(userProfile?.schoolName || '');
        setSelectedGrades([4, 5, 6]);
        const defaultClasses: Record<number, number> = {};
        [4, 5, 6].forEach((g) => {
          defaultClasses[g] = 3;
        });
        setClassesPerGrade(defaultClasses);
        setAdminEmails(user.email ? [user.email] : []);
      }
    } catch (err) {
      console.error('Failed to load school:', err);
      toast.error('학교 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      loadSchoolData();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [authLoading, user, loadSchoolData]);

  // Toggle grade checkbox
  const toggleGrade = (grade: number) => {
    setSelectedGrades((prev) => {
      if (prev.includes(grade)) {
        // Remove the grade and clean up classesPerGrade
        const newClasses = { ...classesPerGrade };
        delete newClasses[grade];
        setClassesPerGrade(newClasses);

        // Clean up studentsPerClass for this grade
        const newStudents = { ...studentsPerClass };
        Object.keys(newStudents).forEach((key) => {
          if (key.startsWith(`${grade}-`)) {
            delete newStudents[key];
          }
        });
        setStudentsPerClass(newStudents);

        return prev.filter((g) => g !== grade);
      } else {
        // Add grade with default classes
        setClassesPerGrade((prevClasses) => ({
          ...prevClasses,
          [grade]: 3,
        }));
        return [...prev, grade].sort((a, b) => a - b);
      }
    });
  };

  // Update classes per grade
  const updateClassCount = (grade: number, count: number) => {
    const validCount = Math.max(1, Math.min(20, count));
    setClassesPerGrade((prev) => ({ ...prev, [grade]: validCount }));

    // Adjust studentsPerClass entries
    const newStudents = { ...studentsPerClass };
    // Remove old entries beyond new count
    Object.keys(newStudents).forEach((key) => {
      if (key.startsWith(`${grade}-`)) {
        const classNum = parseInt(key.split('-')[1], 10);
        if (classNum > validCount) {
          delete newStudents[key];
        }
      }
    });
    setStudentsPerClass(newStudents);
  };

  // Update students per class
  const updateStudentCount = (classId: string, count: number) => {
    const validCount = Math.max(1, Math.min(50, count));
    setStudentsPerClass((prev) => ({ ...prev, [classId]: validCount }));
  };

  // Add admin email
  const addAdminEmail = () => {
    const email = newAdminEmail.trim();
    if (!email) {
      toast.error('이메일을 입력하세요.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('유효한 이메일 주소를 입력하세요.');
      return;
    }
    if (adminEmails.includes(email)) {
      toast.error('이미 등록된 이메일입니다.');
      return;
    }

    setAdminEmails((prev) => [...prev, email]);
    setNewAdminEmail('');
    toast.success('관리자 이메일이 추가되었습니다.');
  };

  // Save settings
  const handleSave = async () => {
    if (!schoolName.trim()) {
      toast.error('학교 이름을 입력하세요.');
      return;
    }
    if (selectedGrades.length === 0) {
      toast.error('최소 1개 학년을 선택하세요.');
      return;
    }
    if (!schoolId) {
      toast.error('학교 정보를 찾을 수 없습니다.');
      return;
    }

    setSaving(true);
    try {
      await saveSchool(schoolId, {
        name: schoolName.trim(),
        grades: selectedGrades,
        classesPerGrade,
        studentsPerClass,
        adminIds: adminEmails,
      });

      toast.success('설정이 저장되었습니다.');
    } catch (err) {
      const message = err instanceof Error ? err.message : '저장에 실패했습니다.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" label="설정 로딩중..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-500">로그인이 필요합니다.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-gray-400" />
          <h1 className="text-xl font-bold text-gray-900">학교 설정</h1>
        </div>
        <Button
          variant="primary"
          size="md"
          iconLeft={<Save className="h-4 w-4" />}
          onClick={handleSave}
          loading={saving}
        >
          저장
        </Button>
      </div>

      {/* School Name */}
      <Card
        padding="md"
        header={
          <div className="flex items-center gap-2">
            <School className="h-4 w-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900">학교 정보</h2>
          </div>
        }
      >
        <Input
          label="학교 이름"
          placeholder="예: 우리초등학교"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
        />
      </Card>

      {/* Grades Configuration */}
      <Card
        padding="md"
        header={
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900">학년 설정</h2>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">선거에 참여할 학년을 선택하세요.</p>

          <div className="flex flex-wrap gap-3">
            {DEFAULT_GRADES.map((grade) => {
              const isSelected = selectedGrades.includes(grade);
              return (
                <button
                  key={grade}
                  onClick={() => toggleGrade(grade)}
                  className={`flex h-12 w-20 items-center justify-center rounded-lg border-2 text-sm font-medium transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {grade}학년
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Classes per grade */}
      {selectedGrades.length > 0 && (
        <Card
          padding="md"
          header={
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <h2 className="font-semibold text-gray-900">반 수 설정</h2>
            </div>
          }
        >
          <div className="space-y-3">
            {selectedGrades.map((grade) => (
              <div key={grade} className="flex items-center gap-4">
                <span className="w-16 text-sm font-medium text-gray-700">
                  {grade}학년
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={classesPerGrade[grade] ?? 3}
                    onChange={(e) =>
                      updateClassCount(grade, parseInt(e.target.value, 10) || 1)
                    }
                    className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-center text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <span className="text-sm text-gray-500">반</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Students per class table */}
      {selectedGrades.length > 0 && (
        <Card
          padding="md"
          header={
            <h2 className="font-semibold text-gray-900">반별 학생 수</h2>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-2 text-left font-medium text-gray-600">학년</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">반</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">학생 수</th>
                </tr>
              </thead>
              <tbody>
                {selectedGrades.map((grade) => {
                  const numClasses = classesPerGrade[grade] ?? 3;
                  return Array.from({ length: numClasses }, (_, i) => {
                    const classNum = i + 1;
                    const classId = `${grade}-${classNum}`;
                    const studentCount = studentsPerClass[classId] ?? 30;

                    return (
                      <tr key={classId} className="border-b border-gray-100">
                        <td className="px-3 py-2 text-gray-700">{grade}학년</td>
                        <td className="px-3 py-2 text-gray-700">{classNum}반</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={studentCount}
                            onChange={(e) =>
                              updateStudentCount(
                                classId,
                                parseInt(e.target.value, 10) || 1
                              )
                            }
                            className="w-20 rounded-lg border border-gray-300 px-3 py-1.5 text-center text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          />
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Admin Account Management */}
      <Card
        padding="md"
        header={
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900">관리자 계정</h2>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            학교 관리자로 등록된 이메일 목록입니다.
          </p>

          {/* Current admins */}
          <div className="space-y-2">
            {adminEmails.map((email, index) => (
              <div
                key={email}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5"
              >
                <span className="text-sm text-gray-700">{email}</span>
                {email === user?.email ? (
                  <Badge variant="info" size="sm">
                    나
                  </Badge>
                ) : (
                  <Badge variant="default" size="sm">
                    관리자
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {/* Add new admin */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="관리자 이메일 주소 입력..."
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addAdminEmail();
                }}
              />
            </div>
            <Button
              variant="outline"
              size="md"
              iconLeft={<UserPlus className="h-4 w-4" />}
              onClick={addAdminEmail}
            >
              추가
            </Button>
          </div>
        </div>
      </Card>

      {/* Save button at bottom */}
      <div className="flex justify-end pb-8">
        <Button
          variant="primary"
          size="lg"
          iconLeft={<Save className="h-5 w-5" />}
          onClick={handleSave}
          loading={saving}
        >
          설정 저장
        </Button>
      </div>
    </div>
  );
}
