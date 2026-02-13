'use client';

import { cn } from '@/lib/utils';

export type ProgressBarSize = 'sm' | 'md' | 'lg';

export interface ProgressBarProps {
  value: number;
  label?: string;
  showPercentage?: boolean;
  size?: ProgressBarSize;
  className?: string;
}

const trackSizeStyles: Record<ProgressBarSize, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

function getColorByValue(value: number): string {
  if (value <= 30) return 'bg-red-500';
  if (value <= 60) return 'bg-yellow-500';
  return 'bg-green-500';
}

function getTextColorByValue(value: number): string {
  if (value <= 30) return 'text-red-600';
  if (value <= 60) return 'text-yellow-600';
  return 'text-green-600';
}

export function ProgressBar({
  value,
  label,
  showPercentage = true,
  size = 'md',
  className,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {showPercentage && (
            <span className={cn('text-sm font-semibold', getTextColorByValue(clampedValue))}>
              {Math.round(clampedValue)}%
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-gray-200',
          trackSizeStyles[size]
        )}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || `${Math.round(clampedValue)}% 진행`}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            getColorByValue(clampedValue)
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
