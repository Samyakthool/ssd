// ==========================================================================
// SAMATA SAINIK DAL (SSD) - DIGITAL COMMAND & MEMBERSHIP PLATFORM SERVER
// Production Express Server & REST API Gateway
// ==========================================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { initDb, isSupabaseConfigured, getDatabaseType } from './backend/db/index.js';
import { runMigration } from './backend/db/migrate.js';

// Route Handlers
import authRoutes from './backend/routes/auth.js';
import membershipRoutes from './backend/routes/membership.js';
import workflowRoutes from './backend/routes/workflows.js';
import memberRoutes from './backend/routes/members.js';
import verifyRoutes from './backend/routes/verify.js';
import donationRoutes from './backend/routes/donations.js';
import chapterRoutes from './backend/routes/chapters.js';
import eventRoutes from './backend/routes/events.js';
import newsRoutes from './backend/routes/news.js';
import mediaRoutes from './backend/routes/media.js';
import adminRoutes from './backend/routes/admin.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

let dbInitPromise = null;
export async function ensureDb() {
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      try {
        await initDb();
        await runMigration();
      } catch (err) {
        console.error('DB Initialization warning:', err.message);
      }
    })();
  }
  return dbInitPromise;
}

// Initialize on startup in non-serverless local environments
if (!process.env.VERCEL) {
  ensureDb();
}

// Database initialization hydration middleware
app.use(async (req, res, next) => {
  await ensureDb();
  next();
});

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Permit CDN fonts, fontawesome, styles
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

import { globalApiRateLimiter } from './backend/middleware/rateLimiter.js';
app.use('/api', globalApiRateLimiter);

// URL Normalization & Serverless Compatibility Middleware
app.use((req, res, next) => {
  if (req.url === '/api' || req.url === '/api/') {
    return res.json({
      status: 'OK',
      service: 'Samata Sainik Dal Central Command API',
      timestamp: new Date().toISOString()
    });
  }
  if (!req.url.startsWith('/api/') && !req.url.startsWith('/verify') && !req.url.startsWith('/uploads') && !req.url.startsWith('/portal') && !req.url.startsWith('/admin') && !req.url.includes('.')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

// Static Uploads & Public Assets
const uploadsPath = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
} catch (e) {}
app.use('/uploads', express.static(uploadsPath));
app.use(express.static(__dirname));

// Mount REST API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/membership', membershipRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/admin', adminRoutes);

// Friendly URL Rewrites
app.get('/verify/:sainikId', (req, res) => {
  res.sendFile(path.join(__dirname, 'verify.html'));
});

app.get('/portal', (req, res) => {
  res.sendFile(path.join(__dirname, 'member-portal.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Samata Sainik Dal Central Command API',
    database: getDatabaseType(),
    supabaseConfigured: isSupabaseConfigured(),
    timestamp: new Date().toISOString()
  });
});

// Safe public Supabase configuration endpoint for client-side connector
app.get('/api/config/supabase', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || null,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null,
    databaseType: getDatabaseType(),
    configured: isSupabaseConfigured()
  });
});

// Start HTTP Server only in standalone server environment (not in serverless Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n==========================================================================`);
    console.log(` 🛡️  SAMATA SAINIK DAL (SSD) - DIGITAL COMMAND PLATFORM`);
    console.log(` 🌐  Web Server Active: http://localhost:${PORT}`);
    console.log(` 🔑  Admin Command Portal: http://localhost:${PORT}/admin.html`);
    console.log(` 🎖️  Sainik Member Portal: http://localhost:${PORT}/member-portal.html`);
    console.log(` 🔍  Public QR Verification: http://localhost:${PORT}/verify/SSD-MH-2026-001245`);
    console.log(`==========================================================================\n`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(` ℹ️  Server is already running on port ${PORT}. Continuing...`);
    } else {
      console.error('Server error:', err);
    }
  });
}

export default app;
