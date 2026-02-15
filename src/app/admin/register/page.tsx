'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Lock, Eye, EyeOff, User, School, Clock, KeyRound, Plus, Users } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { useAuthContext } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { APP_NAME } from '@/constants';
import { functions } from '@/lib/firebase';
import {
  createUserProfile,
  createSchool,
  addAdminToSchool,
} from '@/lib/firestore';
import { signUpWithEmail } from '@/lib/auth';

type RegistrationMode = null | 'new' | 'join';

export default function AdminRegisterPage() {
  const [mode, setMode] = useState<RegistrationMode>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinedSchoolName, setJoinedSchoolName] = useState('');
  const [joinedSchoolId, setJoinedSchoolId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [signUpComplete, setSignUpComplete] = useState(false);

  const { isPending, isSuperAdmin, refreshProfile } = useAuthContext();
  const router = useRouter();

  // After successful signup, redirect superadmins to dashboard
  useEffect(() => {
    if (signUpComplete && isSuperAdmin) {
      router.replace('/admin');
    }
  }, [signUpComplete, isSuperAdmin, router]);

  // Look up school by join code
  const handleLookupJoinCode = async () => {
    if (!joinCode.trim() || joinCode.trim().length < 8) {
      setError('8자리 가입 코드를 입력해주세요.');
      return;
    }

    setLookingUp(true);
    setError('');
    try {
      const lookupFn = httpsCallable<{ joinCode: string }, { schoolId: string; schoolName: string }>(
        functions,
        'lookupSchoolByJoinCode'
      );
      const result = await lookupFn({ joinCode: joinCode.trim().toUpperCase() });
      setJoinedSchoolId(result.data.schoolId);
      setJoinedSchoolName(result.data.schoolName);
    } catch (err) {
      const message = err instanceof Error ? err.message : '가입 코드를 찾을 수 없습니다.';
      setError(message);
      setJoinedSchoolId('');
      setJoinedSchoolName('');
    } finally {
      setLookingUp(false);
    }
  };

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

    if (mode === 'new' && !schoolName.trim()) {
      setError('학교명을 입력해주세요.');
      return;
    }

    if (mode === 'join' && !joinedSchoolId) {
      setError('먼저 가입 코드를 확인해주세요.');
      return;
    }

    setLoading(true);
    try {
      const newUser = await signUpWithEmail(email, password, displayName);

      if (mode === 'new') {
        // New school: user becomes admin (auto-approved)
        const newSchoolId = await createSchool({
          name: schoolName,
          grades: [4, 5, 6],
          classesPerGrade: { 4: 3, 5: 3, 6: 3 },
          studentsPerClass: {},
          adminIds: [newUser.uid],
        });

        await createUserProfile(newUser.uid, {
          email: newUser.email ?? email,
          displayName,
          schoolName,
          schoolId: newSchoolId,
          role: 'admin',
          approved: true,
        });
      } else {
        // Join existing school: user is pending approval
        await createUserProfile(newUser.uid, {
          email: newUser.email ?? email,
          displayName,
          schoolName: joinedSchoolName,
          schoolId: joinedSchoolId,
          role: 'pending',
          approved: false,
        });
      }

      await refreshProfile();
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
              회원가입이 완료되었습니다. 학교 관리자의 승인 후 이용 가능합니다.
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
            <h1 className="text-2xl font-bold text-gray-900">{APP_NAME}</h1>
            <p className="mt-1.5 text-sm text-gray-500">관리자 회원가입</p>
          </div>

          {/* Mode Selection */}
          {mode === null && (
            <div className="space-y-3">
              <p className="text-center text-sm text-gray-600 mb-4">
                등록 방법을 선택해주세요.
              </p>
              <button
                type="button"
                onClick={() => setMode('new')}
                className="flex w-full items-center gap-4 rounded-xl border-2 border-gray-200 p-4 text-left transition-all hover:border-blue-400 hover:bg-blue-50"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                  <Plus className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">학교 새로 등록</p>
                  <p className="text-xs text-gray-500">우리 학교를 처음 등록합니다.</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode('join')}
                className="flex w-full items-center gap-4 rounded-xl border-2 border-gray-200 p-4 text-left transition-all hover:border-green-400 hover:bg-green-50"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-100">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">기존 학교 합류</p>
                  <p className="text-xs text-gray-500">가입 코드로 기존 학교에 참가합니다.</p>
                </div>
              </button>
            </div>
          )}

          {/* Registration Form */}
          {mode !== null && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Back to mode selection */}
              <button
                type="button"
                onClick={() => { setMode(null); setError(''); setJoinedSchoolId(''); setJoinedSchoolName(''); }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                &larr; 등록 방법 다시 선택
              </button>

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

              {mode === 'new' && (
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
              )}

              {mode === 'join' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        label="가입 코드"
                        type="text"
                        placeholder="8자리 코드 입력"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        iconPrefix={<KeyRound className="h-5 w-5" />}
                        inputSize="lg"
                        disabled={loading}
                        maxLength={8}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={handleLookupJoinCode}
                        loading={lookingUp}
                        disabled={loading}
                      >
                        확인
                      </Button>
                    </div>
                  </div>
                  {joinedSchoolName && (
                    <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
                      <School className="mr-2 inline h-4 w-4" />
                      <strong>{joinedSchoolName}</strong>에 합류합니다.
                    </div>
                  )}
                </div>
              )}

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
                {mode === 'new' ? '학교 등록 및 회원가입' : '회원가입'}
              </Button>
            </form>
          )}

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
