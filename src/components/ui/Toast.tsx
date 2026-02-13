'use client';

import { Toaster as HotToaster } from 'react-hot-toast';
import { cn } from '@/lib/utils';

export interface ToasterProps {
  className?: string;
}

export function Toaster({ className }: ToasterProps) {
  return (
    <HotToaster
      position="top-center"
      gutter={8}
      containerClassName={cn(className)}
      toastOptions={{
        duration: 3500,
        style: {
          maxWidth: '420px',
          padding: '12px 16px',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: '500',
          color: '#1f2937',
          background: '#ffffff',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
        },
        success: {
          iconTheme: {
            primary: '#22c55e',
            secondary: '#ffffff',
          },
          style: {
            border: '1px solid #bbf7d0',
            background: '#f0fdf4',
          },
        },
        error: {
          duration: 4500,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#ffffff',
          },
          style: {
            border: '1px solid #fecaca',
            background: '#fef2f2',
          },
        },
      }}
    />
  );
}
