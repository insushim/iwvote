'use client';

import { usePathname } from 'next/navigation';
import { LayoutDashboard, Vote, Settings, Users } from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const pathname = usePathname();
  const { isSuperAdmin } = useAuthContext();

  const navItems = [
    { label: '대시보드', href: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: '선거', href: '/admin/elections', icon: <Vote className="h-5 w-5" /> },
    ...(isSuperAdmin ? [{ label: '사용자', href: '/admin/users', icon: <Users className="h-5 w-5" /> }] : []),
    { label: '설정', href: '/admin/settings', icon: <Settings className="h-5 w-5" /> },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex items-center justify-around">
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
                'relative flex flex-1 flex-col items-center gap-0.5 px-2 py-2.5 text-xs font-medium transition-colors',
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-400 hover:text-gray-600'
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-blue-600" />
              )}
              {item.icon}
              <span>{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
