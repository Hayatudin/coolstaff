const { auth } = require('./src/lib/auth');

async function main() {
  try {
    console.log('Testing Better Auth signUpEmail...');
    const res = await auth.api.signUpEmail({
      body: {
        name: 'Test User',
        email: 'test' + Math.floor(Math.random() * 10000) + '@example.com',
        password: 'password123',
      }
    });
    console.log('Success:', res);
  } catch (err) {
    console.error('Error in signUpEmail:', err);
  }
}

main();
