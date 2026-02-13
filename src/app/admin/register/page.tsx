'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Lock, Eye, EyeOff, User, School, Clock } from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { APP_NAME } from '@/constants';

export default function AdminRegisterPage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signUpComplete, setSignUpComplete] = useState(false);

  const { signUp, isPending, isSuperAdmin } = useAuthContext();
  const router = useRouter();

  // After successful signup, redirect superadmins to dashboard
  useEffect(() => {
    if (signUpComplete && isSuperAdmin) {
      router.replace('/admin');
    }
  }, [signUpComplete, isSuperAdmin, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!displayName.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }

    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }

    if (!password.trim()) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!schoolName.trim()) {
      setError('학교명을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, displayName, schoolName);
      setSignUpComplete(true);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : '회원가입에 실패했습니다. 다시 시도해주세요.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // After successful signup, if user is pending, show approval waiting screen
  if (signUpComplete && isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <div className="rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-50">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">승인 대기중</h1>
            </div>

            <div className="rounded-lg bg-yellow-50 px-4 py-4 text-center text-sm text-yellow-800">
              회원가입이 완료되었습니다. 슈퍼 관리자의 승인 후 이용 가능합니다.
            </div>

            <p className="mt-6 text-center text-sm text-gray-500">
              <a
                href="/admin/login/"
                className="font-medium text-blue-600 transition-colors hover:text-blue-700"
              >
                로그인 페이지로 돌아가기
              </a>
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-white/40">
            {APP_NAME} &mdash; 소중한 한 표, 투명한 결과
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          {/* Logo & title */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
              <UserPlus className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              <span className="mr-1.5" role="img" aria-label="투표함">
                🗳️
              </span>
              {APP_NAME}
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">관리자 회원가입</p>
          </div>

          {/* Register form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="이름"
              type="text"
              placeholder="홍길동"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              iconPrefix={<User className="h-5 w-5" />}
              inputSize="lg"
              autoComplete="name"
              disabled={loading}
            />

            <Input
              label="이메일"
              type="email"
              placeholder="admin@school.ac.kr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              iconPrefix={<Mail className="h-5 w-5" />}
              inputSize="lg"
              autoComplete="email"
              disabled={loading}
            />

            <Input
              label="학교명"
              type="text"
              placeholder="우리초등학교"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              iconPrefix={<School className="h-5 w-5" />}
              inputSize="lg"
              autoComplete="organization"
              disabled={loading}
            />

            <div className="relative">
              <Input
                label="비밀번호"
                type={showPassword ? 'text' : 'password'}
                placeholder="비밀번호를 입력하세요 (6자 이상)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                iconPrefix={<Lock className="h-5 w-5" />}
                inputSize="lg"
                autoComplete="new-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] rounded-md p-1 text-gray-400 transition-colors hover:text-gray-600"
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            <div className="relative">
              <Input
                label="비밀번호 확인"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="비밀번호를 다시 입력하세요"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                iconPrefix={<Lock className="h-5 w-5" />}
                inputSize="lg"
                autoComplete="new-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-[38px] rounded-md p-1 text-gray-400 transition-colors hover:text-gray-600"
                aria-label={
                  showConfirmPassword ? '비밀번호 숨기기' : '비밀번호 보기'
                }
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </motion.div>
            )}

            {/* Submit button */}
            <Button type="submit" size="xl" fullWidth loading={loading}>
              회원가입
            </Button>
          </form>

          {/* Footer text */}
          <p className="mt-6 text-center text-sm text-gray-500">
            이미 계정이 있으신가요?{' '}
            <a
              href="/admin/login/"
              className="font-medium text-blue-600 transition-colors hover:text-blue-700"
            >
              로그인
            </a>
          </p>
        </div>

        {/* Branding below card */}
        <p className="mt-6 text-center text-xs text-white/40">
          {APP_NAME} &mdash; 소중한 한 표, 투명한 결과
        </p>
      </motion.div>
    </div>
  );
}
