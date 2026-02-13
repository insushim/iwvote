'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Users, UserCheck, TrendingUp, Activity } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useRealtimeVotes } from '@/hooks/useRealtimeVotes';
import { CHART_COLORS } from '@/constants';

interface LiveMonitorProps {
  electionId: string;
}

export function LiveMonitor({ electionId }: LiveMonitorProps) {
  const {
    totalVoted,
    totalVoters,
    turnoutRate,
    loading,
    error,
  } = useRealtimeVotes(electionId);

  const donutData = useMemo(() => {
    const voted = totalVoted;
    const remaining = Math.max(0, totalVoters - totalVoted);
    return [
      { name: '투표 완료', value: voted },
      { name: '미투표', value: remaining },
    ];
  }, [totalVoted, totalVoters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" label="실시간 데이터 로딩중..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card padding="lg">
        <div className="text-center text-red-500">
          <p className="font-medium">데이터 로딩 오류</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </Card>
    );
  }

  const roundedTurnout = Math.round(turnoutRate);

  return (
    <div className="space-y-6">
      {/* Donut chart + stats cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Large donut chart */}
        <Card padding="lg" className="lg:col-span-1">
          <div className="relative mx-auto h-64 w-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  stroke="none"
                  animationDuration={800}
                >
                  <Cell fill={CHART_COLORS[0]} />
                  <Cell fill="#E5E7EB" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.span
                  key={roundedTurnout}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className="text-4xl font-bold text-gray-900"
                >
                  {roundedTurnout}%
                </motion.span>
              </AnimatePresence>
              <span className="text-sm text-gray-500">투표 완료</span>
            </div>
          </div>
        </Card>

        {/* Statistics cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-2 lg:grid-cols-3">
          <StatCard
            icon={<UserCheck className="h-6 w-6 text-blue-600" />}
            label="투표 완료"
            value={totalVoted}
            suffix="명"
            color="blue"
          />
          <StatCard
            icon={<Users className="h-6 w-6 text-gray-600" />}
            label="전체 유권자"
            value={totalVoters}
            suffix="명"
            color="gray"
          />
          <StatCard
            icon={<TrendingUp className="h-6 w-6 text-green-600" />}
            label="투표율"
            value={roundedTurnout}
            suffix="%"
            color="green"
          />
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix: string;
  color: 'blue' | 'gray' | 'green';
}

function StatCard({ icon, label, value, suffix, color }: StatCardProps) {
  const bgMap = {
    blue: 'bg-blue-50',
    gray: 'bg-gray-50',
    green: 'bg-green-50',
  };

  return (
    <Card padding="md" className={bgMap[color]}>
      <div className="flex items-start gap-3">
        <div className="shrink-0">{icon}</div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <div className="flex items-baseline gap-1">
            <AnimatePresence mode="wait">
              <motion.span
                key={value}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="text-2xl font-bold text-gray-900"
              >
                {value.toLocaleString()}
              </motion.span>
            </AnimatePresence>
            <span className="text-sm text-gray-500">{suffix}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
