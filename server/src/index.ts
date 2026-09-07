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
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).send();
  }

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

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'API is running' });
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
