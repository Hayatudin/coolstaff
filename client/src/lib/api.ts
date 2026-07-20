/**
 * Central API helper for the frontend to communicate with the standalone backend.
 */

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:4000').replace(/\/$/, '');

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

export async function api(path: string, options: RequestInit = {}) {
  // Ensure path starts with a slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${cleanPath}`;
  
  const isFormData = options.body instanceof FormData;
  
  const defaultOptions: RequestInit = {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
    // Ensure cookies are sent for authentication across domains
    credentials: 'include',
  };

  console.log(`[API] ${options.method || 'GET'} ${url}`);

  const maxRetries = 3;
  let delay = 500; // ms
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, defaultOptions);
      
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
