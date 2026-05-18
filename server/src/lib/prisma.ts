import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  let dbUrl = process.env.DATABASE_URL;

  // FAIL-SAFE: Automatically swap to the local cPanel MySQL database
  // if running in the production cPanel environment to prevent firewall hangs/timeouts.
  const isCPanel = 
    process.env.HOME?.includes('coolstou') || 
    process.env.USER === 'coolstou' || 
    process.env.PWD?.includes('coolstou') ||
    process.env.BETTER_AUTH_URL?.includes('coolstaffagency.com');

  if (isCPanel && dbUrl?.includes('aivencloud.com')) {
    console.log('🤖 Auto-detect: Running on cPanel production. Swapping to local database connection...');
    dbUrl = 'mysql://coolstou_coolstaff:%40Cool132435@localhost:3306/coolstou_db';
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: dbUrl
      }
    }
  });
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
