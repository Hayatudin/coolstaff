import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// --- Query Keys ---
export const QUERY_KEYS = {
  candidates: ['candidates'],
  quickRegistrations: ['quickRegistrations'],
  brokers: ['brokers'],
  leaders: ['leaders'],
  invoices: ['invoices'],
  deployments: ['deployments'],
  generatedCVs: ['generatedCVs'],
  passports: ['passports'],
  users: ['users'],
  notifications: ['notifications'],
};

// --- API Fetchers ---
export async function fetchQuickRegistrationsApi() {
  const res = await api('/api/quick-registrations', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch quick registrations');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchBrokersApi() {
  const res = await api('/api/brokers', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch brokers');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchLeadersApi() {
  const res = await api('/api/leaders', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch leaders');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchInvoicesApi() {
  const res = await api('/api/invoices', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch invoices');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchDeploymentsApi() {
  const res = await api('/api/deployments', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch deployments');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchGeneratedCVsApi() {
  const res = await api('/api/generated-cvs', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch generated CVs');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchPassportsApi() {
  const res = await api('/api/passports', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch passports');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// --- Hooks ---
export function useQuickRegistrationsQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.quickRegistrations,
    queryFn: fetchQuickRegistrationsApi,
    staleTime: 1000 * 60 * 5,
  });
}

export function useBrokersQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.brokers,
    queryFn: fetchBrokersApi,
    staleTime: 1000 * 60 * 5,
  });
}

export function useLeadersQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.leaders,
    queryFn: fetchLeadersApi,
    staleTime: 1000 * 60 * 5,
  });
}

export function useInvoicesQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.invoices,
    queryFn: fetchInvoicesApi,
    staleTime: 1000 * 60 * 5,
  });
}

export function useDeploymentsQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.deployments,
    queryFn: fetchDeploymentsApi,
    staleTime: 1000 * 60 * 5,
  });
}

export function useGeneratedCVsQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.generatedCVs,
    queryFn: fetchGeneratedCVsApi,
    staleTime: 1000 * 60 * 5,
  });
}

export function usePassportsQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.passports,
    queryFn: fetchPassportsApi,
    staleTime: 1000 * 60 * 5,
  });
}

export async function fetchNotificationsApi() {
  const res = await api('/api/notifications', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch notifications');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export function useNotificationsQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.notifications,
    queryFn: fetchNotificationsApi,
    staleTime: 1000 * 60 * 2,
  });
}

// --- Global Query Cache Invalidation Helper Hook ---
export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  return (key: keyof typeof QUERY_KEYS | (keyof typeof QUERY_KEYS)[]) => {
    const keys = Array.isArray(key) ? key : [key];
    keys.forEach(k => {
      if (QUERY_KEYS[k]) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS[k] });
      }
    });
  };
}
