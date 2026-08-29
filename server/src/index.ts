import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// 1. ULTIMATE CORS FIX - Allow everything correctly with credentials
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    // Fallback for requests without Origin header (like same-origin or direct)
    // We don't use '*' because it breaks with Credentials: true
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).send();
  }
  next();
});

app.use(cookieParser());

// Better Auth handler — MUST come before body parsers
import { auth } from './lib/auth';
import { toNodeHandler } from 'better-auth/node';

app.all('/api/auth/*', async (req: Request, res: Response, next: NextFunction) => {
  try {
    return await toNodeHandler(auth)(req, res);
  } catch (err: any) {
    console.error('🔥 Better Auth Error:', err);
    return res.status(500).json({ error: err?.message || 'Authentication error', details: String(err) });
  }
});

// Body parsers — AFTER auth handler (express.json drains the stream)
app.use(express.json({ limit: '80mb' }));
app.use(express.urlencoded({ extended: true, limit: '80mb' }));

import { decryptPath } from './lib/crypto';

// Static files
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

// UNBLOCKABLE ASSET PROXY (Fixes cPanel CORS issues)
app.get('/api/assets/*', (req: Request, res: Response) => {
  let assetPath = (req.params as any)[0] || '';
  
  if (assetPath.startsWith('ENC-')) {
    assetPath = decryptPath(assetPath);
  }
  
  // Strip leading slash to prevent joining issues
  const cleanAssetPath = assetPath.startsWith('/') ? assetPath.substring(1) : assetPath;
  const fullPath = path.join(process.cwd(), 'public', cleanAssetPath);
  
  if (fs.existsSync(fullPath)) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    return res.sendFile(fullPath);
  }
  res.status(404).send('Asset not found');
});

// Routes
import candidateRoutes from './routes/candidates';
import brokerRoutes from './routes/brokers';
import leaderRoutes from './routes/leaders';
import userRoutes from './routes/users';
import cvRoutes from './routes/cv';
import generatedCvRoutes from './routes/generated-cvs';
import fileRoutes from './routes/files';
import deploymentRoutes from './routes/deployments';
import ocrRoutes from './routes/ocr';
import extractRoutes from './routes/extract';
import notificationRoutes from './routes/notifications';
import accountRoutes from './routes/account';
import searchRoutes from './routes/search';
import cronRoutes from './routes/cron';
import quickRegistrationRoutes from './routes/quick-registrations';
import invoiceRoutes from './routes/invoices';
import settingsRoutes from './routes/settings';
import videoUploadsRoutes from './routes/video-uploads';
import agencyRoutes from './routes/agency';
import passportRoutes from './routes/passports';

