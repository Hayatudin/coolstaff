import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const regs = await prisma.quickRegistration.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        broker: true
      }
    });
    console.log('Recent QuickRegistrations:', JSON.stringify(regs, null, 2));
  } catch (error) {
    console.error('Failed to query:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
