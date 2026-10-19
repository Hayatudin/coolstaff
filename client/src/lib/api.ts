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
 * 1) In-memory cached token (4-minute TTL)
 * 2) Multi-pattern cookie check
 * 3) Direct localStorage session cache check (synchronous)
 * 4) Live fallback to Better-Auth getSession
 */
export async function resolveSessionToken(forceFresh = false): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  if (!forceFresh) {
    if (cachedToken && Date.now() < tokenExpiresAt) {
      return cachedToken;
    }

    const cookieToken = getCookieToken();
    if (cookieToken) {
      cachedToken = cookieToken;
      tokenExpiresAt = Date.now() + 4 * 60 * 1000;
      return cookieToken;
    }

    // Check localStorage directly for immediate token availability
    try {
      const directToken = localStorage.getItem('coolstaff_token');
      if (directToken) {
        cachedToken = directToken;
        tokenExpiresAt = Date.now() + 4 * 60 * 1000;
        return directToken;
      }

      const raw = localStorage.getItem('coolstaff_user_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        const token = parsed?.data?.session?.token;
        if (token) {
          cachedToken = token;
          tokenExpiresAt = Date.now() + 4 * 60 * 1000;
          return token;
        }
      }
    } catch (_) {}
  }

  return await fetchFreshToken();
}

/**
 * Safely parses JSON from a Response and intercepts unexpected HTML responses
 */
async function safeParseResponseJson(response: Response): Promise<any> {
  const text = await response.text();
  if (!text || !text.trim()) {
    return {};
  }
  const trimmed = text.trim();
  if (trimmed.startsWith('<') || trimmed.toLowerCase().startsWith('<!doctype')) {
    throw new Error('Server returned an unexpected HTML response instead of JSON. Please try again.');
  }
  try {
    return JSON.parse(text);
  } catch (err: any) {
    throw new Error(`Invalid response format: ${err.message || 'JSON parse error'}`);
  }
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

  const maxRetries = 3;
  let delay = 500; // ms
  let retried401 = false;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let timeoutId: any = null;
    try {
      let signal = requestOptions.signal;
      if (!signal && typeof AbortController !== 'undefined') {
        const controller = new AbortController();
        timeoutId = setTimeout(() => {
          controller.abort(new Error('API request timed out'));
        }, 30000);
        signal = controller.signal;
      }

      const response = await fetch(url, {
        ...requestOptions,
        signal,
      });
      if (timeoutId) clearTimeout(timeoutId);
      
      // Handle 401 Unauthorized with single auto-retry after forced live session refresh
      if (response.status === 401 && !retried401) {
        retried401 = true;
        console.warn('[API] Received 401 Unauthorized. Refreshing live session...');
        const freshToken = await resolveSessionToken(true);
        if (freshToken) {
          (requestOptions.headers as Record<string, string>)['Authorization'] = `Bearer ${freshToken}`;
          const retryResponse = await fetch(url, requestOptions);
          if (retryResponse.ok) {
            // Attach safe JSON parser
            const originalRetryJson = retryResponse.json.bind(retryResponse);
            retryResponse.json = () => safeParseResponseJson(retryResponse).catch(originalRetryJson);
            return retryResponse;
          }
        }
      }

      if (!response.ok) {
        let errorData: any = {};
        try {
          const text = await response.text();
          if (text && !text.trim().startsWith('<')) {
            errorData = JSON.parse(text);
          }
        } catch (_) {}

        let message = errorData.error || errorData.message || `API error: ${response.statusText || response.status}`;
        if (errorData.details) {
          message += ` | Details: ${errorData.details}`;
        }
        throw new ApiError(
          message,
          response.status,
          errorData
        );
      }
      
      // Attach safe JSON parser to prevent "doctype is not valid JSON" errors
      const originalJson = response.json.bind(response);
      response.json = () => safeParseResponseJson(response).catch(originalJson);

      return response;
    } catch (err: any) {
      if (timeoutId) clearTimeout(timeoutId);

      if (err instanceof ApiError) {
        throw err;
      }

      const isNetworkError =
        err instanceof TypeError ||
        err.name === 'AbortError' ||
        err.name === 'TypeError' ||
        err.message?.includes('fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('network') ||
        err.message?.includes('timed out');
      const isServerTemporarilyDown = err.message?.includes('502') || err.message?.includes('503') || err.message?.includes('504');

      if ((isNetworkError || isServerTemporarilyDown) && attempt < maxRetries) {
        console.warn(`[API] Attempt ${attempt} failed (${err?.message || 'network delay'}). Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
        continue;
      }
      throw err;
    }
  }
  
  throw new Error('Failed after max retries');
}
