// Signup a fresh user, then try getSession with the returned cookie
import { auth } from './src/lib/auth';
import prisma from './src/lib/prisma';

async function main() {
  // First, let's try signing in and see what cookie is returned
  console.log('=== Attempting sign-in ===');
  try {
    const signInHeaders = new Headers();
    signInHeaders.set('content-type', 'application/json');
    
    const signInResponse = await auth.api.signInEmail({
      body: {
        email: 'admin_test@example.com',
        password: 'admin123',
      },
      headers: signInHeaders,
    });
    
    console.log('Sign-in response:', JSON.stringify(signInResponse, null, 2));
    
    // Check if the response has headers with Set-Cookie
    // The sign-in should return a session token
    if (signInResponse && (signInResponse as any).token) {
      const token = (signInResponse as any).token;
      console.log('Token from sign-in:', token);
      
      // Now try getSession with this token
      const sessionHeaders = new Headers();
      sessionHeaders.set('cookie', `better-auth.session_token=${token}`);
      
      const session = await auth.api.getSession({ headers: sessionHeaders });
      console.log('Session from token:', session ? `Found! ${session.user.email}` : 'null');
    }
  } catch (err: any) {
    console.log('Sign-in error:', err.message);
    console.log('Full error:', err);
  }
  
  // Alternative: try to use listSessions to see what format is expected
  console.log('\n=== All DB sessions ===');
  const sessions = await prisma.session.findMany({
    where: { expiresAt: { gt: new Date() } },
    select: { id: true, token: true, userId: true },
  });
  
  for (const sess of sessions) {
    console.log(`\nSession ID: ${sess.id}, Token: ${sess.token}`);
    
    // Try using this token with getSession
    const h = new Headers();
    h.set('cookie', `better-auth.session_token=${sess.token}`);
    try {
      const result = await auth.api.getSession({ headers: h });
      console.log('  -> getSession result:', result ? 'FOUND' : 'null');
    } catch (e: any) {
      console.log('  -> getSession error:', e.message);
    }
  }
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
