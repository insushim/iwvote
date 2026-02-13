'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface DashboardStatsData {
  activeElections: number;
  todayVotes: number;
  avgTurnout: number;
  completedElections: number;
}

interface StatCardConfig {
  key: keyof DashboardStatsData;
  label: string;
  icon: string;
  suffix: string;
  bgColor: string;
  iconBg: string;
  textColor: string;
}

const statCards: StatCardConfig[] = [
  {
    key: 'activeElections',
    label: '진행중인 선거',
    icon: '📊',
    suffix: '개',
    bgColor: 'bg-blue-50',
    iconBg: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  {
    key: 'todayVotes',
    label: '오늘 투표 수',
    icon: '🗳️',
    suffix: '표',
    bgColor: 'bg-green-50',
    iconBg: 'bg-green-100',
    textColor: 'text-green-700',
  },
  {
    key: 'avgTurnout',
    label: '평균 투표율',
    icon: '📈',
    suffix: '%',
    bgColor: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    textColor: 'text-amber-700',
  },
  {
    key: 'completedElections',
    label: '완료된 선거',
    icon: '✅',
    suffix: '개',
    bgColor: 'bg-purple-50',
    iconBg: 'bg-purple-100',
    textColor: 'text-purple-700',
  },
];

interface DashboardStatsProps {
  stats: DashboardStatsData;
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {statCards.map((card, index) => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className={cn(
            'rounded-xl border border-gray-200 bg-white p-4 sm:p-5'
          )}
        >
          <div className="flex items-start justify-between">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg text-lg',
                card.iconBg
              )}
              role="img"
              aria-hidden="true"
            >
              {card.icon}
            </div>
          </div>

          <div className="mt-3">
            <p className="text-xs font-medium text-gray-500 sm:text-sm">
              {card.label}
            </p>
            <p
              className={cn(
                'mt-1 text-xl font-bold sm:text-2xl',
                card.textColor
              )}
            >
              {stats[card.key].toLocaleString()}
              <span className="ml-0.5 text-sm font-medium">{card.suffix}</span>
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
