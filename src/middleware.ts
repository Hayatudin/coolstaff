import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

// Roles that are allowed to access the dashboard
const DASHBOARD_ROLES = ['super_admin', 'admin', 'agency'];

// Dashboard route prefixes to protect
const PROTECTED_PATHS = [
  '/dashboard',
  '/candidates',
  '/requested',

  '/fit-candidates',
  '/brokers',
  '/registration',
  '/cv-generator',
  '/generated-cvs',
  '/backup',
  '/settings',
  '/users',
];

// Super-admin only paths
const SUPER_ADMIN_ONLY = ['/users'];

export async function middleware(request: NextRequest) {
  // Temporary bypass for all authentication
  return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Check if the request is for a protected path
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  // Check if a session cookie exists
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    // No session at all — redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Fetch session to verify role
  try {
    const sessionRes = await fetch(
      new URL('/api/auth/session', request.url),
      {
        headers: { cookie: request.headers.get('cookie') ?? '' },
        cache: 'no-store',
      }
    );
    const session = await sessionRes.json();
    
    // If no valid session data returned, treat as unauthenticated
    if (!session || !session.user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const role: string = session.user.role ?? 'user';
    const isSuperAdminOnly = SUPER_ADMIN_ONLY.some((p) => pathname.startsWith(p));

    // 1. Block 'user' role from ANY protected path
    if (role === 'user') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // 2. Block non-super-admins from super-admin-only paths
    if (isSuperAdminOnly && role !== 'super_admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  } catch (err) {
    console.error('Middleware session check failed:', err);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/candidates/:path*',
    '/requested/:path*',

    '/fit-candidates/:path*',
    '/brokers/:path*',
    '/registration/:path*',
    '/cv-generator/:path*',
    '/generated-cvs/:path*',
    '/backup/:path*',
    '/settings/:path*',
    '/users/:path*',
  ],
};