app.use('/api/candidates', candidateRoutes);
app.use('/api/brokers', brokerRoutes);
app.use('/api/leaders', leaderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/generated-cvs', generatedCvRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/extract', extractRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/quick-registrations', quickRegistrationRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/video-uploads', videoUploadsRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/deployments', deploymentRoutes);
app.use('/api/agency', agencyRoutes);
app.use('/api/passports', passportRoutes);


// Auth Diagnostic Endpoint — shows exactly what's in Account table and tests password verify
app.get('/api/debug-auth', async (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const result: any = { steps: [] };

  try {
    const { pool } = await import('./db');
    const { verifyPassword } = await import('better-auth/crypto');

    // 1. Check better-auth package version
    try {
      // Read version via require to avoid TS module assertion issues
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pkgJson = require('better-auth/package.json');
      result.betterAuthVersion = pkgJson?.version || 'unknown';
    } catch { result.betterAuthVersion = 'could not read'; }

    // 2. Check Account table columns
    const [cols]: any = await pool.query('SHOW COLUMNS FROM `Account`');
    result.accountColumns = cols.map((c: any) => ({ field: c.Field, type: c.Type, null: c.Null }));
    result.steps.push('✅ Account columns fetched');

    // 3. Find hayuuj0@gmail.com user
    const [userRows]: any = await pool.query("SELECT id, email, role FROM `User` WHERE email = 'hayuuj0@gmail.com' LIMIT 1");
    if (!userRows || userRows.length === 0) {
      result.steps.push('❌ User hayuuj0@gmail.com NOT FOUND in User table');
      result.userFound = false;
    } else {
      result.userFound = true;
      result.user = userRows[0];
      result.steps.push('✅ User found: ' + JSON.stringify(userRows[0]));

      // 4. Find Account row — show accountId and issuer explicitly
      const [accRows]: any = await pool.query(
        "SELECT id, accountId, providerId, issuer, LENGTH(password) as pwdLen, LEFT(password, 30) as pwdPrefix FROM `Account` WHERE userId = ? AND providerId = 'credential' LIMIT 1",
        [userRows[0].id]
      );
      if (!accRows || accRows.length === 0) {
        result.steps.push('❌ No credential Account row found for this user');
        result.accountFound = false;
      } else {
        result.accountFound = true;
        result.account = accRows[0];
        const issuerOk = accRows[0].issuer === 'local:credential';
        const accountIdOk = accRows[0].accountId === userRows[0].id;
        result.steps.push(`✅ Account found. Password length: ${accRows[0].pwdLen}, prefix: ${accRows[0].pwdPrefix}`);
        result.steps.push(`issuer="${accRows[0].issuer}" → ${issuerOk ? '✅ correct' : '❌ WRONG — must be "local:credential"'}`);
        result.steps.push(`accountId="${accRows[0].accountId}" → ${accountIdOk ? '✅ correct (equals userId)' : `❌ WRONG — must equal userId "${userRows[0].id}"`}`);

        // 5. Fetch full password hash and test verification
        const [fullAcc]: any = await pool.query(
          "SELECT password FROM `Account` WHERE userId = ? AND providerId = 'credential' LIMIT 1",
          [userRows[0].id]
        );
        const storedHash = fullAcc[0]?.password;
        if (!storedHash) {
          result.steps.push('❌ Password column is NULL or empty');
          result.passwordNull = true;
        } else {
          result.passwordNull = false;
          // Test with the known password
          try {
            const verified = await verifyPassword({ hash: storedHash, password: 'muju1212' });
            result.passwordVerifyResult = verified;
            result.steps.push(verified ? '✅ Password "muju1212" verifies CORRECTLY' : '❌ Password "muju1212" does NOT verify — hash mismatch');
          } catch (verifyErr: any) {
            result.steps.push('❌ verifyPassword threw error: ' + verifyErr.message);
            result.verifyError = verifyErr.message;
          }
        }
      }
    }
  } catch (err: any) {
    result.error = err.message || String(err);
    result.steps.push('❌ Fatal error: ' + result.error);
  }

  res.json(result);
});

// Force re-hash all user passwords using current better-auth crypto
// Call: GET /api/debug-rehash?secret=coolstaff2026
app.get('/api/debug-rehash', async (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.query.secret !== 'coolstaff2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const result: any = { steps: [], rehashed: [] };

  try {
    const { pool } = await import('./db');
    const { hashPassword, verifyPassword } = await import('better-auth/crypto');

    // Get all credential accounts that have a password
    const [accounts]: any = await pool.query(
      "SELECT a.id, a.userId, a.password, u.email FROM `Account` a JOIN `User` u ON a.userId = u.id WHERE a.providerId = 'credential' AND a.password IS NOT NULL"
    );

    result.steps.push(`Found ${accounts.length} credential accounts`);

    for (const acc of accounts) {
      // Test if current hash already works with better-auth v1.7
      let alreadyValid = false;
      try {
        // We can't verify without the plaintext — but we can detect old bcrypt hashes
        // bcrypt hashes start with $2b$ or $2a$, scrypt (v1.7) is a hex:hex format
        const isBcrypt = acc.password?.startsWith('$2');
        const isOldScrypt = acc.password?.includes(':') && acc.password?.length < 100;
        const isNewScrypt = acc.password?.includes(':') && acc.password?.length >= 100;

        result.rehashed.push({
          email: acc.email,
          userId: acc.userId,
          passwordLength: acc.password?.length,
          passwordFormat: isBcrypt ? 'bcrypt (v1.1 format - INCOMPATIBLE)' : isNewScrypt ? 'scrypt-v1.7 (correct)' : isOldScrypt ? 'scrypt-old (may be incompatible)' : 'unknown',
          action: isBcrypt || isOldScrypt ? 'NEEDS_REHASH' : 'OK',
        });
      } catch (e: any) {
        result.steps.push(`⚠️ Error checking ${acc.email}: ${e.message}`);
      }
    }

    // For hayuuj0@gmail.com specifically, force rehash with known password
    const hayuuAcc = accounts.find((a: any) => a.email === 'hayuuj0@gmail.com');
    if (hayuuAcc) {
      const newHash = await hashPassword('muju1212');
      // v1.7 requires: accountId = userId, issuer = 'local:credential'
      await pool.query(
        "UPDATE `Account` SET `password` = ?, `accountId` = ?, `issuer` = 'local:credential' WHERE `id` = ?",
        [newHash, hayuuAcc.userId, hayuuAcc.id]
      );
      const verified = await verifyPassword({ hash: newHash, password: 'muju1212' });
      result.steps.push(`✅ Force-rehashed hayuuj0@gmail.com. New hash length: ${newHash.length}. Verify test: ${verified}`);
      result.steps.push(`✅ Set accountId = userId (${hayuuAcc.userId}), issuer = 'local:credential'`);
      result.hayuuRehashed = true;
    } else {
      result.steps.push('❌ hayuuj0@gmail.com not found in accounts');
      result.hayuuRehashed = false;
    }

    // Also fix ALL other credential accounts: set issuer and accountId correctly
    let fixedCount = 0;
    for (const acc of accounts) {
      if (acc.email === 'hayuuj0@gmail.com') continue; // already handled above
      try {
        await pool.query(
          "UPDATE `Account` SET `accountId` = ?, `issuer` = 'local:credential' WHERE `id` = ? AND providerId = 'credential'",
          [acc.userId, acc.id]
        );
        fixedCount++;
      } catch (e: any) {
        result.steps.push(`⚠️ Could not fix account for ${acc.email}: ${e.message}`);
      }
    }
    result.steps.push(`✅ Fixed accountId+issuer for ${fixedCount} other credential accounts`);

  } catch (err: any) {
    result.error = err.message || String(err);
    result.steps.push('❌ Fatal: ' + result.error);
  }

  res.json(result);
});

// Database Debug Endpoint (Direct Browser Diagnostics)
app.get('/api/debug-db', async (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  const envInfo = {
    HOME: process.env.HOME,
    USER: process.env.USER,
    PWD: process.env.PWD,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL_RAW: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.split('@')[1] || process.env.DATABASE_URL}` : 'not set',
  };

  const isCPanel = 
    process.env.HOME?.includes('coolstou') || 
    process.env.USER === 'coolstou' || 
    process.env.PWD?.includes('coolstou') ||
    process.env.BETTER_AUTH_URL?.includes('coolstaffagency.com');

  let dbUrlSelected = process.env.DATABASE_URL || '';
  if (isCPanel) {
    dbUrlSelected = 'mysql://coolstou_coolstaff:***@127.0.0.1:3306/coolstou_db';
  } else {
    dbUrlSelected = dbUrlSelected ? `${dbUrlSelected.split('@')[1] || dbUrlSelected}` : 'none';
  }

  const diagnostics: any = {
    status: 'checking',
    isCPanelDetected: !!isCPanel,
    dbUrlSelected: dbUrlSelected.replace(/:[^@:]*@/, ':***@'), // extra mask safety
    environment: {
      ...envInfo,
      DATABASE_URL_RAW: envInfo.DATABASE_URL_RAW.replace(/:[^@:]*@/, ':***@'),
    },
  };

  try {
    const { pool, db, user: userTable, candidate: candidateTable } = await import('./db');
    const { count } = await import('drizzle-orm');
    
    // Attempt database query with a 3-second timeout so it doesn't hang
    const dbPromise = (async () => {
      const [rawResult]: any = await pool.query('SELECT 1 + 1 AS result');
      const userCountRes = await db.select({ value: count() }).from(userTable);
      const candCountRes = await db.select({ value: count() }).from(candidateTable);
      
      // Diagnose tables and columns
      let tables: any[] = [];
      try {
        const [tRows]: any = await pool.query('SHOW TABLES');
        tables = tRows;
      } catch (e: any) {
        tables = [{ error: e.message }];
      }

      let leaderColumns: any[] = [];
      try {
        const [lRows]: any = await pool.query('SHOW COLUMNS FROM Leader');
        leaderColumns = lRows;
      } catch (e: any) {
        leaderColumns = [{ error: e.message }];
      }

      let brokerColumns: any[] = [];
      try {
        const [bRows]: any = await pool.query('SHOW COLUMNS FROM Broker');
        brokerColumns = bRows;
      } catch (e: any) {
        brokerColumns = [{ error: e.message }];
      }

      return { 
        rawResult, 
        userCount: userCountRes[0]?.value || 0, 
        candidateCount: candCountRes[0]?.value || 0,
        tables,
        leaderColumns,
        brokerColumns
      };
    })();

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database query timed out (3000ms exceeded). Check if server firewall blocks port.')), 3000)
    );

    const result: any = await Promise.race([dbPromise, timeoutPromise]);
    
    diagnostics.status = 'success';
    diagnostics.message = 'Database is CONNECTED and responding!';
    diagnostics.queryResult = result;
  } catch (error: any) {
    diagnostics.status = 'error';
    diagnostics.message = 'Database diagnostic failed!';
    diagnostics.error = error.message || String(error);
  }

  // Scan typical MySQL sockets on cPanel to help diagnose connections
  const socketPaths = [
    '/var/lib/mysql/mysql.sock',
    '/var/run/mysqld/mysqld.sock',
    '/tmp/mysql.sock',
    '/tmp/mysql.sock.lock',
    '/var/run/mysql/mysql.sock',
  ];
  const socketCheck: Record<string, boolean> = {};
  socketPaths.forEach(p => {
    try {
      socketCheck[p] = fs.existsSync(p);
    } catch {
      socketCheck[p] = false;
    }
  });
  diagnostics.socketCheck = socketCheck;

  // Run low-level network connectivity tests using built-in 'net' module
  const net = await import('net');
  const checkPort = (host: string, port: number): Promise<any> => {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1500);
      socket.connect(port, host, () => {
        socket.destroy();
        resolve({ open: true });
      });
      socket.on('error', (e) => {
        socket.destroy();
        resolve({ open: false, error: e.message });
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve({ open: false, error: 'Timeout' });
      });
    });
  };

  const checkUnix = (path: string): Promise<any> => {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1500);
      socket.connect(path, () => {
        socket.destroy();
        resolve({ open: true });
      });
      socket.on('error', (e) => {
        socket.destroy();
        resolve({ open: false, error: e.message });
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve({ open: false, error: 'Timeout' });
      });
    });
  };

  try {
    diagnostics.netConnectTest = {
      localhost_3306: await checkPort('localhost', 3306),
      ip_127_0_0_1_3306: await checkPort('127.0.0.1', 3306),
      unix_socket_var_lib: await checkUnix('/var/lib/mysql/mysql.sock'),
      unix_socket_tmp: await checkUnix('/tmp/mysql.sock'),
    };
  } catch (netErr: any) {
    diagnostics.netConnectTestError = netErr.message || String(netErr);
  }

  res.json(diagnostics);
});

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'COOLSTAFF API is running' });
});

// --- GLOBAL ERROR HANDLER ---
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('SERVER ERROR:', err);
  
  // Ensure CORS headers are present even on error
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: err.message || 'Unknown error',
    code: err.code 
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}`);
  
  // 1. Run database self-healing checks to inject missing tables/columns
  try {
    const { ensureDatabaseSchema } = await import('./lib/db-healing');
    await ensureDatabaseSchema();
  } catch (dbErr) {
    console.error('❌ Failed to run database self-healing check on startup:', dbErr);
  }
});
