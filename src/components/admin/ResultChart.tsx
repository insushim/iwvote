'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Crown } from 'lucide-react';
import { CHART_COLORS } from '@/constants';
import type { CandidateResult } from '@/types';

interface ResultChartProps {
  results: CandidateResult[];
}

export function ResultChart({ results }: ResultChartProps) {
  const sortedResults = useMemo(
    () => [...results].sort((a, b) => b.totalVotes - a.totalVotes),
    [results]
  );

  const winnerIndex = sortedResults.length > 0 ? 0 : -1;
  const maxVotes = sortedResults.length > 0 ? sortedResults[0].totalVotes : 0;

  const chartData = useMemo(
    () =>
      sortedResults.map((r) => ({
        name: `${r.candidateNumber}번 ${r.candidateName}`,
        value: r.totalVotes,
        percentage: r.percentage,
      })),
    [sortedResults]
  );

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const percentage = (percent ?? 0) * 100;
    if (percentage < 5) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-bold"
      >
        {`${percentage.toFixed(1)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (!active || !payload || payload.length === 0) return null;
    const data = payload[0];
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
        <p className="text-sm font-medium text-gray-900">{data.name}</p>
        <p className="text-sm text-gray-600">
          {data.value}표 ({data.payload.percentage.toFixed(1)}%)
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={110}
              dataKey="value"
              label={renderCustomLabel}
              labelLine={false}
              animationDuration={800}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  stroke={index === winnerIndex ? '#F59E0B' : 'none'}
                  strokeWidth={index === winnerIndex ? 3 : 0}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend with winner indicator */}
      <div className="space-y-2">
        {sortedResults.map((result, index) => {
          const isWinner = index === 0 && result.totalVotes > 0 &&
            (sortedResults.length === 1 || result.totalVotes > sortedResults[1].totalVotes);

          return (
            <div
              key={result.candidateId}
              className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                isWinner ? 'bg-yellow-50 ring-1 ring-yellow-200' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                />
                <span className="text-sm font-medium text-gray-900">
                  {result.candidateNumber}번 {result.candidateName}
                </span>
                {isWinner && (
                  <Crown className="h-4 w-4 text-yellow-500" />
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700">
                  {result.totalVotes}표
                </span>
                <span className="text-sm text-gray-500">
                  ({result.percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
