import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { APP_NAME } from '@/constants';

export function Footer() {
  const currentYear = 2026;

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          {/* Copyright */}
          <p className="text-sm text-gray-500">
            &copy; {currentYear} {APP_NAME}. All rights reserved.
          </p>

          {/* Security badge */}
          <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>SHA-256 해시 체인 보안</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/help"
              className="text-gray-500 transition-colors hover:text-gray-700"
            >
              도움말
            </Link>
            <span className="text-gray-300" aria-hidden="true">|</span>
            <Link
              href="/terms"
              className="text-gray-500 transition-colors hover:text-gray-700"
            >
              이용약관
            </Link>
            <span className="text-gray-300" aria-hidden="true">|</span>
            <Link
              href="/privacy"
              className="text-gray-500 transition-colors hover:text-gray-700"
            >
              개인정보처리방침
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
