require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const SocketManager = require('./socket/socketManager');

const PROJECT_ROOT = path.join(__dirname, '../..');

const app = express();
const server = http.createServer(app);

// Initialize WebSocket manager
const socketManager = new SocketManager(server);
const io = socketManager.getIO();

// Make io available to routes
app.set('io', io);

// Middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    const allowed = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      process.env.FRONTEND_URL,
    ].filter(Boolean);
    if (allowed.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/spaces', require('./routes/spaceRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/comments', require('./routes/commentRoutes'));
app.use('/api/votes', require('./routes/voteRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/moderation', require('./routes/moderationRoutes'));
app.use('/api/push', require('./routes/pushRoutes'));

// Serve frontend HTML pages from project root
const htmlPages = ['nexus-web', 'notification-feed', 'moderation-dashboard', 'status', 'test-api'];
htmlPages.forEach(page => {
  app.get(`/${page}.html`, (req, res) => res.sendFile(path.join(PROJECT_ROOT, `${page}.html`)));
});
app.use(express.static(path.join(PROJECT_ROOT, 'public')));
app.get('/', (req, res) => res.redirect('/nexus-web.html'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 WebSocket server ready`);
});

module.exports = { app, server, io };
