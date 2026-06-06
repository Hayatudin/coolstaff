// Test: what happens with useSecureCookie = false?
import prisma from './src/lib/prisma';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

async function main() {
  const sessionToken = 'Tjw2oXTVFp6ys8igW7ZwoouACTjCKSEt';
  
  // Create a test auth instance WITHOUT useSecureCookie
  const testAuth = betterAuth({
    database: prismaAdapter(prisma, { provider: 'mysql' }),
    emailAndPassword: { enabled: true },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 60 * 5 },
    },
    trustedOrigins: ['http://localhost:3000'],
    advanced: {
      basePath: '/api/auth',
      cookie: {
        useSecureCookie: false, // <-- KEY CHANGE
        sameSite: "none",
      }
    } as any,
    user: {
      additionalFields: {
        role: { type: 'string', defaultValue: 'user' },
      },
    },
  });
  
  // Test with non-secure cookie name
  console.log('=== Test: useSecureCookie=false, cookie name = better-auth.session_token ===');
  const headers1 = new Headers();
  headers1.set('cookie', `better-auth.session_token=${sessionToken}`);
  try {
    const session = await testAuth.api.getSession({ headers: headers1 });
    console.log('Result:', session ? `User: ${session.user.email}, Role: ${(session.user as any).role}` : 'null');
  } catch (err: any) {
    console.log('Error:', err.message);
  }
  
  // Also test with secure cookie name (for comparison)
  console.log('\n=== Test: useSecureCookie=false, cookie name = __Secure-better-auth.session_token ===');
  const headers2 = new Headers();
  headers2.set('cookie', `__Secure-better-auth.session_token=${sessionToken}`);
  try {
    const session = await testAuth.api.getSession({ headers: headers2 });
    console.log('Result:', session ? `User: ${session.user.email}, Role: ${(session.user as any).role}` : 'null');
  } catch (err: any) {
    console.log('Error:', err.message);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
