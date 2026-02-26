"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Clock } from "lucide-react";
import { AuthProvider, useAuthContext } from "@/context/AuthContext";
import { Sidebar } from "@/components/admin/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Spinner } from "@/components/ui/Spinner";

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, isPending, isSuperAdmin, signOut } =
    useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isAuthPage =
    pathname === "/admin/login" ||
    pathname === "/admin/login/" ||
    pathname === "/admin/register" ||
    pathname === "/admin/register/";

  useEffect(() => {
    if (!loading && !user && !isAuthPage) {
      router.replace("/admin/login");
    }
  }, [user, loading, isAuthPage, router]);

  // Auth pages (login/register): render without sidebar/auth guard
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" color="blue" />
          <p className="text-sm text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  // Authenticated but pending approval
  if (user && isPending) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">승인 대기중</h2>
          <p className="mt-2 text-sm text-gray-500">
            슈퍼 관리자의 승인을 기다리고 있습니다.
            <br />
            승인이 완료되면 서비스를 이용하실 수 있습니다.
          </p>
          <button
            onClick={() => signOut()}
            className="mt-6 rounded-lg bg-gray-100 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
          >
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  // Not authenticated or not admin: show nothing while redirecting
  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 print:h-auto print:overflow-visible print:bg-white">
      {/* Desktop sidebar */}
      <div className="hidden md:flex print:!hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible">
        {/* Mobile header */}
        <div className="flex h-14 items-center border-b border-gray-200 bg-white px-4 md:hidden print:hidden">
          <span className="text-lg font-bold text-gray-900">🗳️ 우리한표</span>
        </div>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6 lg:p-8 print:overflow-visible print:p-0">
          {children}
        </main>

        {/* Mobile bottom navigation */}
        <MobileNav />
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AuthProvider>
  );
}
