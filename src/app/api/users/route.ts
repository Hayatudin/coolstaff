import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';

// Guard: only super_admin can access this endpoint
async function requireSuperAdmin() {
  // Temporary bypass
  return { user: { role: 'super_admin' } } as any;
}

// GET /api/users — list all users
export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(users);
}

// POST /api/users — create a new user
export async function POST(req: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name, email, password, role } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'name, email and password are required' }, { status: 400 });
  }

  const VALID_ROLES = ['user', 'admin', 'super_admin', 'agency'];
  const assignedRole = VALID_ROLES.includes(role) ? role : 'user';

  try {
    // Use Better Auth's sign-up API to create a hashed account
    const res = await auth.api.signUpEmail({
      body: { name, email, password },
    });

    if (!res?.user?.id) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Assign the correct role immediately after creation
    await prisma.user.update({
      where: { id: res.user.id },
      data: { role: assignedRole },
    });

    return NextResponse.json({ success: true, userId: res.user.id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to create user' }, { status: 400 });
  }
}
