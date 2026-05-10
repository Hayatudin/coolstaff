const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up large base64 records...');
  
  const result = await prisma.generatedCV.deleteMany({
    where: {
      OR: [
        { facePhotoUrl: { startsWith: 'data:image' } },
        { fullBodyPhotoUrl: { startsWith: 'data:image' } }
      ]
    }
  });
  
  console.log(`Deleted ${result.count} records with base64 images.`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
