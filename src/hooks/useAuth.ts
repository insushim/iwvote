'use client';

import { useAuthContext } from '@/context/AuthContext';

/**
 * Custom hook for accessing authentication state and actions.
 * Simple re-export wrapper around useAuthContext for convenience.
 *
 * @returns { user, loading, isAdmin, signIn, signOut }
 */
export function useAuth() {
  const { user, loading, isAdmin, signIn, signOut } = useAuthContext();

  return {
    user,
    loading,
    isAdmin,
    signIn,
    signOut,
  };
}
