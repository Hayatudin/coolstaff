/**
 * Central API helper for the frontend to communicate with the standalone backend.
 */

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:4000').replace(/\/$/, '');

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
  const response = await fetch(url, defaultOptions);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.statusText}`);
  }

  return response;
}
