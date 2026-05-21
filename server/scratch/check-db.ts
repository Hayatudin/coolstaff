import { PrismaClient } from '@prisma/client';

async function testConnection(name: string, url: string) {
  console.log(`\nTesting connection to ${name}...`);
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    }
  });

  try {
    const rawResult = await prisma.$queryRaw`SELECT 1 + 1 AS result`;
    console.log(`  [${name}] ✅ Query 1+1 success:`, rawResult);

    const userCount = await prisma.user.count();
    console.log(`  [${name}] ✅ User Count:`, userCount);

    const candidateCount = await prisma.candidate.count();
    console.log(`  [${name}] ✅ Candidate Count:`, candidateCount);

    const users = await prisma.user.findMany({ take: 2 });
    console.log(`  [${name}] ✅ Sample Users:`, users.map(u => ({ email: u.email, role: u.role, name: u.name })));
  } catch (error: any) {
    console.error(`  [${name}] ❌ Connection Failed:`, error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  // Use environment variables — never hardcode credentials
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set. Please set it in your .env file.');
    return;
  }

  await testConnection("Database", dbUrl);
}

main();
