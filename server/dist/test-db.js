"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("./lib/prisma"));
async function main() {
    console.log('Testing DB connection...');
    try {
        const tables = await prisma_1.default.$queryRawUnsafe(`SHOW TABLES`);
        console.log('Tables in database:', JSON.stringify(tables, null, 2));
        try {
            const leaderColumns = await prisma_1.default.$queryRawUnsafe(`SHOW COLUMNS FROM Leader`);
            console.log('Leader columns:', JSON.stringify(leaderColumns, null, 2));
        }
        catch (err) {
            console.error('Error showing columns for Leader (case-sensitive check):', err.message);
        }
        try {
            const leaderColumnsLower = await prisma_1.default.$queryRawUnsafe(`SHOW COLUMNS FROM leader`);
            console.log('leader (lowercase) columns:', JSON.stringify(leaderColumnsLower, null, 2));
        }
        catch (err) {
            console.error('Error showing columns for leader (lowercase):', err.message);
        }
        try {
            const brokerColumns = await prisma_1.default.$queryRawUnsafe(`SHOW COLUMNS FROM Broker`);
            console.log('Broker columns:', JSON.stringify(brokerColumns, null, 2));
        }
        catch (err) {
            console.error('Error showing columns for Broker:', err.message);
        }
        // Let's test a simple count
        const leaderCount = await prisma_1.default.leader.count();
        console.log('Leader count via Prisma:', leaderCount);
    }
    catch (err) {
        console.error('Fatal error running DB diagnostics:', err);
    }
    finally {
        await prisma_1.default.$disconnect();
    }
}
main();
