import prisma from './lib/prisma';

async function main() {
  const ids = ['cmp30mufa0003cgmq60q2rozc', 'cmp9jm0uv0002vf74xh9ha86i'];
  for (const id of ids) {
    console.log(`\n--- Dry run deleting Candidate ${id} ---`);
    try {
      // 1. Delete all generated CVs
      try {
        const res = await prisma.generatedCV.deleteMany({
          where: { candidateId: id }
        });
        console.log('CVs deleted:', res);
      } catch (e) {
        console.warn(`Failed to delete related GeneratedCVs for candidate ${id}:`, e);
      }

      // 2. Delete all related invoices
      try {
        const res = await prisma.invoice.deleteMany({
          where: { candidateId: id }
        });
        console.log('Invoices deleted:', res);
      } catch (e) {
        console.warn(`Failed to delete related Invoices for candidate ${id}:`, e);
      }

      // 3. Delete related notifications
      try {
        const res = await prisma.notification.deleteMany({
          where: { candidateId: id }
        });
        console.log('Notifications deleted:', res);
      } catch (e) {
        console.warn(`Failed to delete related Notifications for candidate ${id}:`, e);
      }

      // 4. Update QuickRegistration entries to null out promotedCandidateId
      try {
        const res = await prisma.$executeRawUnsafe(
          `UPDATE \`QuickRegistration\` SET \`promotedCandidateId\` = NULL, \`verificationStatus\` = 'verified' WHERE \`promotedCandidateId\` = ?`,
          id
        );
        console.log('QuickRegistrations updated:', res);
      } catch (e) {
        console.warn(`Failed to null out related QuickRegistration entries for candidate ${id}:`, e);
      }

      // 5. Delete candidate
      const res = await prisma.candidate.delete({ where: { id } });
      console.log('Candidate deleted successfully:', res);
    } catch (error) {
      console.error('CRITICAL: Candidate deletion failed!', error);
    }
  }
}

main().catch(console.error);
