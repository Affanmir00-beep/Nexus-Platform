const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // We'll restrict this in production
    methods: ['GET', 'POST']
  }
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Simple rate limiting (in-memory, use Redis in production)
const rateLimitMap = new Map();
const rateLimit = (windowMs = 60000, maxRequests = 100) => {
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, []);
    }

    const requests = rateLimitMap.get(key).filter(time => time > windowStart);
    requests.push(now);
    rateLimitMap.set(key, requests);

    if (requests.length > maxRequests) {
      return res.status(429).json({ msg: 'Too many requests. Please try again later.' });
    }

    next();
  };
};

// Apply rate limiting to auth routes (stricter)
app.use('/api/auth', rateLimit(60000, 20));
// General rate limiting
app.use('/api', rateLimit(60000, 100));

// Request logging (development)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// Swagger setup
try {
  const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (err) {
  console.warn('Swagger doc not loaded:', err.message);
}

// Database Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nexus';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  await mongoose.connect(MONGO_URI);
};

// Ensure database connection is established for all API requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('❌ Database connection error:', err);
    next(err);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/meetings', require('./routes/meetings'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/payments', require('./routes/payments'));

// WebRTC Signaling
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId);

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', userId);
    });
  });

  // WebRTC signaling relay
  socket.on('signal', (data) => {
    socket.to(data.roomId).emit('signal', {
      userId: data.userId,
      signal: data.signal
    });
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ msg: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    msg: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

module.exports = app;
