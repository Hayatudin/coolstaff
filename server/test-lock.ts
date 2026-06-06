// Test the toggle-lock endpoint directly
async function main() {
  const brokerId = 'cmp30mhhf0001cgmqnla9gw88'; // Ansar Abdurehman
  const sessionToken = 'Tjw2oXTVFp6ys8igW7ZwoouACTjCKSEt'; // Active session for super_admin

  // Test 1: No auth
  console.log('=== Test 1: No auth ===');
  const res1 = await fetch(`http://localhost:4000/api/brokers/${brokerId}/toggle-lock`, {
    method: 'PATCH',
  });
  console.log('Status:', res1.status);
  console.log('Response:', await res1.text());

  // Test 2: With session cookie
  console.log('\n=== Test 2: With session cookie ===');
  const res2 = await fetch(`http://localhost:4000/api/brokers/${brokerId}/toggle-lock`, {
    method: 'PATCH',
    headers: {
      'Cookie': `better-auth.session_token=${sessionToken}`,
    },
  });
  console.log('Status:', res2.status);
  console.log('Response:', await res2.text());

  // Test 3: With __Secure- prefix cookie (secure cookies)
  console.log('\n=== Test 3: With __Secure- prefix cookie ===');
  const res3 = await fetch(`http://localhost:4000/api/brokers/${brokerId}/toggle-lock`, {
    method: 'PATCH',
    headers: {
      'Cookie': `__Secure-better-auth.session_token=${sessionToken}`,
    },
  });
  console.log('Status:', res3.status);
  console.log('Response:', await res3.text());
  
  // Test 4: Both cookie patterns
  console.log('\n=== Test 4: Both cookie patterns ===');
  const res4 = await fetch(`http://localhost:4000/api/brokers/${brokerId}/toggle-lock`, {
    method: 'PATCH',
    headers: {
      'Cookie': `better-auth.session_token=${sessionToken}; __Secure-better-auth.session_token=${sessionToken}`,
    },
  });
  console.log('Status:', res4.status);
  console.log('Response:', await res4.text());
}

main().catch(e => { console.error(e); process.exit(1); });
