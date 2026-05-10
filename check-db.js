const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.generatedCV.findMany({ orderBy: { createdAt: 'desc' }, take: 1 })
  .then(console.log)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
