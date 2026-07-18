import prisma from './src/lib/prisma';

async function main() {
  try {
    const tableInfo = await prisma.$queryRawUnsafe<{ "Create Table": string }[]>(
      "SHOW CREATE TABLE Leader"
    );
    console.log('Leader Table details:', tableInfo[0]);
  } catch (err: any) {
    console.error('Failed to get Leader table info:', err.message || err);
  }

  try {
    const tableInfo = await prisma.$queryRawUnsafe<{ "Create Table": string }[]>(
      "SHOW CREATE TABLE Broker"
    );
    console.log('Broker Table details:', tableInfo[0]);
  } catch (err: any) {
    console.error('Failed to get Broker table info:', err.message || err);
  }

  await prisma.$disconnect();
}

main();
