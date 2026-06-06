import prisma from './src/lib/prisma';

async function main() {
  const brokers = await prisma.broker.findMany({ select: { id: true, name: true, isLocked: true } });
  console.log('Brokers:', JSON.stringify(brokers, null, 2));
  
  const sessions = await prisma.session.findMany({ 
    include: { user: { select: { id: true, email: true, role: true } } }, 
    take: 5 
  });
  console.log('Sessions:', JSON.stringify(sessions, null, 2));
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
