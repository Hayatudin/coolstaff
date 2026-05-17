import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Testing Candidate creation with registeredById...');
  
  // Create a dummy user
  const user = await prisma.user.create({
    data: {
      name: 'Admin Tester',
      email: `test_admin_${Date.now()}@example.com`,
      role: 'admin',
    }
  });

  console.log('Dummy User created:', user.id);

  try {
    const candidate = await prisma.candidate.create({
      data: {
        passportNumber: `TEST-PASS-${Date.now()}`,
        surname: 'Test',
        givenNames: 'Tester',
        dateOfBirth: new Date(),
        gender: 'male',
        nationality: 'ET',
        issuingCountry: 'ET',
        dateOfIssue: new Date(),
        dateOfExpiry: new Date(),
        placeOfBirth: 'Addis',
        maritalStatus: 'Single',
        religion: 'Christian',
        bloodType: 'A+',
        registeredById: user.id
      }
    });
    console.log('Candidate created successfully with registeredById!');
    console.log(candidate);

    // Verify it saved
    const fetched = await prisma.candidate.findUnique({
      where: { id: candidate.id },
      include: { registeredBy: true }
    });
    console.log('Fetched Candidate registeredBy:', fetched?.registeredBy);

  } catch (error) {
    console.error('Failed to create candidate:', error);
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
