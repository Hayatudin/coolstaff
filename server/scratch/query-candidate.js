const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const qregs = await prisma.quickRegistration.findMany({
      select: {
        id: true,
        givenNames: true,
        surname: true,
        passportNumber: true,
      }
    });
    console.log(qregs);
  } catch (error) {
    console.error('Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
