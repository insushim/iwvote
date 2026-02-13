'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Vote,
  Settings,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';
import { APP_NAME } from '@/constants';
import { cn } from '@/lib/utils';

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user, signOut, isSuperAdmin } = useAuthContext();

  const navItems: SidebarItem[] = [
    { label: '대시보드', href: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: '선거 관리', href: '/admin/elections', icon: <Vote className="h-5 w-5" /> },
    ...(isSuperAdmin ? [{ label: '사용자 관리', href: '/admin/users', icon: <Users className="h-5 w-5" /> }] : []),
    { label: '설정', href: '/admin/settings', icon: <Settings className="h-5 w-5" /> },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-slate-900 text-white transition-all duration-300',
        collapsed ? 'w-[68px]' : 'w-64'
      )}
    >
      {/* Logo area */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-slate-700/50 px-4',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {!collapsed && (
          <a
            href="/admin/"
            className="flex items-center gap-2 text-lg font-bold text-white"
          >
            <span className="text-xl" role="img" aria-label="투표함">
              🗳️
            </span>
            <span>{APP_NAME}</span>
          </a>
        )}
        {collapsed && (
          <a href="/admin/" className="text-xl" aria-label={APP_NAME}>
            🗳️
          </a>
        )}
        {onToggle && !collapsed && (
          <button
            onClick={onToggle}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="사이드바 접기"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Collapse expand button when collapsed */}
      {onToggle && collapsed && (
        <div className="flex justify-center py-2">
          <button
            onClick={onToggle}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="사이드바 펼치기"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation items */}
      <nav className="mt-4 flex-1 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin' || pathname === '/admin/'
              : pathname.startsWith(item.href);

          return (
            <a
              key={item.href}
              href={`${item.href}/`}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </a>
          );
        })}
      </nav>

      {/* User info at bottom */}
      <div className="border-t border-slate-700/50 p-3">
        {user && (
          <div
            className={cn(
              'flex items-center gap-3',
              collapsed && 'justify-center'
            )}
          >
            {/* User avatar */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-300">
              {user.email?.charAt(0).toUpperCase() ?? 'A'}
            </div>

            {!collapsed && (
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-white">
                  {user.displayName ?? '관리자'}
                </span>
                <span className="truncate text-xs text-slate-400">
                  {user.email}
                </span>
              </div>
            )}

            {!collapsed && (
              <button
                onClick={handleSignOut}
                className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-red-400"
                aria-label="로그아웃"
                title="로그아웃"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {user && collapsed && (
          <button
            onClick={handleSignOut}
            className="mt-2 flex w-full items-center justify-center rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-red-400"
            aria-label="로그아웃"
            title="로그아웃"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
