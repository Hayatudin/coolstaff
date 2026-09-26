import { createAuthClient } from 'better-auth/react';
import { useState, useEffect } from 'react';
import { getApiBaseUrl } from './utils';

/**
 * Resilient fetch implementation with auto-retry and timeout protection
 * to handle slow networks, tethered cellular hotspots, and stale Keep-Alive sockets.
 */
const resilientFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const maxRetries = 3;
  let lastError: any = null;
  let currentTarget: string =
    typeof input === 'string'
      ? input
      : input instanceof URL
      ? input.toString()
      : (input as Request).url;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let timeoutId: any = null;
    try {
      let signal = init?.signal;
      if (!signal && typeof AbortController !== 'undefined') {
        const controller = new AbortController();
        timeoutId = setTimeout(() => {
          controller.abort(new Error('Connection timed out on slow network'));
        }, 25000);
        signal = controller.signal;
      }

      const res = await fetch(currentTarget, {
        ...init,
        signal,
      });

      if (timeoutId) clearTimeout(timeoutId);
      return res;
    } catch (err: any) {
      if (timeoutId) clearTimeout(timeoutId);
      lastError = err;
      const isNetworkError =
        err?.name === 'TypeError' ||
        err?.name === 'AbortError' ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError') ||
        err?.message?.includes('network') ||
        err?.message?.includes('timed out');

      // If local server is down or unreachable on desktop, seamlessly fallback to live API
      if (isNetworkError && (currentTarget.includes('localhost:4000') || currentTarget.includes('127.0.0.1:4000'))) {
        console.warn(`[Auth Fetch] Local backend on port 4000 unreachable. Switching to https://api.coolstaffagency.com...`);
        currentTarget = currentTarget.replace(/http:\/\/(localhost|127\.0\.0\.1):4000/, 'https://api.coolstaffagency.com');
        continue;
      }

      if (isNetworkError && attempt < maxRetries) {
        console.warn(`[Auth Fetch] Attempt ${attempt} failed on slow network. Retrying in ${attempt * 600}ms...`);
        await new Promise((r) => setTimeout(r, attempt * 600));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
};

export const authClient = createAuthClient({
  baseURL: getApiBaseUrl(),
  fetchOptions: {
    customFetchImpl: resilientFetch,
    retry: {
      type: 'exponential',
      attempts: 3,
      baseDelay: 600,
      maxDelay: 3000,
    },
  },
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

