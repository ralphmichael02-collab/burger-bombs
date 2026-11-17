// backend/src/server.js
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

import syncRouter from './routes/sync.js';
import menuRouter from './routes/menu.js';
import adminRouter from './routes/admin.js';
import settingsRouter from './routes/settings.js';
import authRouter from './routes/auth.js';
import crmRouter from './routes/crm.js';
import orderRouter from './routes/order.js';

import { startCloudSyncWorker } from './services/cloudSync.js';
import { startImageSyncWorker } from './services/imageSync.js';
import { startCloudPullSyncWorker } from './services/cloudPullSync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*', methods: ['GET', 'POST'] } });

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const pubClient = createClient({ url: redisUrl });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()])
  .then(() => { io.adapter(createAdapter(pubClient, subClient)); })
  .catch(err => { console.warn('[redis] using in-memory adapter'); });

app.set('io', io);

// ─── SOCKET.IO EVENT HANDLERS ──────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('join:kitchen', () => socket.join('kitchen'));
  socket.on('join:cashier', () => socket.join('cashier'));
  
  // Rider tracking room (Customer listens here)
  socket.on('join:order', (orderId) => {
    socket.join(`order:${orderId}`);
  });

  // Relay GPS from Rider to Customer
  socket.on('rider:location', (data) => {
    io.to(`order:${data.orderId}`).emit('rider:location', data);
  });

  // Mobile Scanner Pairing
  socket.on('scanner:create-session', ({ pairCode }) => socket.join(`scan-session:${pairCode}`));
  socket.on('scanner:pair', ({ pairCode }) => {
    socket.join(`scan-session:${pairCode}`);
    socket.to(`scan-session:${pairCode}`).emit('scanner:mobile-connected');
  });
  socket.on('scanner:result', ({ pairCode, syncId }) => io.to(`scan-session:${pairCode}`).emit('scanner:received', { syncId }));
  socket.on('scanner:end-session', ({ pairCode }) => socket.to(`scan-session:${pairCode}`).emit('scanner:session-ended'));
});

// ─── EXPRESS ROUTES ────────────────────────────────────────────────────
app.use('/api', syncRouter);
app.use('/api', menuRouter);
app.use('/api', adminRouter);
app.use('/api', settingsRouter);
app.use('/api/auth', authRouter);
app.use('/api', crmRouter);
app.use('/api', orderRouter);

app.get('/health', (_req, res) => res.json({ ok: true, mode: process.env.CLOUD_DATABASE_URL ? 'dual' : 'single' }));

// ─── BACKGROUND WORKERS ────────────────────────────────────────────────
startCloudSyncWorker();
startImageSyncWorker();
startCloudPullSyncWorker(io);

const PORT = process.env.PORT || 5174;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`);
});