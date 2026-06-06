import prisma from './server/src/lib/prisma';

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  });
  console.log('Database Users:', JSON.stringify(users, null, 2));
}

main().catch(err => {
  console.error('Error:', err);
});
