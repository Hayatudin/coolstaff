"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prismaClientSingleton = () => {
    let dbUrl = process.env.DATABASE_URL;
    // FAIL-SAFE: Automatically swap to the local cPanel MySQL database
    // if running in the production cPanel environment to prevent firewall hangs/timeouts.
    const isCPanel = process.env.HOME?.includes('coolstou') ||
        process.env.USER === 'coolstou' ||
        process.env.PWD?.includes('coolstou') ||
        process.env.BETTER_AUTH_URL?.includes('coolstaffagency.com');
    if (isCPanel && (!dbUrl || dbUrl.includes('aivencloud.com') || dbUrl.includes('mysql.sock'))) {
        console.log('🤖 Auto-detect: Running on cPanel production. Swapping to local TCP database connection...');
        dbUrl = 'mysql://coolstou_coolstaff:%40Cool132435@127.0.0.1:3306/coolstou_db';
    }
    return new client_1.PrismaClient({
        datasources: {
            db: {
                url: dbUrl
            }
        }
    });
};
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();
exports.default = prisma;
if (process.env.NODE_ENV !== 'production')
    globalThis.prismaGlobal = prisma;
