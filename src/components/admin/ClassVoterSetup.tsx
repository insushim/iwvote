'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { GRADE_LABELS } from '@/constants';
import type { Election, School } from '@/types';

interface ClassVoterSetupProps {
  election: Election;
  school: School | null;
  classData: Record<string, number>;
  onClassCountChange: (classId: string, count: number) => void;
  onBulkUpdate: (data: Record<string, number>) => void;
  disabled?: boolean;
}

interface GradeGroup {
  grade: number;
  classes: {
    classId: string;
    classNum: number;
    count: number;
  }[];
}

export function ClassVoterSetup({
  election,
  school,
  classData,
  onClassCountChange,
  onBulkUpdate,
  disabled = false,
}: ClassVoterSetupProps) {
  const [expandedGrades, setExpandedGrades] = useState<Set<number>>(
    new Set(election.targetGrades)
  );

  // Group classes by grade
  const gradeGroups = useMemo((): GradeGroup[] => {
    const groups: Record<number, GradeGroup> = {};

    for (const [classId, count] of Object.entries(classData)) {
      const [gradeStr, classStr] = classId.split('-');
      const grade = parseInt(gradeStr);
      const classNum = parseInt(classStr);

      if (!groups[grade]) {
        groups[grade] = { grade, classes: [] };
      }
      groups[grade].classes.push({ classId, classNum, count });
    }

    // Sort grades and classes
    return Object.values(groups)
      .sort((a, b) => a.grade - b.grade)
      .map((g) => ({
        ...g,
        classes: g.classes.sort((a, b) => a.classNum - b.classNum),
      }));
  }, [classData]);

  // Total count
  const totalCount = useMemo(
    () => Object.values(classData).reduce((sum, c) => sum + c, 0),
    [classData]
  );

  // Toggle grade expansion
  const toggleGrade = useCallback((grade: number) => {
    setExpandedGrades((prev) => {
      const next = new Set(prev);
      if (next.has(grade)) {
        next.delete(grade);
      } else {
        next.add(grade);
      }
      return next;
    });
  }, []);

  // Bulk set all classes in a grade to a value
  const handleBulkGradeSet = useCallback(
    (grade: number, value: number) => {
      const newData = { ...classData };
      for (const [classId] of Object.entries(classData)) {
        const g = parseInt(classId.split('-')[0]);
        if (g === grade) {
          newData[classId] = value;
        }
      }
      onBulkUpdate(newData);
    },
    [classData, onBulkUpdate]
  );

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-700">
            총 유권자 수
          </span>
        </div>
        <span className="text-lg font-bold text-blue-700">
          {totalCount.toLocaleString()}명
        </span>
      </div>

      {/* Grade groups */}
      {gradeGroups.map((group) => {
        const isExpanded = expandedGrades.has(group.grade);
        const gradeTotal = group.classes.reduce((sum, c) => sum + c.count, 0);

        return (
          <Card key={group.grade} padding="none" variant="default">
            {/* Grade header */}
            <button
              type="button"
              onClick={() => toggleGrade(group.grade)}
              className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <span className="text-base font-semibold text-gray-900">
                  {GRADE_LABELS[group.grade]}
                </span>
                <Badge variant="default" size="sm">
                  {group.classes.length}개 반
                </Badge>
                <span className="text-sm text-gray-500">
                  ({gradeTotal}명)
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {/* Classes */}
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-t border-gray-200"
              >
                {/* Bulk set */}
                {!disabled && (
                  <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <span className="text-xs text-gray-500">일괄 설정:</span>
                    {[25, 28, 30, 32, 35].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleBulkGradeSet(group.grade, num)}
                        className="rounded-md border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
                      >
                        {num}명
                      </button>
                    ))}
                  </div>
                )}

                <div className="divide-y divide-gray-100">
                  {group.classes.map((cls) => (
                    <div
                      key={cls.classId}
                      className="flex items-center justify-between px-4 py-2.5"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {group.grade}학년 {cls.classNum}반
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={cls.count}
                          onChange={(e) =>
                            onClassCountChange(
                              cls.classId,
                              parseInt(e.target.value) || 0
                            )
                          }
                          disabled={disabled}
                          className={cn(
                            'h-8 w-20 rounded-md border border-gray-300 px-2 text-center text-sm',
                            'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200',
                            'disabled:cursor-not-allowed disabled:bg-gray-50',
                          )}
                        />
                        <span className="text-xs text-gray-400">명</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </Card>
        );
      })}

      {gradeGroups.length === 0 && (
        <Card padding="lg" className="text-center">
          <Users className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            설정된 반이 없습니다. 학교 설정에서 가져오거나 직접 추가해주세요.
          </p>
        </Card>
      )}
    </div>
  );
}
