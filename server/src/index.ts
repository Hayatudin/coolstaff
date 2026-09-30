import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Preserve Passenger's injected port before loading dotenv
const PASSENGER_PORT = process.env.PORT;
dotenv.config();
const PORT = PASSENGER_PORT || process.env.PORT || 4000;

// Process-level error sinks to prevent cPanel crashes on socket drop
process.on('uncaughtException', (err: any) => {
  console.error('🛡️ [Process Guard] Uncaught Exception:', err?.code, err?.message || err);
  const isTransientSocketError =
    err?.code === 'ECONNRESET' ||
    err?.code === 'EPIPE' ||
    err?.code === 'ETIMEDOUT' ||
    err?.code === 'ECANCELED' ||
    err?.message?.includes('socket') ||
    err?.message?.includes('aborted');
  if (isTransientSocketError) {
    return;
  }
});

process.on('unhandledRejection', (reason: any) => {
  console.error('🛡️ [Process Guard] Unhandled Rejection:', reason?.code, reason?.message || reason);
});

const app = express();

app.set('trust proxy', 1);

// 1. ULTIMATE CORS FIX - Allow everything correctly with credentials
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  
  // Disable HTTP/3 Alt-Svc to prevent QUIC UDP packet drop on slower networks / desktop hotspots
  res.header('Alt-Svc', 'clear');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).send();
  }
  next();
});

app.use(cookieParser());

// Better Auth handler — MUST come before body parsers (which drain the stream)
import { auth } from './lib/auth';

app.all('/api/auth/*', async (req: Request, res: Response) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.header('Alt-Svc', 'clear');

  if (req.method === 'OPTIONS') {
    return res.status(200).send();
  }

  try {
    // Construct standard Web Request with stable Better-Auth base URL
    const authBase = process.env.BETTER_AUTH_URL || 'https://api.coolstaffagency.com';
    const cleanUrl = req.originalUrl || req.url;
    const fullUrl = `${authBase.replace(/\/$/, '')}${cleanUrl}`;

    let body: any = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body && Object.keys(req.body).length > 0) {
        body = JSON.stringify(req.body);
      } else {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        if (chunks.length > 0) {
          body = Buffer.concat(chunks);
        }
      }
    }

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach((v) => headers.append(key, v));
        } else {
          headers.set(key, value);
        }
      }
    }

    const webRequest = new Request(fullUrl, {
      method: req.method,
      headers,
      body,
      // @ts-ignore
      duplex: 'half',
    });

    const response = await auth.handler(webRequest);

    res.status(response.status);

    const ignoredHeaders = new Set([
      'transfer-encoding',
      'content-encoding',
      'content-length',
      'connection',
      'keep-alive',
      'alt-svc',
    ]);

    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (ignoredHeaders.has(lowerKey)) {
        return;
      }
      if (lowerKey === 'set-cookie') {
        const rawSetCookie = (response.headers as any).getSetCookie?.() || [value];
        res.setHeader('Set-Cookie', rawSetCookie);
      } else {
        res.setHeader(key, value);
      }
    });

    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Alt-Svc', 'clear');

    if (response.body) {
      const buffer = Buffer.from(await response.arrayBuffer());
      return res.send(buffer);
    }
    return res.end();
  } catch (err: any) {
    console.error('🔥 Better Auth Error:', err);
    return res.status(500).json({ error: err?.message || 'Authentication error', details: String(err) });
  }
});

// Body parsers — AFTER auth handler
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

// Root route & health check
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'API is running' });
});

app.get('/api', (req: Request, res: Response) => {
  res.json({ message: 'API is running' });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// --- GLOBAL ERROR HANDLER ---
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('SERVER ERROR:', err);
  
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Alt-Svc', 'clear');
  
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: err.message || 'Unknown error',
    code: err.code 
  });
});

// Start server
const server = app.listen(PORT, async () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}`);
  
  // Run database self-healing checks to inject missing tables/columns
  try {
    const { ensureDatabaseSchema } = await import('./lib/db-healing');
    await ensureDatabaseSchema();
  } catch (dbErr) {
    console.error('❌ Failed to run database self-healing check on startup:', dbErr);
  }
});

// Configure keep-alive timeout to prevent ECONNRESET / socket drop on desktop
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
