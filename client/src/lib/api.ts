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

// In-memory token cache (valid for 4 minutes)
let cachedToken: string | null = null;
let tokenExpiresAt = 0;
let isRefreshing = false;

/**
 * Reads session token from document cookies using multi-pattern matching.
 */
function getCookieToken(): string | null {
  if (typeof window === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const parts = cookie.trim().split('=');
    if (parts.length < 2) continue;
    const name = parts[0].trim();
    const value = parts.slice(1).join('=');
    if (
      name === 'better-auth.session_token' ||
      name === '__Secure-better-auth.session_token' ||
      name.endsWith('session_token')
    ) {
      return decodeURIComponent(value.trim());
    }
  }
  return null;
}

/**
 * Live fallback to fetch fresh token via getSession if cookie is HttpOnly
 * or cross-domain requests on desktop browsers block document.cookie.
 */
async function fetchFreshToken(): Promise<string | null> {
  try {
    const session = await authClient.getSession({
      fetchOptions: { cache: 'no-store' },
    });
    const token = session?.data?.session?.token || null;
    if (token) {
      cachedToken = token;
      tokenExpiresAt = Date.now() + 4 * 60 * 1000; // 4 minutes
    }
    return token;
  } catch (e) {
    return null;
  }
}

// Background proactive refresh every 3 minutes
if (typeof window !== 'undefined') {
  setInterval(async () => {
    if (!isRefreshing && cachedToken) {
      isRefreshing = true;
      try {
        await fetchFreshToken();
      } finally {
        isRefreshing = false;
      }
    }
  }, 3 * 60 * 1000);
}

/**
 * Resolves session token:
 * 1) Multi-pattern cookie check
 * 2) In-memory cached token (4-minute TTL)
 * 3) Live fallback to Better-Auth getSession
 */
export async function resolveSessionToken(forceFresh = false): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  if (!forceFresh) {
    const cookieToken = getCookieToken();
    if (cookieToken) {
      cachedToken = cookieToken;
      tokenExpiresAt = Date.now() + 4 * 60 * 1000;
      return cookieToken;
    }

    if (cachedToken && Date.now() < tokenExpiresAt) {
      return cachedToken;
    }
  }

  return await fetchFreshToken();
}

export async function api(path: string, options: RequestInit = {}) {
  // Ensure path starts with a slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${getApiBaseUrl()}${cleanPath}`;
  
  const isFormData = options.body instanceof FormData;
  const token = await resolveSessionToken();

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };
  
  const requestOptions: RequestInit = {
    ...options,
    headers,
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
          controller.abort(new Error('API request timed out'));
        }, 25000);
        signal = controller.signal;
      }

      const response = await fetch(targetUrl, {
        ...requestOptions,
        signal,
      });
      if (timeoutId) clearTimeout(timeoutId);
      
      // Handle 401 Unauthorized with single auto-retry after forced live session refresh
      if (response.status === 401 && !retried401) {
        retried401 = true;
        console.warn('[API] Received 401 Unauthorized. Attempting forced live session refresh...');
        const freshToken = await resolveSessionToken(true);
        if (freshToken) {
          (requestOptions.headers as Record<string, string>)['Authorization'] = `Bearer ${freshToken}`;
          console.log('[API] Session refreshed successfully. Retrying API request...');
          const retryResponse = await fetch(targetUrl, requestOptions);
          if (retryResponse.ok) {
            return retryResponse;
          }
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
      const isNetworkError =
        err instanceof TypeError ||
        err.name === 'AbortError' ||
        err.name === 'TypeError' ||
        err.message?.includes('fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('network') ||
        err.message?.includes('timed out');
      const isServerTemporarilyDown = err.message?.includes('502') || err.message?.includes('503') || err.message?.includes('504');
      
      // Fallback if local backend is unreachable
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
