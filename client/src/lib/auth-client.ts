import React from 'react';
import { createAuthClient } from 'better-auth/react';
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

export const {
  signIn,
  signUp,
  getSession,
  changePassword,
  updateUser,
} = authClient;

const SESSION_DURATION_MS = 60 * 60 * 1000; // 1 Hour (3,600,000 ms)

/**
 * Retrieves valid session data from localStorage if it is under 1 hour old.
 * Automatically clears cache if 1 hour has elapsed.
 */
export function getCachedSession(): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('coolstaff_session_cache');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    const savedAt = parsed._savedAt || (parsed.session?.createdAt ? new Date(parsed.session.createdAt).getTime() : null);

    if (savedAt) {
      const elapsed = Date.now() - savedAt;
      if (elapsed < SESSION_DURATION_MS) {
        return parsed;
      }
      // Over 1 hour old — session expired!
      console.warn('[AUTH] Session cache expired after 1 hour.');
      localStorage.removeItem('coolstaff_session_cache');
      return null;
    }

    // Fallback: if user data exists but no _savedAt timestamp, attach it now
    if (parsed?.user) {
      parsed._savedAt = Date.now();
      localStorage.setItem('coolstaff_session_cache', JSON.stringify(parsed));
      return parsed;
    }

    return null;
  } catch (_) {
    return null;
  }
}

/**
 * Saves session data to localStorage with a timestamp for 1-hour session tracking.
 */
export function saveSessionToCache(sessionData: any) {
  if (typeof window === 'undefined' || !sessionData) return;
  const payload = {
    ...sessionData,
    _savedAt: Date.now(),
  };
  localStorage.setItem('coolstaff_session_cache', JSON.stringify(payload));
}

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

/**
 * Custom useSession hook that maintains session state for up to 1 hour across page navigations.
 */
export function useSession() {
  const result = authClient.useSession();
  const [cachedData, setCachedData] = React.useState<any>(() => getCachedSession());

  React.useEffect(() => {
    const valid = getCachedSession();
    if (valid) {
      setCachedData(valid);
    }
  }, []);

  React.useEffect(() => {
    if (result.data) {
      saveSessionToCache(result.data);
      setCachedData({ ...result.data, _savedAt: Date.now() });
    }
  }, [result.data]);

  const validCache = getCachedSession();
  const effectiveData = result.data || validCache;

  return {
    ...result,
    data: effectiveData,
    isPending: result.isPending && !effectiveData,
  };
}
