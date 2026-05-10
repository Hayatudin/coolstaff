/**
 * Seed script — creates the initial Super Admin account.
 * Run with: node prisma/seed.js
 *
 * Credentials:
 *   Email:    hayuuj0@gmail.com
 *   Password: muju1212
 *
 * NOTE: The dev server must be running on port 3000 for this script to work,
 * because we call the Better Auth sign-up endpoint to properly hash the password.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const SUPER_ADMIN_EMAIL    = 'hayuuj0@gmail.com';
const SUPER_ADMIN_PASSWORD = 'muju1212';
const SUPER_ADMIN_NAME     = 'Super Admin';
const BASE_URL             = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';

async function signUpViaApi() {
  const res = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin':  BASE_URL,
      'Referer': BASE_URL,
    },
    body:    JSON.stringify({
      name:     SUPER_ADMIN_NAME,
      email:    SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // 422 means user already exists — that is fine
    if (res.status === 422 || body?.code === 'USER_ALREADY_EXISTS') {
      console.log('ℹ️  User already exists — will patch role.');
      return;
    }
    throw new Error(`Sign-up failed (${res.status}): ${JSON.stringify(body)}`);
  }

  console.log('✅ User account created via Better Auth.');
}

async function main() {
  console.log('\n🌱 Seeding Super Admin...\n');

  // Step 1: create the account through Better Auth (handles password hashing)
  await signUpViaApi();

  // Step 2: find the user in the DB
  const user = await prisma.user.findUnique({ where: { email: SUPER_ADMIN_EMAIL } });

  if (!user) {
    throw new Error(
      'User not found in database after sign-up.\n' +
      'Make sure `npm run dev` is running on port 3000 before running this script.'
    );
  }

  // Step 3: promote to super_admin
  await prisma.user.update({
    where: { id: user.id },
    data:  { role: 'super_admin' },
  });

  console.log('✅ Super Admin seeded successfully!');
  console.log(`   Name  : ${SUPER_ADMIN_NAME}`);
  console.log(`   Email : ${SUPER_ADMIN_EMAIL}`);
  console.log(`   Role  : super_admin\n`);
}

main()
  .catch(err => {
    console.error('\n❌ Seed failed:', err.message, '\n');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
