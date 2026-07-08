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
    },
  },
});

export const {
  signIn,
  signOut,
  signUp,
  getSession,
  changePassword,
  updateUser,
} = authClient;

// Custom robust wrapper for useSession that caches the last successful session in localStorage.
// If the network drops or the server goes down temporarily, it falls back to the cache
// so the layout, role access guards, and sidebar navigation do not collapse.
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
    }
  }, [result.data]);

  // If session is undefined/null (e.g. loading, network timeout or error),
  // and we have a cached version, merge and return the cached data to prevent layout disruption.
  if (!result.data && cachedData) {
    return {
      ...result,
      data: cachedData,
    };
  }

  return result;
}
