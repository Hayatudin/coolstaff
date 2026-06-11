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

app.all('/api/auth/*', express.text({ type: '*/*', limit: '50mb' }), async (req, res) => {
  console.log(`[AUTH] request: ${req.method} ${req.url}`);
  
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach(v => headers.append(key, v));
    else if (value) headers.set(key, value);
  }

  // Create standard Web Request with pre-read string body
  const request = new globalThis.Request(`http://${req.headers.host}${req.url}`, {
    method: req.method,
    headers: headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
  });

  try {
    const response = await auth.handler(request);
    
    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
         res.append('Set-Cookie', value);
      } else {
         res.setHeader(key, value);
      }
    });

    const text = await response.text();
    res.send(text);
  } catch (err: any) {
    console.error("AUTH FATAL ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Body parsers — AFTER auth handler (express.json drains the stream)
app.use(express.json({ limit: '80mb' }));
app.use(express.urlencoded({ extended: true, limit: '80mb' }));

// Static files
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

// UNBLOCKABLE ASSET PROXY (Fixes cPanel CORS issues)
app.get('/api/assets/*', (req: Request, res: Response) => {
  const assetPath = (req.params as any)[0];
  const fullPath = path.join(process.cwd(), 'public', assetPath);
  
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
    const { default: prisma } = await import('./lib/prisma');
    
    // Attempt database query with a 3-second timeout so it doesn't hang
    const dbPromise = (async () => {
      const rawResult = await prisma.$queryRaw`SELECT 1 + 1 AS result`;
      const userCount = await prisma.user.count();
      const candidateCount = await prisma.candidate.count();
      
      // Diagnose tables and columns
      let tables: any[] = [];
      try {
        tables = await prisma.$queryRawUnsafe<any[]>('SHOW TABLES');
      } catch (e: any) {
        tables = [{ error: e.message }];
      }

      let leaderColumns: any[] = [];
      try {
        leaderColumns = await prisma.$queryRawUnsafe<any[]>('SHOW COLUMNS FROM Leader');
      } catch (e: any) {
        leaderColumns = [{ error: e.message }];
      }

      let brokerColumns: any[] = [];
      try {
        brokerColumns = await prisma.$queryRawUnsafe<any[]>('SHOW COLUMNS FROM Broker');
      } catch (e: any) {
        brokerColumns = [{ error: e.message }];
      }

      // Check client models
      const clientModels = Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_'));

      return { 
        rawResult, 
        userCount, 
        candidateCount,
        clientModels,
        hasLeaderModel: 'leader' in prisma,
        hasBrokerModel: 'broker' in prisma,
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
