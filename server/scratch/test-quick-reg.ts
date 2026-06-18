import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing QuickRegistration Raw SQL update...');
    
    // Find or create a dummy broker
    let broker = await prisma.broker.findFirst();
    if (!broker) {
      broker = await prisma.broker.create({
        data: { name: 'Test Broker' }
      });
    }

    const createData = {
      passportNumber: 'TEST12345',
      surname: 'TEST',
      givenNames: 'QUICK REGISTRATION',
      dateOfBirth: '1990-01-01',
      gender: 'Female',
      nationality: 'Ethiopian',
      dateOfExpiry: '2030-01-01',
      issuingCountry: 'Ethiopia',
      placeOfBirth: 'Addis Ababa',
      educationLevel: 'High School',
      jobExperience: 'None',
      maritalStatus: 'Single',
      numberOfChildren: 0,
      passportImageUrl: null,
      religion: 'Muslim',
      broker: { connect: { id: broker.id } }
    };

    const registration = await prisma.quickRegistration.create({
      data: createData,
    });
    console.log('Successfully created QuickRegistration!', registration.id);

    // Run Raw Update exactly like the server
    const cocDocumentUrl = 'test-coc';
    const labourIdUrl = 'test-labour';
    const candidateIdImageUrl = 'test-cand-id';
    const relativeIdImageUrl = 'test-rel-id';
    const relPhonesString = null;
    const videoUrl = 'test-video';
    const registeredById = null;
    const languagesString = JSON.stringify(['ENGLISH']);

    await prisma.$executeRawUnsafe(
      `UPDATE \`QuickRegistration\` 
       SET \`cocDocumentUrl\` = ?, \`labourIdUrl\` = ?, \`candidateIdImageUrl\` = ?, \`relativeIdImageUrl\` = ?, \`relativePhones\` = ?, \`videoUrl\` = ?, \`agency\` = ?, \`registeredById\` = ?, \`passportType\` = ?, \`languages\` = ?, \`allowVideo\` = ?
       WHERE \`id\` = ?`,
      cocDocumentUrl || null,
      labourIdUrl || null,
      candidateIdImageUrl || null,
      relativeIdImageUrl || null,
      relPhonesString,
      videoUrl || null,
      'daera',
      registeredById || null,
      'original',
      languagesString,
      1,
      registration.id
    );
    console.log('Raw update query executed successfully!');

    // Delete it to clean up
    await prisma.quickRegistration.delete({
      where: { id: registration.id }
    });
    console.log('Successfully cleaned up.');
  } catch (error) {
    console.error('QuickRegistration raw update failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
