// backend/src/server.js
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import syncRouter from './routes/sync.js';
import menuRouter from './routes/menu.js';

const app = express();
app.use(cors());
app.use(express.json());

// 1. Create the HTTP server from Express
const httpServer = createServer(app);

// 2. Attach Socket.IO
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// 3. Connect Redis for Pub/Sub
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const pubClient = createClient({ url: redisUrl });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()])
  .then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('[socket] Redis adapter connected');
  })
  .catch(err => console.error('[redis] connection error', err));

// 4. Make `io` accessible to our routes
app.set('io', io);

// 5. Routes
app.use('/api', syncRouter);
app.use('/api', menuRouter);
app.get('/health', (_req, res) => res.json({ ok: true }));

// 6. Start the server
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`[backend] http://localhost:${PORT}`));