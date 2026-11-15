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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ─── REDIS ADAPTER ──────────────────────────────────────────
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const pubClient = createClient({ url: redisUrl });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()])
  .then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('[socket] Redis adapter connected');
  })
  .catch(err => {
    console.warn('[redis] Redis not available, using in-memory adapter:', err.message);
  });

app.set('io', io);

// ─── SOCKET.IO EVENT HANDLERS ──────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('join:kitchen', () => socket.join('kitchen'));
  socket.on('join:cashier', () => socket.join('cashier'));
  socket.on('join:order', (orderId) => socket.join(`order:${orderId}`));
  socket.on('rider:location', (data) => io.to(`order:${data.orderId}`).emit('rider:location', data));

  // Mobile Scanner Pairing
  socket.on('scanner:create-session', ({ pairCode }) => {
    socket.join(`scan-session:${pairCode}`);
    socket.emit('scanner:session-ready', { pairCode });
  });

  socket.on('scanner:pair', ({ pairCode }) => {
    socket.join(`scan-session:${pairCode}`);
    socket.emit('scanner:paired', { pairCode });
    socket.to(`scan-session:${pairCode}`).emit('scanner:mobile-connected');
  });

  socket.on('scanner:result', ({ pairCode, syncId }) => {
    io.to(`scan-session:${pairCode}`).emit('scanner:received', { syncId });
  });

  socket.on('scanner:end-session', ({ pairCode }) => {
    io.to(`scan-session:${pairCode}`).emit('scanner:session-ended');
    socket.leave(`scan-session:${pairCode}`);
  });

  socket.on('disconnect', () => {
    const rooms = Array.from(socket.rooms).filter(r => r.startsWith('scan-session:'));
    rooms.forEach(room => socket.to(room).emit('scanner:mobile-disconnected'));
  });
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

// 👇 NEW: Endpoint to tell the frontend what the current LAN IP is
app.get('/api/network-info', (req, res) => {
  const nets = os.networkInterfaces();
  const ips = [];
  Object.keys(nets).forEach(iface => {
    nets[iface]?.forEach(net => {
      if (net.family === 'IPv4' && !net.internal) ips.push({ address: net.address });
    });
  });
  res.json({ ips, port: process.env.PORT || 5174 });
});

// ─── START SERVER ──────────────────────────────────────────────────────
startCloudSyncWorker();
startImageSyncWorker();

const PORT = process.env.PORT || 5174; 

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('\n======================================================');
  console.log(`🚀 Backend Server running on port ${PORT}`);
  console.log('======================================================');
  
  const nets = os.networkInterfaces();
  Object.keys(nets).forEach((iface) => {
    nets[iface]?.forEach((net) => {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`🌐 LAN Network:  http://${net.address}:${PORT}`);
      }
    });
  });
  console.log('======================================================\n');
});