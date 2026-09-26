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

  // Read session token from cookie
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'better-auth.session_token' || name === '__Secure-better-auth.session_token') {
      return decodeURIComponent(value);
    }
  }

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

  let targetUrl = url;
  const maxRetries = 3;
  let delay = 600; // ms
  let retried401 = false;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let timeoutId: any = null;
    try {
      let signal = requestOptions.signal;
      if (!signal && typeof AbortController !== 'undefined') {
        const controller = new AbortController();
        timeoutId = setTimeout(() => {
          controller.abort(new Error('API request timed out on slow network'));
        }, 25000);
        signal = controller.signal;
      }

      const response = await fetch(targetUrl, {
        ...requestOptions,
        signal,
      });
      if (timeoutId) clearTimeout(timeoutId);
      
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
            console.log('[API] Session refreshed successfully. Retrying API request...');
            const retryResponse = await fetch(targetUrl, requestOptions);
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
      if (timeoutId) clearTimeout(timeoutId);
      // Only retry on network errors (fetch throws TypeError on network issues)
      // or if it's a 502/503/504 status code (bad gateway/timeout/server overload)
      const isNetworkError =
        err instanceof TypeError ||
        err.name === 'AbortError' ||
        err.name === 'TypeError' ||
        err.message?.includes('fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('network') ||
        err.message?.includes('timed out');
      const isServerTemporarilyDown = err.message?.includes('502') || err.message?.includes('503') || err.message?.includes('504');
      
      // Fallback if local backend is down or unreachable
      if (isNetworkError && (targetUrl.includes('localhost:4000') || targetUrl.includes('127.0.0.1:4000'))) {
        console.warn(`[API] Local backend on port 4000 is unreachable. Switching to https://api.coolstaffagency.com...`);
        targetUrl = targetUrl.replace(/http:\/\/(localhost|127\.0\.0\.1):4000/, 'https://api.coolstaffagency.com');
        continue;
      }

      if (!(err instanceof ApiError) && (isNetworkError || isServerTemporarilyDown) && attempt < maxRetries) {
        console.warn(`[API] Attempt ${attempt} failed on slow network. Retrying in ${delay}ms...`, err?.message || err);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
        continue;
      }
      throw err;
    }
  }
  
  throw new Error('Failed after max retries');
}
