import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import { ROUTE_ACCESS, DASHBOARD_ROLES, type Role } from '@/lib/role-config';

// All protected route prefixes (derived from role config)
const PROTECTED_PATHS = Object.keys(ROUTE_ACCESS);

export async function middleware(request: NextRequest) {
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
      new URL('/api/auth/session', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'),
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

    // Block non-dashboard roles from ANY protected path
    if (!DASHBOARD_ROLES.includes(role as Role)) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Redirect video uploader to video uploads page
    if (role === 'video_uploader' && pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/video-uploads', request.url));
    }

    // Redirect agency to contracts page if accessing other dashboard pages
    if (role === 'agency' && !pathname.startsWith('/agency') && !pathname.startsWith('/settings')) {
      return NextResponse.redirect(new URL('/agency/contracts', request.url));
    }

    // Check route-level access using the ROUTE_ACCESS config
    for (const routePath of PROTECTED_PATHS) {
      if (pathname.startsWith(routePath)) {
        const allowedRoles = ROUTE_ACCESS[routePath];
        if (allowedRoles && !allowedRoles.includes(role as Role)) {
          if (role === 'agency') {
            return NextResponse.redirect(new URL('/agency/contracts', request.url));
          }
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        break;
      }
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
    '/quick-registration/:path*',
    '/quick-registered/:path*',
    '/invoice/:path*',
    '/uploaded-videos/:path*',
    '/agency/:path*',
  ],
};
