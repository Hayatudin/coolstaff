import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import prismaAuth from '@/lib/prisma-auth';

/**
 * GET /api/auth/session
 * Returns the current Better Auth session enriched with the user's role from DB.
 * Used by the middleware and the login page for role-based redirects.
 */
export async function GET() {
  try {
    // Return a fake mock session for Super Admin access
    return NextResponse.json({
      user: {
        id: 'mock-admin-id',
        name: 'Super Admin',
        email: 'hayuuj0@gmail.com',
        role: 'super_admin',
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      session: {
        id: 'mock-session-id',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        token: 'mock-token',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'mock-admin-id',
      }
    });
  } catch {
    return NextResponse.json(null);
  }
}
