// Load environment variables FIRST (before any module reads process.env)
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import { connectDB } from './config/database.js';
import { requestLogger, errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Import placeholder models to register them with mongoose
import './models/index.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import { ShipmentService } from './services/ShipmentService.js';
import { AlertService } from './services/AlertService.js';
import userRoutes from './routes/userRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import shipmentRoutes from './routes/shipmentRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

const app = express();

// ==========================================
// Rate Limiting (Audit Fix #1)
// ==========================================

// Global rate limiter: 100 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Auth rate limiter: stricter limits for login/register to prevent brute force
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5, // 5 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3, // 3 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts, please try again later.' },
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Apply global rate limiter
app.use(globalLimiter);

// Request logger
app.use(requestLogger);

// Health check endpoint (before auth)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Logistic 18 Backend is running',
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// API Routes
// ==========================================

// Authentication endpoints (public — with stricter rate limiting)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth', authRoutes);

// User management (requires auth)
app.use('/api/users', userRoutes);

// Supplier management (Rifshadh's module)
app.use('/api/suppliers', supplierRoutes);

// Shipment tracking (Umayanthi's module)
app.use('/api/shipments', shipmentRoutes);

// Inventory management (Wijemanna's module)
app.use('/api/inventory', inventoryRoutes);

// Alerts & notifications (Kulatunga's module)
app.use('/api/alerts', alertRoutes);

// Analytics & reports (Senadeera's module)
app.use('/api/analytics', analyticsRoutes);

// ==========================================
// Error Handling
// ==========================================

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// ==========================================
// Server Startup
// ==========================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start shipment delay detection cron (every 15 min)
    ShipmentService.startPollingCron();

    // Start alert escalation cron (every 5 min) — Audit Fix W5
    cron.schedule('*/5 * * * *', async () => {
      console.log('[AlertEscalation] Running SLA breach check...');
      try {
        const results = await AlertService.escalateOverdueAlerts();
        if (results.length > 0) {
          console.log(`[AlertEscalation] Escalated ${results.length} alerts.`);
        }
      } catch (err) {
        console.error('[AlertEscalation] Escalation check failed:', err.message);
      }
    });
    console.log('[AlertEscalation] SLA escalation cron registered (every 5 min).');

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`✓ Logistic 18 Backend running on http://localhost:${PORT}`);
      console.log(`✓ API Documentation: http://localhost:${PORT}/api/docs`);
      console.log(`✓ Health check: http://localhost:${PORT}/api/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('\nSIGINT received. Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

export default app;

