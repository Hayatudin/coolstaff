import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

const getDatabaseConfig = (): mysql.PoolOptions => {
  let dbUrl = process.env.DATABASE_URL;

  // FAIL-SAFE: Automatically swap to the local cPanel MySQL database
  // if running in the production cPanel environment to prevent firewall hangs/timeouts.
  const isCPanel =
    process.platform !== 'win32' &&
    (process.env.IS_CPANEL === 'true' ||
      process.env.HOME?.includes('coolstou') ||
      process.env.USER === 'coolstou' ||
      process.env.PWD?.includes('coolstou'));

  if (isCPanel && (!dbUrl || dbUrl.includes('aivencloud.com') || dbUrl.includes('mysql.sock'))) {
    console.log('🤖 Auto-detect: Running on cPanel production. Swapping to local TCP database connection...');
    dbUrl = 'mysql://coolstou_coolstaff:%40Cool132435@127.0.0.1:3306/coolstou_db';
  }

  const rawUrl = dbUrl || 'mysql://root:password@127.0.0.1:3306/daera';

  // Base options for maximum resilience, preventing socket hangs and pool exhaustion
  const baseOptions: mysql.PoolOptions = {
    waitForConnections: true,
    connectionLimit: 25,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    maxIdle: 20,
    idleTimeout: 60000,
    connectTimeout: 20000,
  };

  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname;
    const port = parsed.port ? parseInt(parsed.port, 10) : 3306;
    const user = decodeURIComponent(parsed.username || '');
    const password = decodeURIComponent(parsed.password || '');
    const database = parsed.pathname ? parsed.pathname.replace(/^\//, '') : '';

    // If on cPanel or connecting to localhost, strip SSL to avoid self-signed / rejectUnauthorized crashes
    const isLocalhost = host === 'localhost' || host === '127.0.0.1';
    let sslConfig: any = undefined;
    if (!isCPanel && !isLocalhost && (rawUrl.includes('ssl=') || rawUrl.includes('aivencloud.com'))) {
      sslConfig = { rejectUnauthorized: false };
    }

    const config: mysql.PoolOptions = {
      ...baseOptions,
      host,
      port,
      user,
      password,
      database,
      ssl: sslConfig,
    };

    // Unix socket fallback on cPanel if TCP port 3306 is blocked or socket is preferred
    const cpanelSocketPath = '/var/lib/mysql/mysql.sock';
    if (isCPanel && process.env.USE_UNIX_SOCKET === 'true') {
      config.socketPath = cpanelSocketPath;
      delete config.host;
      delete config.port;
    }

    return config;
  } catch (err) {
    console.warn('[DB] Failed to parse DATABASE_URL as URL. Using raw string with pool options.');
    return {
      uri: rawUrl,
      ...baseOptions,
    };
  }
};

const poolConnection = mysql.createPool(getDatabaseConfig());

export const db = drizzle(poolConnection, { schema, mode: 'default' });
export const pool = poolConnection;
export * from './schema';
export default db;
