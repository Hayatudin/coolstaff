import prisma from './lib/prisma';

async function main() {
  const c = await prisma.quickRegistration.findUnique({
    where: { id: 'cmp93g9ro000hcgnfuf5771at' }
  });
  console.log('QuickRegistration found:', c);
}

main().catch(console.error);
