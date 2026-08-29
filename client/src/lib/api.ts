/**
 * Central API helper for the frontend to communicate with the standalone backend.
 */
import { authClient } from './auth-client';
import { getApiBaseUrl } from './utils';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Reads session token from document cookies or cached localStorage session payload.
 */
function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Try reading from cookie
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'better-auth.session_token' || name === '__Secure-better-auth.session_token') {
      return decodeURIComponent(value);
    }
  }

  // 2. Try reading from cached session in localStorage
  try {
    const cached = localStorage.getItem('coolstaff_session_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.session?.token) {
        return parsed.session.token;
      }
    }
  } catch (_) {}

  return null;
}

export async function api(path: string, options: RequestInit = {}) {
  // Ensure path starts with a slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${getApiBaseUrl()}${cleanPath}`;
  
  const isFormData = options.body instanceof FormData;
  const token = getSessionToken();

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };
  
  const requestOptions: RequestInit = {
    ...options,
    headers,
    // Ensure cookies are sent for authentication across domains
    credentials: 'include',
  };

  console.log(`[API] ${options.method || 'GET'} ${url}`);

  const maxRetries = 3;
  let delay = 500; // ms
  let retried401 = false;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, requestOptions);
      
      // Handle 401 Unauthorized with single auto-retry after live session refresh
      if (response.status === 401 && !retried401) {
        retried401 = true;
        console.warn('[API] Received 401 Unauthorized. Attempting live session refresh...');
        try {
          const freshSession = await authClient.getSession({
            fetchOptions: { cache: 'no-store' },
          });
          if (freshSession?.data?.session?.token) {
            const newToken = freshSession.data.session.token;
            (requestOptions.headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
            localStorage.setItem('coolstaff_session_cache', JSON.stringify(freshSession.data));
            console.log('[API] Session refreshed successfully. Retrying API request...');
            const retryResponse = await fetch(url, requestOptions);
            if (retryResponse.ok) {
              return retryResponse;
            }
          }
        } catch (refreshErr) {
          console.warn('[API] Live session refresh failed:', refreshErr);
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let message = errorData.error || `API error: ${response.statusText}`;
        if (errorData.details) {
          message += ` | Details: ${errorData.details}`;
        }
        throw new ApiError(
          message,
          response.status,
          errorData
        );
      }
      
      return response;
    } catch (err: any) {
      // Only retry on network errors (fetch throws TypeError on network issues)
      // or if it's a 502/503/504 status code (bad gateway/timeout/server overload)
      const isNetworkError = err instanceof TypeError || err.message?.includes('fetch') || err.message?.includes('NetworkError') || err.name === 'TypeError';
      const isServerTemporarilyDown = err.message?.includes('502') || err.message?.includes('503') || err.message?.includes('504');
      
      if (!(err instanceof ApiError) && (isNetworkError || isServerTemporarilyDown) && attempt < maxRetries) {
        console.warn(`[API] Attempt ${attempt} failed. Retrying in ${delay}ms...`, err);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
        continue;
      }
      throw err;
    }
  }
  
  throw new Error('Failed after max retries');
}
