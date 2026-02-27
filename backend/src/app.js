import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { connectDB } from './config/database.js';
import { requestLogger, errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import shipmentRoutes from './routes/shipmentRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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

// Authentication endpoints (public)
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
