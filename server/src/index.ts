import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// CORS & cookies first (they don't consume the request body)
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
app.use(cookieParser());

// Better Auth handler — MUST come before body parsers
import { auth } from './lib/auth';
import { toNodeHandler } from 'better-auth/node';

app.all('/api/auth/*', (req, res) => {
  console.log(`[AUTH] request: ${req.method} ${req.url}`);
  return toNodeHandler(auth)(req, res);
});

// Body parsers — AFTER auth handler (express.json drains the stream)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

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

// Routes placeholder
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'COOLSTAFF API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}`);
});
