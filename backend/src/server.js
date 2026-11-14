// backend/src/server.js
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { pool } from './db.js'; // Import pool for the socket route
import syncRouter from './routes/sync.js';
import menuRouter from './routes/menu.js';
import adminRouter from './routes/admin.js';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Connect Redis
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const pubClient = createClient({ url: redisUrl });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()])
  .then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('[socket] Redis adapter connected');
  })
  .catch(err => console.error('[redis] connection error', err));

// Make io accessible to our routes (sync.js uses req.app.get('io'))
app.set('io', io);

// Routes
app.use('/api', syncRouter);
app.use('/api', menuRouter);
app.use('/api', adminRouter);
app.get('/health', (_req, res) => res.json({ ok: true }));

// 👇 SOCKET.IO CONNECTION HANDLER 👇
io.on('connection', (socket) => {
  console.log('[socket] client connected:', socket.id);

  // Rider sends location -> Backend broadcasts to everyone tracking
  socket.on('rider_location', async (data) => {
    socket.broadcast.emit('rider_location_update', data);

    // Update order status to ON_THE_WAY if it isn't already
    try {
      const result = await pool.query(
        `UPDATE orders SET status = 'ON_THE_WAY' WHERE id = $1 AND status != 'ON_THE_WAY' RETURNING id`,
        [data.orderId]
      );
      
      if (result.rowCount > 0) {
        // Notify customer that rider is on the way
        io.emit('order_status_update', { orderId: data.orderId, status: 'ON_THE_WAY' });
      }
    } catch (err) {
      console.error('[socket] Failed to update order status to ON_THE_WAY', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('[socket] client disconnected:', socket.id);
  });
});
// 👆 END SOCKET.IO CONNECTION HANDLER 👆

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`[backend] http://localhost:${PORT}`));