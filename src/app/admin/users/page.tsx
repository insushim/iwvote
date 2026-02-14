'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, UserCheck, UserX, Shield, Clock, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthContext } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { getUsers, approveUser, rejectUser, addAdminToSchool } from '@/lib/firestore';
import type { UserProfile } from '@/types';

export default function AdminUsersPage() {
  const { user, isSuperAdmin, schoolId, isAdmin } = useAuthContext();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Superadmin sees all users; school admin sees only their school's users
      const allUsers = isSuperAdmin
        ? await getUsers()
        : await getUsers(undefined, schoolId ?? undefined);
      setUsers(allUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
      toast.error('사용자 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, schoolId]);

  useEffect(() => {
    if (isSuperAdmin || isAdmin) {
      loadUsers();
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin, isAdmin, loadUsers]);

  const handleApprove = async (uid: string) => {
    if (!user) return;
    setActionLoading(uid);
    try {
      await approveUser(uid, user.uid);
      // Also add the approved user to the school's adminIds
      const approvedUserProfile = users.find((u) => u.id === uid);
      if (approvedUserProfile?.schoolId) {
        await addAdminToSchool(approvedUserProfile.schoolId, uid);
      }
      toast.success('사용자가 승인되었습니다.');
      await loadUsers();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '승인에 실패했습니다.';
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (uid: string) => {
    if (!user) return;
    setActionLoading(uid);
    try {
      await rejectUser(uid);
      toast.success('사용자가 거절되었습니다.');
      await loadUsers();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '거절에 실패했습니다.';
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (date: UserProfile['createdAt']) => {
    if (!date) return '-';
    try {
      return date.toDate().toLocaleDateString('ko-KR');
    } catch {
      return '-';
    }
  };

  const getRoleBadge = (userProfile: UserProfile) => {
    if (userProfile.role === 'superadmin') {
      return (
        <Badge variant="info" size="sm" dot>
          슈퍼관리자
        </Badge>
      );
    }
    if (userProfile.approved) {
      return (
        <Badge variant="success" size="sm" dot>
          승인됨
        </Badge>
      );
    }
    return (
      <Badge variant="warning" size="sm" dot>
        대기중
      </Badge>
    );
  };

  // Access denied for non-admins
  if (!isSuperAdmin && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
          <Shield className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="mb-2 text-lg font-bold text-gray-900">접근 권한 없음</h2>
        <p className="text-sm text-gray-500">
          이 페이지는 관리자만 접근할 수 있습니다.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" label="사용자 목록 로딩중..." />
      </div>
    );
  }

  // Group users: pending first, then approved admins, then superadmins
  const pendingUsers = users.filter(
    (u) => u.role === 'pending' || (!u.approved && u.role !== 'superadmin')
  );
  const approvedAdmins = users.filter(
    (u) => u.role === 'admin' && u.approved
  );
  const superAdmins = users.filter((u) => u.role === 'superadmin');

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-gray-400" />
        <h1 className="text-xl font-bold text-gray-900">사용자 관리</h1>
        <Badge variant="default" size="md">
          {users.length}명
        </Badge>
      </div>

      {/* Pending Users */}
      {pendingUsers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            <h2 className="font-semibold text-gray-900">
              승인 대기중
            </h2>
            <Badge variant="warning" size="sm">
              {pendingUsers.length}
            </Badge>
          </div>

          <div className="space-y-3">
            {pendingUsers.map((pendingUser, index) => (
              <motion.div
                key={pendingUser.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card padding="md">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {pendingUser.displayName}
                        </span>
                        {getRoleBadge(pendingUser)}
                      </div>
                      <p className="text-sm text-gray-500">
                        {pendingUser.email}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                        <span>학교: {pendingUser.schoolName}</span>
                        <span>가입일: {formatDate(pendingUser.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        iconLeft={<UserCheck className="h-4 w-4" />}
                        onClick={() => handleApprove(pendingUser.id)}
                        loading={actionLoading === pendingUser.id}
                        disabled={actionLoading !== null}
                      >
                        승인
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        iconLeft={<UserX className="h-4 w-4" />}
                        onClick={() => handleReject(pendingUser.id)}
                        loading={actionLoading === pendingUser.id}
                        disabled={actionLoading !== null}
                      >
                        거절
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Approved Admins */}
      {approvedAdmins.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <h2 className="font-semibold text-gray-900">
              승인된 관리자
            </h2>
            <Badge variant="success" size="sm">
              {approvedAdmins.length}
            </Badge>
          </div>

          <div className="space-y-3">
            {approvedAdmins.map((admin, index) => (
              <motion.div
                key={admin.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card padding="sm">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {admin.displayName}
                        </span>
                        {getRoleBadge(admin)}
                      </div>
                      <p className="text-sm text-gray-500">{admin.email}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                        <span>학교: {admin.schoolName}</span>
                        <span>가입일: {formatDate(admin.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Superadmins */}
      {superAdmins.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-sky-500" />
            <h2 className="font-semibold text-gray-900">
              슈퍼 관리자
            </h2>
            <Badge variant="info" size="sm">
              {superAdmins.length}
            </Badge>
          </div>

          <div className="space-y-3">
            {superAdmins.map((superAdmin, index) => (
              <motion.div
                key={superAdmin.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card padding="sm">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {superAdmin.displayName}
                        </span>
                        {getRoleBadge(superAdmin)}
                      </div>
                      <p className="text-sm text-gray-500">
                        {superAdmin.email}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                        <span>학교: {superAdmin.schoolName}</span>
                        <span>가입일: {formatDate(superAdmin.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {users.length === 0 && (
        <Card padding="lg">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="mb-3 h-12 w-12 text-gray-300" />
            <p className="text-sm text-gray-500">등록된 사용자가 없습니다.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
