import 'dotenv/config'; // must be first — loads .env before any other module reads process.env
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';

import apiRoutes from '#backend/routes/apiRoutes.js';
import { errorHandler } from '#backend/utils/errorHandler.js';
import logger from '#backend/config/logger.js';
import { initializeTransporter } from '#backend/utils/emailService.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ==================== MIDDLEWARE ====================

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Cookie parsing
app.use(cookieParser());

// Parse allowed origins
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(url => url.trim()) 
  : ['http://localhost:3000', 'http://localhost:5173'];

// CORS
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      // or if origin is in the allowed list, or if the allowed list contains '*'
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
  })
);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// ==================== DATABASE CONNECTION ====================

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kidsfest';

    await mongoose.connect(mongoUri);

    logger.info('✅ MongoDB connected successfully');
  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// ==================== ROUTES ====================

// API Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'KidsFest API is running',
    timestamp: new Date(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to KidsFest Event Management Platform API',
    version: '1.0.0',
    documentation: '/api-docs',
    baseUrl: '/api'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    method: req.method
  });
});

// ==================== ERROR HANDLING ====================

app.use(errorHandler);

// ==================== BACKGROUND INITIALIZATIONS ====================

// Connect to database without blocking the Express export
connectDB();

// Initialize email transporter asynchronously
initializeTransporter()
  .then(() => logger.info('✅ Email service initialized successfully'))
  .catch((emailError) => {
    logger.warn('⚠️ Email service initialization warning:', emailError.message);
    logger.warn('⚠️ Email notifications may not work. Check SMTP configuration.');
  });

// ==================== LOCAL DEVELOPMENT STARTUP ====================

// Only bind the port if we are NOT running in Vercel's serverless environment
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info(`
╔════════════════════════════════════════╗
║   🎪 KidsFest API Server Started 🎪   ║
╠════════════════════════════════════════╣
║ Environment: ${process.env.NODE_ENV || 'development'.padEnd(20)} │
║ Port: ${PORT.toString().padEnd(31)} │
║ Database: MongoDB                      ║
║ Payment: ${(process.env.RAZORPAY_KEY_ID ? 'Razorpay' : 'Not Configured').padEnd(24)} │
║ Media: ${(process.env.CLOUDINARY_CLOUD_NAME ? 'Cloudinary' : 'Not Configured').padEnd(26)} │
║ Email: ${(process.env.SMTP_EMAIL ? 'Configured' : 'Not Configured').padEnd(27)} │
╚════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown local handlers
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    mongoose.connection.close(() => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully...');
    mongoose.connection.close(() => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Don't process.exit in serverless
  if (!process.env.VERCEL) process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (!process.env.VERCEL) process.exit(1);
});

// Export the instantly-ready Express app for Vercel to route HTTP requests to
export default app;
