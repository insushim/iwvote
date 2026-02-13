'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { classIdToLabel } from '@/lib/utils';

interface ClassProgressProps {
  classCounts: Record<string, { voted: number; total: number }>;
}

function getBarColor(percentage: number): string {
  if (percentage <= 30) return 'bg-red-500';
  if (percentage <= 60) return 'bg-yellow-500';
  return 'bg-green-500';
}

function getTextColor(percentage: number): string {
  if (percentage <= 30) return 'text-red-600';
  if (percentage <= 60) return 'text-yellow-600';
  return 'text-green-600';
}

export function ClassProgress({ classCounts }: ClassProgressProps) {
  const sortedEntries = useMemo(() => {
    return Object.entries(classCounts).sort(([a], [b]) => {
      const [aGrade, aClass] = a.split('-').map(Number);
      const [bGrade, bClass] = b.split('-').map(Number);
      if (aGrade !== bGrade) return aGrade - bGrade;
      return aClass - bClass;
    });
  }, [classCounts]);

  if (sortedEntries.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        반별 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedEntries.map(([classId, { voted, total }], index) => {
        const percentage = total > 0 ? (voted / total) * 100 : 0;
        const roundedPct = Math.round(percentage);

        return (
          <motion.div
            key={classId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {classIdToLabel(classId)}
              </span>
              <span className={`text-sm font-semibold ${getTextColor(percentage)}`}>
                {voted}/{total}명 ({roundedPct}%)
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
              <motion.div
                className={`h-full rounded-full ${getBarColor(percentage)}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(percentage, 100)}%` }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.05 }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
