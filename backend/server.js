import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDB } from './src/config/db.js';

// Route Imports
import authRoutes from './src/routes/authRoutes.js';
import scanRoutes from './src/routes/scanRoutes.js';
import reportRoutes from './src/routes/reportRoutes.js';
import educationRoutes from './src/routes/educationRoutes.js';

// Configurations
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Database connection
connectDB();

// Global Middleware
app.use(helmet()); // Set secure HTTP headers
app.use(cors({
  origin: '*', // Allow all origins for local dev environment ease
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});

app.use('/api/', apiLimiter);

// API Routes mounting
app.use('/api/auth', authRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/education', educationRoutes);

// Base Route
app.use('/', (req, res) => {
  res.json({
    success: true,
    message: 'AI-Powered Anti-Scam Verification Platform API is running.'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express Error Handler:', err.message);
  res.status(500).json({
    success: false,
    message: 'An unexpected server error occurred.'
  });
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 ANTI-SCAM CORE API SERVER STARTING UP`);
  console.log(`📡 Listening on http://localhost:${PORT}`);
  console.log(`🛡️  Helmet and CORS protection enabled`);
  console.log(`======================================================\n`);
});
