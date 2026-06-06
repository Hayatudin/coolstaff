// Ultra-deep debug: Check exactly what cookie name BetterAuth uses
import { auth } from './src/lib/auth';
import prisma from './src/lib/prisma';

async function main() {
  const sessionToken = 'Tjw2oXTVFp6ys8igW7ZwoouACTjCKSEt';
  
  // 1. Verify session exists in DB
  const dbSession = await prisma.session.findFirst({
    where: { token: sessionToken },
    include: { user: true }
  });
  console.log('=== DB Session ===');
  console.log(dbSession ? `Found: user=${dbSession.user.email}, role=${(dbSession.user as any).role}, expires=${dbSession.expiresAt}` : 'NOT FOUND');
  
  // 2. Print all internal cookie configs
  console.log('\n=== Auth Internal Config ===');
  const options = auth.options as any;
  console.log('baseURL:', options.baseURL);
  console.log('basePath:', options.basePath);
  console.log('advanced:', JSON.stringify(options.advanced, null, 2));
  
  // 3. Try to find the correct cookie name by inspecting the internal cookie handling
  // Better Auth with useSecureCookie creates cookies like "__Secure-better-auth.session_token"
  // Without it, just "better-auth.session_token"
  
  // 4. Try direct session lookup through the internal context
  // Get list of sessions from the Better Auth internal API
  try {
    const headers = new Headers();
    headers.set('cookie', `__Secure-better-auth.session_token=${sessionToken}`);
    
    console.log('\n=== getSession internal debug ===');
    console.log('headers cookie:', headers.get('cookie'));
    
    // Try auth.api directly
    const result = await auth.api.getSession({ headers });
    console.log('getSession result:', result);
  } catch (err: any) {
    console.log('Error:', err.message, err.stack);
  }

  // 5. Check if BETTER_AUTH_URL env var is set (BetterAuth requires this)
  console.log('\n=== Environment ===');
  console.log('BETTER_AUTH_URL:', process.env.BETTER_AUTH_URL);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
