// Deep debug of better auth session resolution
import { auth } from './src/lib/auth';
import { fromNodeHeaders } from 'better-auth/node';

async function main() {
  const sessionToken = 'Tjw2oXTVFp6ys8igW7ZwoouACTjCKSEt';
  
  // Check what cookie names Better Auth expects
  console.log('=== Auth Config ===');
  console.log('Auth options:', JSON.stringify({
    basePath: (auth.options as any)?.basePath,
    baseURL: (auth.options as any)?.baseURL,
    advanced: (auth.options as any)?.advanced,
  }, null, 2));
  
  // Try different cookie name formats
  const cookieNames = [
    'better-auth.session_token',
    '__Secure-better-auth.session_token',
    'better_auth.session_token',
    'session_token',
  ];
  
  for (const cookieName of cookieNames) {
    console.log(`\n=== Trying cookie: ${cookieName} ===`);
    try {
      const headers = new Headers();
      headers.set('cookie', `${cookieName}=${sessionToken}`);
      
      const session = await auth.api.getSession({ headers });
      console.log('Session result:', session ? `User: ${session.user.email}, Role: ${(session.user as any).role}` : 'null');
    } catch (err: any) {
      console.log('Error:', err.message);
    }
  }
  
  // Also try with Authorization header as Bearer token
  console.log('\n=== Trying Authorization: Bearer ===');
  try {
    const headers = new Headers();
    headers.set('authorization', `Bearer ${sessionToken}`);
    
    const session = await auth.api.getSession({ headers });
    console.log('Session result:', session ? `User: ${session.user.email}, Role: ${(session.user as any).role}` : 'null');
  } catch (err: any) {
    console.log('Error:', err.message);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
