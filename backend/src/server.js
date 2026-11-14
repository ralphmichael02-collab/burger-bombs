// backend/src/server.js
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import syncRouter from './routes/sync.js';
import menuRouter from './routes/menu.js';
import adminRouter from './routes/admin.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', adminRouter);

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

// Socket.IO Real-time GPS Relay
  socket.on('rider_location', async (data) => {
    // Broadcast the GPS coordinates to the customer tracking the order
    socket.broadcast.emit('rider_location_update', data);

    // If this is the first ping, update the order status to ON_THE_WAY
    try {
      const { pool } = await import('./db.js'); // Dynamic import to use DB here
      const result = await pool.query(
        `UPDATE orders SET status = 'ON_THE_WAY' WHERE id = $1 AND status != 'ON_THE_WAY' RETURNING id`,
        [data.orderId]
      );
      // If the row was updated, notify the customer
      if (result.rowCount > 0) {
        io.emit('order_status_update', { orderId: data.orderId, status: 'ON_THE_WAY' });
      }
    } catch (err) {
      console.error('[socket] Failed to update order status to ON_THE_WAY', err);
    }
  });

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