import React from 'react';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:4000',
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'user',
      },
      agency: {
        type: 'string',
      },
      majorAgency: {
        type: 'string',
      },
    },
  },
});

export const {
  signIn,
  signUp,
  getSession,
  changePassword,
  updateUser,
} = authClient;

/**
 * Custom signOut wrapper that clears session cache from localStorage and cookies before calling authClient.signOut().
 */
export async function signOut(options?: Parameters<typeof authClient.signOut>[0]) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('coolstaff_session_cache');
    document.cookie = 'better-auth.session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = '__Secure-better-auth.session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
  try {
    await authClient.signOut(options);
  } catch (err) {
    console.warn('[AUTH] signOut call warning:', err);
  }
}

// Custom wrapper for useSession that uses localStorage caching ONLY for temporary network drops.
// If the server explicitly confirms no session (data === null and !isPending), cache is cleared.
export function useSession() {
  const result = authClient.useSession();
  const [cachedData, setCachedData] = React.useState<any>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('coolstaff_session_cache');
      if (stored) {
        try {
          setCachedData(JSON.parse(stored));
        } catch (_) {}
      }
    }
  }, []);

  React.useEffect(() => {
    if (result.data) {
      localStorage.setItem('coolstaff_session_cache', JSON.stringify(result.data));
      setCachedData(result.data);
    } else if (!result.isPending && result.data === null && !result.error) {
      // Server explicitly returned null session (logged out or session expired)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('coolstaff_session_cache');
      }
      setCachedData(null);
    }
  }, [result.data, result.isPending, result.error]);

  // Only fallback to cache during network errors when offline
  if (!result.data && result.error && cachedData) {
    return {
      ...result,
      data: cachedData,
    };
  }

  return result;
}
