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
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  signInWithEmail,
  signOut as authSignOut,
  onAuthChange,
} from '@/lib/auth';
import { COLLECTIONS } from '@/constants';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Check if the user is an admin by looking up their UID in the schools collection.
 * A user is considered an admin if they appear in any school's adminIds array,
 * or if they own a school document (document ID matches their UID).
 */
async function checkAdminStatus(user: User): Promise<boolean> {
  try {
    // Check if user owns a school document (school ID = user UID)
    const schoolDoc = await getDoc(doc(db, COLLECTIONS.SCHOOLS, user.uid));
    if (schoolDoc.exists()) {
      const data = schoolDoc.data();
      // User is an admin if they are in the adminIds array or if the doc exists with their ID
      if (
        data.adminIds &&
        Array.isArray(data.adminIds) &&
        data.adminIds.includes(user.uid)
      ) {
        return true;
      }
      // If the document exists with the user's UID as the ID, they are an admin
      return true;
    }

    return false;
  } catch {
    console.error('관리자 권한 확인 실패');
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const adminStatus = await checkAdminStatus(firebaseUser);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const loggedInUser = await signInWithEmail(email, password);
    setUser(loggedInUser);

    const adminStatus = await checkAdminStatus(loggedInUser);
    setIsAdmin(adminStatus);
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    setUser(null);
    setIsAdmin(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signIn, signOut }}>
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
