'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { type User } from 'firebase/auth';
import {
  signInWithEmail,
  signUpWithEmail,
  signOut as authSignOut,
  onAuthChange,
} from '@/lib/auth';
import {
  getUserProfile,
  createUserProfile,
  hasSuperAdmin,
  createSchoolWithId,
} from '@/lib/firestore';
import type { UserProfile, UserRole } from '@/types';

interface AuthContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isPending: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, schoolName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      setUserProfile(null);
      return;
    }

    try {
      const profile = await getUserProfile(firebaseUser.uid);
      setUserProfile(profile);
    } catch {
      console.error('사용자 프로필 로드 실패');
      setUserProfile(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      await loadProfile(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const loggedInUser = await signInWithEmail(email, password);
    setUser(loggedInUser);
    await loadProfile(loggedInUser);
  }, [loadProfile]);

  const signUp = useCallback(async (
    email: string,
    password: string,
    displayName: string,
    schoolName: string
  ) => {
    const newUser = await signUpWithEmail(email, password, displayName);

    // First user becomes superadmin; subsequent users are pending
    const superAdminExists = await hasSuperAdmin();
    const role: UserRole = superAdminExists ? 'pending' : 'superadmin';
    const approved = !superAdminExists;

    await createUserProfile(newUser.uid, {
      email: newUser.email ?? email,
      displayName,
      schoolName,
      role,
      approved,
    });

    // Auto-create school document with user UID as school ID
    await createSchoolWithId(newUser.uid, {
      name: schoolName,
      grades: [4, 5, 6],
      classesPerGrade: { 4: 3, 5: 3, 6: 3 },
      studentsPerClass: {},
      adminIds: [newUser.uid],
    });

    setUser(newUser);
    await loadProfile(newUser);
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await authSignOut();
    setUser(null);
    setUserProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadProfile(user);
    }
  }, [user, loadProfile]);

  const isAdmin = userProfile?.approved === true && (userProfile.role === 'admin' || userProfile.role === 'superadmin');
  const isSuperAdmin = userProfile?.role === 'superadmin';
  const isPending = userProfile?.role === 'pending' || (userProfile !== null && !userProfile.approved);

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      isAdmin,
      isSuperAdmin,
      isPending,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error(
      'useAuthContext는 AuthProvider 내부에서만 사용할 수 있습니다.'
    );
  }
  return context;
}
