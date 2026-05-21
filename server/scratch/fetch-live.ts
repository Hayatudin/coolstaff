import fetch from 'node-fetch';

async function checkUrl(url: string) {
  console.log(`\nFetching: ${url}`);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Origin': 'https://coolstaffagency.com'
      }
    });
    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log('Headers:');
    res.headers.forEach((val, key) => {
      console.log(`  ${key}: ${val}`);
    });
    const body = await res.text();
    console.log('Body snippet (first 500 chars):');
    console.log(body.substring(0, 500));
  } catch (err: any) {
    console.error('Error fetching:', err.message || err);
  }
}

async function main() {
  await checkUrl('https://api.coolstaffagency.com/api/debug-db');
  await checkUrl('https://api.coolstaffagency.com/api/auth/get-session');
}

main();
