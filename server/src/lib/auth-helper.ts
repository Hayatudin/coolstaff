import { Request } from 'express';
import { auth } from './auth';
import { fromNodeHeaders } from 'better-auth/node';

export async function getSession(req: Request) {
  // Strategy 1: Better Auth's official fromNodeHeaders converter
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (session) return session;
  } catch (err) {
    console.warn('[AUTH-HELPER] Strategy 1 (fromNodeHeaders) failed:', err);
  }

  // Strategy 2: Raw Node/Express headers casted as any
  try {
    const session = await auth.api.getSession({
      headers: req.headers as any,
    });
    if (session) return session;
  } catch (err) {
    console.warn('[AUTH-HELPER] Strategy 2 (raw headers) failed:', err);
  }

  // Strategy 3: Standard Fetch Headers object manual mapping
  try {
    const webHeaders = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) {
        value.forEach(v => webHeaders.append(key, v));
      } else if (value) {
        webHeaders.set(key, value);
      }
    }
    const session = await auth.api.getSession({
      headers: webHeaders,
    });
    if (session) return session;
  } catch (err) {
    console.warn('[AUTH-HELPER] Strategy 3 (manual Headers) failed:', err);
  }

  return null;
}
