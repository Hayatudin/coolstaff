"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
async function main() {
    const cpanelUrl = "mysql://coolstou_coolstaff:@Cool132435@coolstaffagency.com:3306/coolstou_db";
    console.log('Testing direct connection to cPanel database at coolstaffagency.com...');
    const prisma = new client_1.PrismaClient({
        datasources: {
            db: {
                url: cpanelUrl
            }
        }
    });
    try {
        const tables = await prisma.$queryRawUnsafe(`SHOW TABLES`);
        console.log('cPanel Tables:', JSON.stringify(tables, null, 2));
        try {
            const leaderColumns = await prisma.$queryRawUnsafe(`SHOW COLUMNS FROM Leader`);
            console.log('Leader columns:', JSON.stringify(leaderColumns, null, 2));
        }
        catch (err) {
            console.error('Error showing columns for Leader (case-sensitive):', err.message);
        }
        try {
            const leaderColumnsLower = await prisma.$queryRawUnsafe(`SHOW COLUMNS FROM leader`);
            console.log('leader (lowercase) columns:', JSON.stringify(leaderColumnsLower, null, 2));
        }
        catch (err) {
            console.error('Error showing columns for leader (lowercase):', err.message);
        }
        try {
            const brokerColumns = await prisma.$queryRawUnsafe(`SHOW COLUMNS FROM Broker`);
            console.log('Broker columns:', JSON.stringify(brokerColumns, null, 2));
        }
        catch (err) {
            console.error('Error showing columns for Broker:', err.message);
        }
    }
    catch (err) {
        console.error('Fatal error connecting to cPanel DB:', err.message || err);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
