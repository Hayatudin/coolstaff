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
  const request = new Request(`http://${req.headers.host}${req.url}`, {
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
import userRoutes from './routes/users';
import cvRoutes from './routes/cv';
import generatedCvRoutes from './routes/generated-cvs';
import ocrRoutes from './routes/ocr';
import extractRoutes from './routes/extract';
import notificationRoutes from './routes/notifications';
import accountRoutes from './routes/account';
import searchRoutes from './routes/search';
import cronRoutes from './routes/cron';
import quickRegistrationRoutes from './routes/quick-registrations';
import invoiceRoutes from './routes/invoices';
import settingsRoutes from './routes/settings';

app.use('/api/candidates', candidateRoutes);
app.use('/api/brokers', brokerRoutes);
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

// Database Debug Endpoint (Direct Browser Diagnostics)
app.get('/api/debug-db', async (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  try {
    const { default: prisma } = await import('./lib/prisma');
    
    // Test count on core tables
    const userCount = await prisma.user.count();
    const candidateCount = await prisma.candidate.count();
    
    let invoiceCount = 0;
    let invoiceStatus = 'healthy';
    let invoiceError = null;
    try {
      invoiceCount = await prisma.invoice.count();
    } catch (invErr: any) {
      invoiceStatus = 'error';
      invoiceError = invErr.message || String(invErr);
    }
    
    res.json({ 
      status: 'success', 
      message: 'Database is CONNECTED and working perfectly!', 
      environment: {
        DATABASE_URL_length: process.env.DATABASE_URL?.length || 0,
        NODE_ENV: process.env.NODE_ENV || 'production'
      },
      userCount, 
      candidateCount,
      invoice: {
        status: invoiceStatus,
        count: invoiceCount,
        error: invoiceError
      }
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed inside debug route!', 
      errorMessage: error?.message || String(error),
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack
    });
  }
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

  // 2. Self-healing: Automatically regenerate Prisma client on startup to prevent "Unknown argument" mismatches
  import('child_process').then(({ exec }) => {
    console.log('🔄 Checking and generating Prisma Client to sync with production database...');
    exec('npx prisma generate', { cwd: process.cwd() }, (err, stdout, stderr) => {
      if (err) {
        console.error('❌ Failed to run prisma generate dynamically on startup:', err);
      } else {
        console.log('✅ Prisma Client successfully generated dynamically on startup!\n', stdout);
      }
    });
  }).catch(err => {
    console.error('Failed to import child_process on startup:', err);
  });
});
