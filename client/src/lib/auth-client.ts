import { createAuthClient } from 'better-auth/react';
import { useState, useEffect } from 'react';
import { getApiBaseUrl } from './utils';

export const authClient = createAuthClient({
  baseURL: getApiBaseUrl(),
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

export const SESSION_CACHE_KEY = 'coolstaff_user_session';
export const SESSION_CACHE_TTL = 3600 * 1000; // 1 hour in milliseconds

export function saveSessionToCache(sessionData: any) {
  if (typeof window === 'undefined' || !sessionData) return;
  try {
    const payload = {
      data: sessionData,
      _savedAt: Date.now(),
    };
    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('Failed to save session to cache', e);
  }
}

export function getCachedSession(): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.data || !parsed._savedAt) return null;

    // Check if 1 hour has elapsed
    if (Date.now() - parsed._savedAt > SESSION_CACHE_TTL) {
      localStorage.removeItem(SESSION_CACHE_KEY);
      return null;
    }
    return parsed.data;
  } catch (e) {
    return null;
  }
}

export function clearCachedSession() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_CACHE_KEY);
  } catch (e) {}
}

const nativeUseSession = authClient.useSession;

/**
 * Enhanced useSession hook:
 * - Persists session in localStorage for up to 1 hour.
 * - Prevents users from being kicked back to login when navigating between homepage and dashboard.
 * - Automatically logs out after 1 hour of expiration.
 */
export function useSession() {
  const nativeSession = nativeUseSession();
  const [cachedSession, setCachedSession] = useState<any>(() => getCachedSession());

  useEffect(() => {
    if (nativeSession.data?.user) {
      saveSessionToCache(nativeSession.data);
      setCachedSession(nativeSession.data);
    } else if (!nativeSession.isPending && !nativeSession.data?.user) {
      const valid = getCachedSession();
      if (!valid) {
        setCachedSession(null);
      }
    }
  }, [nativeSession.data, nativeSession.isPending]);

  if (nativeSession.data?.user) {
    return nativeSession;
  }

  if (cachedSession?.user) {
    return {
      data: cachedSession,
      isPending: false,
      error: null,
      refetch: nativeSession.refetch,
    };
  }

  return nativeSession;
}

// Override authClient.useSession so components accessing authClient directly also benefit
(authClient as any).useSession = useSession;

export const {
  signIn,
  signUp,
  getSession,
  changePassword,
  updateUser,
} = authClient;

export const signOut = async (options?: any) => {
  clearCachedSession();
  return authClient.signOut(options);
};

