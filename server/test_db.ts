import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const c = await prisma.candidate.findFirst({
    where: { isFlagged: true }
  });
  console.log("Candidate from Prisma:", JSON.stringify(c, null, 2));

  if (!c) return;

  const raw = await prisma.$queryRawUnsafe('SELECT id, isFlagged, flaggedAt FROM Candidate WHERE id = ?', c.id);
  console.log("Candidate from Raw SQL:", raw);
}

main().catch(console.error).finally(() => prisma.$disconnect());
