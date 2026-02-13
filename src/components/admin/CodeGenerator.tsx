'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { classIdToLabel } from '@/lib/utils';

interface ClassConfig {
  classId: string;
  count: number;
}

interface GenerationStatus {
  classId: string;
  status: 'idle' | 'generating' | 'done' | 'error';
  generated: number;
  error?: string;
}

interface CodeGeneratorProps {
  electionId: string;
  classes: ClassConfig[];
  onCodesGenerated?: () => void;
}

export function CodeGenerator({ electionId, classes, onCodesGenerated }: CodeGeneratorProps) {
  const [statuses, setStatuses] = useState<Record<string, GenerationStatus>>(() => {
    const initial: Record<string, GenerationStatus> = {};
    classes.forEach((cls) => {
      initial[cls.classId] = {
        classId: cls.classId,
        status: 'idle',
        generated: 0,
      };
    });
    return initial;
  });
  const [generatingAll, setGeneratingAll] = useState(false);

  const generateForClass = async (classId: string, count: number) => {
    setStatuses((prev) => ({
      ...prev,
      [classId]: { ...prev[classId], status: 'generating', error: undefined },
    }));

    try {
      const response = await fetch('/api/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ electionId, classId, count }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '코드 생성에 실패했습니다.');
      }

      const data = await response.json();
      const generatedCount = data.codes?.length ?? count;

      setStatuses((prev) => ({
        ...prev,
        [classId]: { ...prev[classId], status: 'done', generated: generatedCount },
      }));

      toast.success(`${classIdToLabel(classId)} 코드 ${generatedCount}개 생성 완료`);
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      setStatuses((prev) => ({
        ...prev,
        [classId]: { ...prev[classId], status: 'error', error: message },
      }));
      toast.error(`${classIdToLabel(classId)} 코드 생성 실패: ${message}`);
    }
  };

  const generateAll = async () => {
    setGeneratingAll(true);

    for (const cls of classes) {
      if (statuses[cls.classId]?.status === 'done') continue;
      await generateForClass(cls.classId, cls.count);
    }

    setGeneratingAll(false);
    onCodesGenerated?.();
    toast.success('전체 코드 생성이 완료되었습니다.');
  };

  const totalClasses = classes.length;
  const doneClasses = Object.values(statuses).filter((s) => s.status === 'done').length;
  const progressPercent = totalClasses > 0 ? (doneClasses / totalClasses) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Overall progress */}
      {generatingAll && (
        <Card padding="sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">전체 진행률</span>
              <span className="font-semibold text-blue-600">
                {doneClasses}/{totalClasses} 반
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
              <motion.div
                className="h-full rounded-full bg-blue-600"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Per-class generation list */}
      <div className="space-y-2">
        {classes.map((cls) => {
          const status = statuses[cls.classId];

          return (
            <div
              key={cls.classId}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900">
                  {classIdToLabel(cls.classId)}
                </span>
                <span className="text-xs text-gray-500">{cls.count}명</span>

                {status?.status === 'done' && (
                  <Badge variant="success" size="sm">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    생성완료 ({status.generated}개)
                  </Badge>
                )}
                {status?.status === 'generating' && (
                  <Badge variant="info" size="sm">
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    생성중...
                  </Badge>
                )}
                {status?.status === 'error' && (
                  <Badge variant="error" size="sm">
                    <XCircle className="mr-1 h-3 w-3" />
                    오류
                  </Badge>
                )}
              </div>

              <Button
                size="sm"
                variant={status?.status === 'done' ? 'secondary' : 'outline'}
                onClick={() => generateForClass(cls.classId, cls.count)}
                loading={status?.status === 'generating'}
                disabled={generatingAll || status?.status === 'generating'}
              >
                {status?.status === 'done' ? '재생성' : '코드 생성'}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Generate all button */}
      <Button
        fullWidth
        size="lg"
        onClick={generateAll}
        loading={generatingAll}
        disabled={generatingAll}
        iconLeft={<Zap className="h-5 w-5" />}
      >
        전체 코드 생성
      </Button>
    </div>
  );
}
