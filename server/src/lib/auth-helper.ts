import { Request } from 'express';
import { auth } from './auth';
import { fromNodeHeaders } from 'better-auth/node';
import prisma from './prisma';

export async function getSession(req: Request) {
  // Strategy 0: Bearer Token Header (Direct DB Query for Cross-Domain / Third-Party Cookie Bypass)
  try {
    const authHeader = req.headers.authorization || req.headers['authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token) {
        const dbSession = await prisma.session.findUnique({
          where: { token },
          include: { user: true },
        });

        if (dbSession && dbSession.expiresAt > new Date()) {
          return {
            session: dbSession,
            user: dbSession.user,
          };
        }
      }
    }
  } catch (err) {
    console.warn('[AUTH-HELPER] Strategy 0 (Bearer token DB query) failed:', err);
  }

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
