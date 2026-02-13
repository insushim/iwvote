import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type CardVariant = 'default' | 'elevated' | 'bordered' | 'interactive';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  header?: ReactNode;
  footer?: ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white rounded-xl border border-gray-200',
  elevated: 'bg-white rounded-xl shadow-lg',
  bordered: 'bg-white rounded-xl border-2 border-gray-300',
  interactive:
    'bg-white rounded-xl border border-gray-200 transition-all duration-200 hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5 cursor-pointer',
};

const paddingStyles: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
};

export function Card({
  variant = 'default',
  padding = 'md',
  header,
  footer,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div className={cn(variantStyles[variant], className)} {...props}>
      {header && (
        <div
          className={cn(
            'border-b border-gray-200',
            padding === 'none' ? 'px-0 py-0' : padding === 'sm' ? 'px-3 py-2' : padding === 'lg' ? 'px-7 py-4' : 'px-5 py-3'
          )}
        >
          {header}
        </div>
      )}
      <div className={cn(paddingStyles[padding])}>{children}</div>
      {footer && (
        <div
          className={cn(
            'border-t border-gray-200',
            padding === 'none' ? 'px-0 py-0' : padding === 'sm' ? 'px-3 py-2' : padding === 'lg' ? 'px-7 py-4' : 'px-5 py-3'
          )}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
