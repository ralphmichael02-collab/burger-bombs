// backend/src/server.js
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import path from 'path';
import { fileURLToPath } from 'url';

import syncRouter from './routes/sync.js';
import menuRouter from './routes/menu.js';
import adminRouter from './routes/admin.js';
import settingsRouter from './routes/settings.js'; // 👈 Import
import { startCloudSyncWorker } from './services/cloudSync.js';
import { startImageSyncWorker } from './services/imageSync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const pubClient = createClient({ url: redisUrl });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()])
  .then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('[socket] Redis adapter connected');
  })
  .catch(err => console.error('[redis] connection error', err));

app.set('io', io);

io.on('connection', (socket) => {
  socket.on('rider_location', (data) => {
    socket.broadcast.emit('rider_location_update', data);
  });
});

app.use('/api', syncRouter);
app.use('/api', menuRouter);
app.use('/api', adminRouter);
app.use('/api', settingsRouter); // 👈 Mount
app.get('/health', (_req, res) => res.json({ ok: true }));

startCloudSyncWorker();
startImageSyncWorker();

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`[backend] http://localhost:${PORT}`));