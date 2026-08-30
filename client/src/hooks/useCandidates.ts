import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Candidate } from '@/types';
import { api } from '@/lib/api';

export const CANDIDATES_QUERY_KEY = ['candidates'];

export async function fetchCandidatesApi(): Promise<Candidate[]> {
  const res = await api('/api/candidates', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to fetch candidates');
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export function clearCandidatesCache() {
  // Legacy compatibility helper
}

export function useCandidates() {
  const queryClient = useQueryClient();

  const query = useQuery<Candidate[], Error>({
    queryKey: CANDIDATES_QUERY_KEY,
    queryFn: fetchCandidatesApi,
    staleTime: 1000 * 60 * 5, // Keep cached data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes garbage collection
    refetchInterval: 15000, // Background poll every 15s for updates
  });

  const mutate = (updater?: Candidate[] | ((prev: Candidate[]) => Candidate[])) => {
    if (updater === undefined) {
      queryClient.invalidateQueries({ queryKey: CANDIDATES_QUERY_KEY });
      return;
    }

    queryClient.setQueryData<Candidate[]>(CANDIDATES_QUERY_KEY, (old) => {
      const prevData = old || [];
      if (typeof updater === 'function') {
        return updater(prevData);
      }
      return updater;
    });
  };

  return {
    candidates: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ? query.error.message : null,
    mutate,
    refetch: query.refetch,
  };
}
