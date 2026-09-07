import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import { ROUTE_ACCESS, DASHBOARD_ROLES, type Role } from '@/lib/role-config';

// All protected route prefixes (derived from role config)
const PROTECTED_PATHS = Object.keys(ROUTE_ACCESS);

export async function middleware(request: NextRequest) {
  // Pass request to Next.js app shell; route protection & role verification is enforced by DashboardLayout auth guard
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
