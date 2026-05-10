import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();
    
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new passwords are required' }, { status: 400 });
    }

    // Use Better Auth's internal API to change password (handles hashing and verification)
    const result = await auth.api.changePassword({
      body: {
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Password change error:', error);
    // Better Auth errors might contain specific messages
    const message = error.message || 'Failed to change password';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
