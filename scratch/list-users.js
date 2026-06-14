const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('--- USERS ---');
  for (const u of users) {
    console.log(`Email: ${u.email}, Role: ${u.role}, Name: ${u.name}`);
  }
  prisma.$disconnect();
}
main();
