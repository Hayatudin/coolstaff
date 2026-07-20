import { useState, useEffect } from 'react';
import { Candidate } from '@/types';
import { api } from '@/lib/api';

// Global cache variables outside the component
let cachedCandidates: Candidate[] | null = null;
let lastFetchTime = 0;

export function clearCandidatesCache() {
  cachedCandidates = null;
  lastFetchTime = 0;
}

export function useCandidates() {
  const [candidates, setCandidates] = useState<Candidate[]>(cachedCandidates || []);
  const [isLoading, setIsLoading] = useState(!cachedCandidates);
  const [error, setError] = useState<string | null>(null);

  const fetchCandidates = async (showLoading = false) => {
    if (showLoading && !cachedCandidates) {
      setIsLoading(true);
    }
    try {
      const res = await api('/api/candidates', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Failed to fetch candidates');
      }
      const data = await res.json();
      const freshData = Array.isArray(data) ? data : [];
      cachedCandidates = freshData;
      lastFetchTime = Date.now();
      setCandidates(freshData);
      setError(null);
    } catch (err: any) {
      console.error('[CANDIDATES FETCH ERROR]', err);
      setError(err.message || 'Failed to fetch candidates');
    } finally {
      setIsLoading(false);
    }
  };

  // Immediate fetch on mount and setup polling
  useEffect(() => {
    fetchCandidates(true);

    // Setup polling every 3 seconds
    const interval = setInterval(() => {
      fetchCandidates(false);
    }, 3000);

    // Listen for global app-refresh event to refresh instantly
    const handleGlobalRefresh = () => {
      fetchCandidates(false);
    };
    window.addEventListener('app-refresh', handleGlobalRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('app-refresh', handleGlobalRefresh);
    };
  }, []);

  // Method to update cache and local state optimistically
  const mutate = (updater?: Candidate[] | ((prev: Candidate[]) => Candidate[])) => {
    if (updater === undefined) {
      fetchCandidates(false);
      return;
    }

    if (typeof updater === 'function') {
      setCandidates(prev => {
        const newData = updater(prev);
        cachedCandidates = newData;
        return newData;
      });
    } else {
      cachedCandidates = updater;
      setCandidates(updater);
    }
  };

  return { candidates, isLoading, error, mutate };
}
