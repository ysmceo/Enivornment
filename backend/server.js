const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express         = require('express');
const http            = require('http');
const { Server }      = require('socket.io');
const cors            = require('cors');
const helmet          = require('helmet');
const mongoSanitize   = require('express-mongo-sanitize');
const xss             = require('xss-clean');
const compression     = require('compression');
const morgan          = require('morgan');
const cookieParser    = require('cookie-parser');
const mongoose        = require('mongoose');
const streamingConfig = require('./config/streaming');

const connectDB       = require('./config/db');
const { generalLimiter } = require('./middleware/rateLimiter');
const { registerSignalingHandlers } = require('./socket/signaling');
const { notFound, errorHandler } = require('./middleware/error');

// Route imports
const apiRoutes = require('./routes');

// ─── App & HTTP server ─────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// ─── Database ─────────────────────────────────────────────────────────────
connectDB();

// ─── Security middleware ───────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow Cloudinary images
    contentSecurityPolicy: false, // Handled by frontend
  })
);

const configuredOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const defaultLocalOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5175',
  'http://127.0.0.1:5175',
  'http://localhost:5176',
  'http://127.0.0.1:5176',
];

const allowedOrigins = Array.from(
  new Set(
    process.env.NODE_ENV === 'production'
      ? configuredOrigins
      : [...configuredOrigins, ...defaultLocalOrigins]
  )
);
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (curl, mobile apps) and whitelisted origins
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true, // Allow cookies
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

// ─── General middleware ────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10kb' }));             // Prevent JSON payload abuse
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize());                              // Prevent NoSQL injection
app.use(xss());                                        // Prevent XSS payloads
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// ─── Global rate limit ─────────────────────────────────────────────────────
app.use('/api/', generalLimiter);

// ─── API Routes ───────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ─── Health check ─────────────────────────────────────────────────────────
app.get('/api/health', (req, res) =>
  res.json({
    success: true,
    message: 'Crime Reporting API is running',
    env: process.env.NODE_ENV,
    mode: mongoose.connection.readyState === 1 ? 'full' : 'degraded',
    dbConnected: mongoose.connection.readyState === 1,
    streaming: {
      mode: streamingConfig.STREAMING_MODE,
      adaptiveQuality: streamingConfig.ADAPTIVE.enabled,
      sfuConfigured: Boolean(streamingConfig.SFU.url),
      hlsConfigured: Boolean(streamingConfig.HLS.ingestUrl && streamingConfig.HLS.playbackBaseUrl),
    },
  })
);

// ─── 404 + Error middleware ───────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Socket.io ────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin:      allowedOrigins,
    methods:     ['GET', 'POST'],
    credentials: true,
  },
});

registerSignalingHandlers(io);
require('./socket/socketHandler')(io); // Chat/SOS real-time
app.set('io', io);
global.__io = io;

// ─── Start server ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`[Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
