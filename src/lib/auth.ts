import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
  type Unsubscribe,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

/**
 * Sign in with email and password.
 * Returns the authenticated User on success.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    const code = firebaseError.code ?? 'unknown';

    const errorMessages: Record<string, string> = {
      'auth/user-not-found': '등록되지 않은 이메일입니다.',
      'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
      'auth/invalid-email': '이메일 형식이 올바르지 않습니다.',
      'auth/user-disabled': '비활성화된 계정입니다. 관리자에게 문의하세요.',
      'auth/too-many-requests': '로그인 시도가 너무 많습니다. 잠시 후 다시 시도하세요.',
      'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
    };

    const message = errorMessages[code] ?? '로그인에 실패했습니다. 다시 시도해주세요.';
    throw new Error(message);
  }
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch {
    throw new Error('로그아웃에 실패했습니다. 다시 시도해주세요.');
  }
}

/**
 * Get the currently authenticated user.
 * Returns null if no user is signed in.
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Subscribe to authentication state changes.
 * Returns an unsubscribe function.
 */
export function onAuthChange(
  callback: (user: User | null) => void
): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}
