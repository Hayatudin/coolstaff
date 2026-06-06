// Create a fresh user via BetterAuth signUp, then verify getSession works
import { auth } from './src/lib/auth';
import prisma from './src/lib/prisma';

async function main() {
  // 1. Sign up a new test user through Better Auth
  console.log('=== Sign Up ===');
  let signUpResult: any;
  try {
    signUpResult = await auth.api.signUpEmail({
      body: {
        email: 'locktest@example.com',
        password: 'test12345',
        name: 'Lock Test User',
      },
    });
    console.log('Sign up result keys:', Object.keys(signUpResult));
    console.log('Sign up result:', JSON.stringify(signUpResult, null, 2));
  } catch (err: any) {
    console.log('Sign up error:', err.message);
    // User might already exist, try sign in instead
    console.log('\n=== Trying Sign In instead ===');
    try {
      signUpResult = await auth.api.signInEmail({
        body: {
          email: 'locktest@example.com',
          password: 'test12345',
        },
      });
      console.log('Sign in result keys:', Object.keys(signUpResult));
      console.log('Sign in result:', JSON.stringify(signUpResult, null, 2));
    } catch (err2: any) {
      console.log('Sign in also failed:', err2.message);
    }
  }
  
  if (signUpResult) {
    // 2. Get the session token from the result
    const token = signUpResult.token || signUpResult.session?.token;
    console.log('\n=== Token from auth response ===');
    console.log('Token:', token);
    
    // 3. Check the DB for the newly created session
    const dbSessions = await prisma.session.findMany({
      where: { user: { email: 'locktest@example.com' } },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    console.log('\nDB session token:', dbSessions[0]?.token);
    console.log('Token matches?', token === dbSessions[0]?.token);
    
    // 4. Now try getSession with this token
    if (token) {
      // Try all possible cookie name formats
      const cookieNames = [
        'better-auth.session_token',
        '__Secure-better-auth.session_token',
      ];
      
      for (const name of cookieNames) {
        console.log(`\n=== getSession with cookie: ${name}=${token} ===`);
        const h = new Headers();
        h.set('cookie', `${name}=${token}`);
        try {
          const session = await auth.api.getSession({ headers: h });
          console.log('Result:', session ? `FOUND! ${session.user.email}` : 'null');
        } catch (e: any) {
          console.log('Error:', e.message);
        }
      }
    }
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
