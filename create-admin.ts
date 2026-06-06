import { auth } from './server/src/lib/auth';
import prisma from './server/src/lib/prisma';

async function main() {
  const email = 'admin_test@example.com';
  const password = 'Password123!';
  const name = 'Admin Test';

  console.log('Registering user...');
  const user = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
    }
  });

  console.log('Updating user role to super_admin...');
  await prisma.user.update({
    where: { email },
    data: { role: 'super_admin' }
  });

  console.log('Super admin registered successfully!');
}

main().catch(err => {
  console.error('Error:', err);
});
