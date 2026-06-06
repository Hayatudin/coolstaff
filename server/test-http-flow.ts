// Final debug: sign in via HTTP and inspect the Set-Cookie header
async function main() {
  // 1. Sign in through the HTTP endpoint to see the actual cookies set
  console.log('=== Sign In via HTTP ===');
  const signInRes = await fetch('http://localhost:4000/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'locktest@example.com', password: 'test12345' }),
    redirect: 'manual',
  });
  
  console.log('Status:', signInRes.status);
  console.log('Headers:');
  signInRes.headers.forEach((value, key) => {
    console.log(`  ${key}: ${value}`);
  });
  
  const body = await signInRes.text();
  console.log('Body:', body);
  
  // 2. Extract the session_token cookie
  const cookies = signInRes.headers.getSetCookie ? signInRes.headers.getSetCookie() : [];
  console.log('\n=== Set-Cookie headers ===');
  cookies.forEach((c, i) => console.log(`Cookie ${i}:`, c));
  
  // 3. Find the session token cookie
  const sessionCookie = cookies.find(c => c.includes('session_token'));
  if (sessionCookie) {
    const cookieValue = sessionCookie.split(';')[0]; // name=value
    console.log('\n=== Session Cookie ===');
    console.log('Full cookie:', cookieValue);
    
    // 4. Now use this exact cookie to call getSession
    console.log('\n=== Calling toggle-lock with this cookie ===');
    const brokerId = 'cmp30mhhf0001cgmqnla9gw88';
    const lockRes = await fetch(`http://localhost:4000/api/brokers/${brokerId}/toggle-lock`, {
      method: 'PATCH',
      headers: {
        'Cookie': cookieValue,
      },
    });
    console.log('Lock Status:', lockRes.status);
    console.log('Lock Response:', await lockRes.text());
  } else {
    console.log('No session_token cookie found!');
    
    // Maybe the cookie name is different, print all set-cookie raw
    const rawSetCookie = signInRes.headers.get('set-cookie');
    console.log('Raw Set-Cookie header:', rawSetCookie);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
