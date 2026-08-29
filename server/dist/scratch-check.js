"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("./lib/prisma"));
async function main() {
    const ids = ['cmp30mufa0003cgmq60q2rozc', 'cmp9jm0uv0002vf74xh9ha86i'];
    for (const id of ids) {
        console.log(`\n--- Dry run deleting Candidate ${id} ---`);
        try {
            // 1. Delete all generated CVs
            try {
                const res = await prisma_1.default.generatedCV.deleteMany({
                    where: { candidateId: id }
                });
                console.log('CVs deleted:', res);
            }
            catch (e) {
                console.warn(`Failed to delete related GeneratedCVs for candidate ${id}:`, e);
            }
            // 2. Delete all related invoices
            try {
                const res = await prisma_1.default.invoice.deleteMany({
                    where: { candidateId: id }
                });
                console.log('Invoices deleted:', res);
            }
            catch (e) {
                console.warn(`Failed to delete related Invoices for candidate ${id}:`, e);
            }
            // 3. Delete related notifications
            try {
                const res = await prisma_1.default.notification.deleteMany({
                    where: { candidateId: id }
                });
                console.log('Notifications deleted:', res);
            }
            catch (e) {
                console.warn(`Failed to delete related Notifications for candidate ${id}:`, e);
            }
            // 4. Update QuickRegistration entries to null out promotedCandidateId
            try {
                const res = await prisma_1.default.$executeRawUnsafe(`UPDATE \`QuickRegistration\` SET \`promotedCandidateId\` = NULL, \`verificationStatus\` = 'verified' WHERE \`promotedCandidateId\` = ?`, id);
                console.log('QuickRegistrations updated:', res);
            }
            catch (e) {
                console.warn(`Failed to null out related QuickRegistration entries for candidate ${id}:`, e);
            }
            // 5. Delete candidate
            const res = await prisma_1.default.candidate.delete({ where: { id } });
            console.log('Candidate deleted successfully:', res);
        }
        catch (error) {
            console.error('CRITICAL: Candidate deletion failed!', error);
        }
    }
}
main().catch(console.error);
