Burger Bombs — Technical Documentation
Project: Offline-First Restaurant POS Prototype
Stack: React + Dexie.js + Express + PostgreSQL
Status: Phase 0 complete, Phase 1 in progress
Last Updated: 2026-11-15

Table of Contents
Project Journey & Decisions

What Has Been Built

Database Documentation

Backend Code Documentation

Frontend Code Documentation

Data Flow Walkthroughs

API Reference

Troubleshooting Log

Environment & Setup Reference

1. Project Journey & Decisions
1.1 Starting Point
The project began as a feasibility analysis of a proposed restaurant management system with seven subsystems:

Kiosk

POS (Point of Sale)

Kitchen Display

Inventory (with recipe-level BOM)

Delivery GPS Tracking

Admin Dashboard

Online Store

1.2 Key Architectural Decision: Offline-First
The critical decision was to build the system offline-first, meaning:

The frontend writes to a local database (IndexedDB) first

A background sync worker pushes changes to the server when online

No order is ever lost due to network failure

Why this matters for a Philippine restaurant: Internet reliability is inconsistent. A POS that requires constant cloud connectivity will lose sales and frustrate customers during outages.

1.3 Build Order Decision
We chose to build in this order:

Docker (database engine)

SQL Schema (data model)

Backend (API)

Frontend (UI + sync)

Why this order: Each layer depends on the one below it. The frontend needs an API to sync to; the API needs tables to write to; the tables need a database engine to run on.

1.4 Tool Choices & Rationale
Tool	Choice	Why
Local DB engine	PostgreSQL 16 in Docker	No installation headaches; matches production
Cache/broker	Redis 7 in Docker	Needed later for Kitchen Display Pub/Sub
Backend framework	Express 5	Minimal, well-documented
DB driver	pg (node-postgres)	Standard, connection pooling built-in
Local frontend DB	Dexie.js (IndexedDB wrapper)	Best-in-class offline storage for browsers
Build tool	Vite	Fast dev server, modern defaults
CSS	Tailwind CSS	Rapid UI prototyping
1.5 Problems Encountered & Fixed
Problem	Root Cause	Fix
PowerShell < redirect fails	PowerShell doesn't support input redirection	Used docker cp + psql -f, or Get-Content | docker exec -i
nodemon runs index.js	npm init -y set "main": "index.js"	Changed to "main": "src/server.js"
Cannot use import statement	"type": "commonjs" in package.json	Changed to "type": "module"
MODULE_NOT_FOUND for src/server.js	Files created in wrong folder (backend/ instead of backend/src/)	Moved files with Move-Item
SASL: client password must be a string	.env not loaded or DATABASE_URL undefined	Diagnosed: verify .env exists and dotenv.config() runs before Pool creation
2. What Has Been Built
2.1 Completed Components
text
✅ Docker infrastructure (PostgreSQL + Redis)
✅ SQL schema (3 tables)
✅ Backend Express server
✅ Idempotent sync endpoint
✅ Menu fetch endpoint
✅ Health check endpoint
✅ CORS configuration
✅ Database seeding (6 menu items)
✅ Backend verified working via curl
2.2 In Progress
text
🔄 Frontend React POS app
🔄 Dexie.js local database
🔄 Outbox pattern implementation
🔄 Background sync worker
2.3 File Tree (Current)
text
D:\burger-bombs\
├── docker-compose.yml
├── db\
│   └── schema.sql
└── backend\
    ├── .env
    ├── package.json
    ├── package-lock.json
    └── src\
        ├── db.js
        ├── server.js
        └── routes\
            ├── menu.js
            └── sync.js
3. Database Documentation
3.1 Table: menu_items
Stores the products the restaurant sells.

sql
CREATE TABLE IF NOT EXISTS menu_items (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL,
  available   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
Column	Type	Purpose
id	BIGSERIAL	Auto-increment primary key
name	TEXT	Product name (e.g., "Classic Burger")
price	NUMERIC(10,2)	Price in PHP, 2 decimal places
available	BOOLEAN	Whether item can be ordered (for "unavailable" watermark demo)
created_at	TIMESTAMPTZ	Audit timestamp
Why NUMERIC(10,2) not FLOAT: Money must be exact. FLOAT can produce 119.99999 for 120.00. NUMERIC stores exact decimals.

Why TIMESTAMPTZ not TIMESTAMP: TIMESTAMPTZ stores timezone-aware timestamps. Critical for a business that might later operate across timezones or for audit logs.

3.2 Table: orders
Stores actual customer orders.

sql
CREATE TABLE IF NOT EXISTS orders (
  id          BIGSERIAL PRIMARY KEY,
  sync_id     UUID UNIQUE NOT NULL,
  status      TEXT NOT NULL,
  total       NUMERIC(10,2) NOT NULL,
  items       JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
Column	Type	Purpose
id	BIGSERIAL	Auto-increment primary key
sync_id	UUID UNIQUE	The mutationId from the frontend — dedupe key
status	TEXT	PENDING, PREPARING, COMPLETED, CANCELLED
total	NUMERIC(10,2)	Order total in PHP
items	JSONB	The cart array stored as JSON
created_at	TIMESTAMPTZ	When the order was created (from client)
Why sync_id UUID UNIQUE: This is the critical idempotency field. If a sync retry sends the same order twice, the UNIQUE constraint prevents a duplicate row. Even if the application logic fails, the database enforces uniqueness.

Why items JSONB: The cart structure ([{id, name, price, qty}, ...]) is naturally JSON. Storing it as JSONB allows querying into it later (e.g., items @> '[{"name":"Fries"}]') without a separate order_lines table for the prototype. In production, this would likely normalize into order_items table.

3.3 Table: processed_mutations
The idempotency ledger — the most important table for the sync pattern.

sql
CREATE TABLE IF NOT EXISTS processed_mutations (
  mutation_id  UUID PRIMARY KEY,
  type         TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
Column	Type	Purpose
mutation_id	UUID PRIMARY KEY	Unique identifier for each action
type	TEXT	Action type (CREATE_ORDER, later UPDATE_STATUS, etc.)
processed_at	TIMESTAMPTZ	When the mutation was recorded
Why this table exists: Every mutation from the frontend includes a mutationId. Before processing, the backend tries to INSERT into this table. If the insert succeeds (rowCount = 1), it's a new mutation → process it. If it fails due to ON CONFLICT (rowCount = 0), it's a retry → return { ok: true, duplicate: true } without doing anything.

This is the entire idempotency story in one table.

3.4 Entity Relationship
text
menu_items (standalone)
     │
     │ (referenced in items JSONB, not FK)
     ▼
orders ──────────── sync_id ────────┐
     │                              │
     │ (created by)                 │ (same value)
     ▼                              ▼
processed_mutations ─────── mutation_id
There is no foreign key between orders and processed_mutations because both contain the same value (sync_id = mutation_id), but for different purposes:

orders.sync_id — business data (which order)

processed_mutations.mutation_id — idempotency tracking (did we process this already?)

4. Backend Code Documentation
4.1 backend/package.json
json
{
  "name": "burger-bombs-backend",
  "version": "1.0.0",
  "type": "module",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  },
  "dependencies": {
    "cors": "^2.8.6",
    "dotenv": "^18.0.10",
    "express": "^5.3.0",
    "pg": "^8.23.1"
  },
  "devDependencies": {
    "nodemon": "^3.1.11"
  }
}
Critical fields:

"type": "module" — Enables ES import syntax. Without this, Node uses CommonJS and throws Cannot use import statement outside a module.

"main": "src/server.js" — Tells nodemon (and Node tooling) where the entry point lives. Setting this to index.js (the npm default) caused the first crash.

4.2 backend/.env
env
PORT=4000
DATABASE_URL=postgres://burger_user:local_password@localhost:5432/burger_bombs_local
Format: postgres://USER:PASSWORD@HOST:PORT/DATABASE

Rules:

No spaces around =

No quotes around values

Must match the Docker container credentials exactly

When moving to cloud (Phase 2): Change DATABASE_URL to the Neon connection string. Nothing else changes.

4.3 backend/src/db.js
javascript
// backend/src/db.js
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => console.error('[pg] idle client error', err));
Purpose: Creates a connection pool to PostgreSQL.

Line-by-line:

Line	What it does
import pg from 'pg'	Imports the node-postgres library
import dotenv from 'dotenv'	Imports dotenv to load .env
dotenv.config()	Reads .env and populates process.env
new pg.Pool({...})	Creates a pool (reuses connections instead of opening one per request)
max: 10	Maximum 10 simultaneous connections
idleTimeoutMillis: 30000	Close idle connections after 30 seconds
pool.on('error', ...)	Logs connection errors without crashing the process
Why a pool: Opening a new PostgreSQL connection per HTTP request is slow (~50ms overhead). A pool reuses connections. With 10 max connections, you can serve roughly 10 concurrent queries — plenty for a prototype.

Why export const pool: Named export allows import { pool } from '../db.js' in routes. Cleaner than default export.

⚠️ Critical import order note: dotenv.config() must run before new pg.Pool(). In this file, it does. If you ever move dotenv.config() after the Pool creation, process.env.DATABASE_URL will be undefined and you'll get the SASL password error.

4.4 backend/src/routes/sync.js
javascript
// backend/src/routes/sync.js
import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.post('/sync', async (req, res) => {
  const { mutationId, type, payload } = req.body;

  if (!mutationId || !type || !payload) {
    return res.status(400).json({ error: 'mutationId, type, payload required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const claim = await client.query(
      `INSERT INTO processed_mutations (mutation_id, type)
       VALUES ($1, $2)
       ON CONFLICT (mutation_id) DO NOTHING
       RETURNING mutation_id`,
      [mutationId, type]
    );

    if (claim.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.json({ ok: true, duplicate: true });
    }

    if (type === 'CREATE_ORDER') {
      await client.query(
        `INSERT INTO orders (sync_id, status, total, items, created_at)
         VALUES ($1, 'PENDING', $2, $3, $4)`,
        [mutationId, payload.total, JSON.stringify(payload.items), payload.createdAt]
      );
    }

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[sync] error', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
Purpose: The entire sync contract between frontend and backend. One endpoint, handles all mutation types.

Flow explanation:

text
1. Extract mutationId, type, payload from request body
2. Validate presence (400 if missing)
3. Get a client from the pool (checkout a connection)
4. BEGIN transaction
5. Try to INSERT into processed_mutations
   ├── If rowCount = 1: this is NEW → continue
   └── If rowCount = 0 (ON CONFLICT): this is a DUPLICATE → ROLLBACK, return { ok: true, duplicate: true }
6. If type === 'CREATE_ORDER': INSERT into orders
7. COMMIT transaction
8. Return { ok: true }
9. On any error: ROLLBACK, return 500
10. Finally: release the client back to the pool
Why the transaction matters:

Without BEGIN / COMMIT:

If the INSERT INTO processed_mutations succeeds but INSERT INTO orders fails, the mutation is marked processed but no order exists → silent data loss.

If two identical requests arrive simultaneously, both might pass the ON CONFLICT check before either inserts → duplicate orders.

With the transaction, both inserts either succeed together or fail together. The UNIQUE constraint on processed_mutations.mutation_id ensures that only one simultaneous request can claim the mutation.

Why pool.connect() then client.release():

pool.query() is a shortcut that grabs a client, runs the query, and releases — but it can't hold a transaction across multiple queries. For BEGIN/COMMIT, you must hold a single client for the entire transaction. Hence pool.connect() and finally { client.release() }.

Why ON CONFLICT (mutation_id) DO NOTHING RETURNING mutation_id:

ON CONFLICT (mutation_id) — if a row with this mutation_id already exists, do this instead

DO NOTHING — don't insert, don't error, just skip

RETURNING mutation_id — only returns a row if the insert actually happened

So claim.rowCount === 0 means "a row with this mutation_id already existed" → duplicate. claim.rowCount === 1 means "we just inserted it" → first time.

Response shapes:

Scenario	Status	Body
Missing fields	400	{ error: "..." }
New mutation	200	{ ok: true }
Duplicate mutation	200	{ ok: true, duplicate: true }
Server error	500	{ error: "..." }
Frontend contract: The frontend's sync worker only cares about res.ok (HTTP 200). It doesn't care about duplicate: true — both responses are successes, so the outbox item is marked sent.

4.5 backend/src/routes/menu.js
javascript
// backend/src/routes/menu.js
import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/menu', async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, price::float, available FROM menu_items ORDER BY id'
  );
  res.json(rows);
});

export default router;
Purpose: Returns the menu as JSON.

Why price::float:

PostgreSQL's NUMERIC type is returned by pg as a string ("120.00") to preserve precision. If we send this to the frontend, JavaScript arithmetic like price * qty will do string multiplication and produce NaN or wrong results.

::float casts it to a JS number on the database side, so the frontend receives 120 (a number). For the prototype, this is fine. In production, you'd usually keep NUMERIC in the database and parse on the frontend with a money library.

Why _req (underscore): Signals "unused parameter" to linters. The menu endpoint has no query parameters.

4.6 backend/src/server.js
javascript
// backend/src/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import syncRouter from './routes/sync.js';
import menuRouter from './routes/menu.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', syncRouter);
app.use('/api', menuRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`[backend] http://localhost:${PORT}`));
Purpose: Express app setup and routing.

Middleware order matters:

Line	Purpose	Why this order
app.use(cors())	Allows cross-origin requests	Must be before routes so CORS headers are set on every response
app.use(express.json())	Parses application/json bodies into req.body	Must be before routes so req.body is populated
app.use('/api', syncRouter)	Mounts sync routes	Routes go after middleware
app.use('/api', menuRouter)	Mounts menu routes	Same
Why cors(): The Vite dev server runs on http://localhost:5173, the backend on http://localhost:4000. The browser treats these as different origins. Without CORS, every fetch from the frontend fails with a CORS error. cors() sets Access-Control-Allow-Origin: * on every response, allowing any origin. For a prototype this is fine; in production you'd restrict to your domain.

Mounting pattern:

router.post('/sync', ...) mounted at /api → final path /api/sync

router.get('/menu', ...) mounted at /api → final path /api/menu

Why import syncRouter from './routes/sync.js' with .js extension: ES modules on Node require file extensions in relative imports. Omitting .js works in some bundlers but fails in Node. Always include it.

process.env.PORT || 4000: Uses PORT from .env if set, falls back to 4000. Prevents crash if .env is missing.

5. Frontend Code Documentation
Status: Code provided, not yet tested end-to-end.

5.1 frontend/src/db.js — Dexie Setup
javascript
import Dexie from 'dexie';

export const db = new Dexie('BurgerBombsDB');

db.version(1).stores({
  menuItems:  '++id, name, price, available',
  orders:     '++id, syncId, status, createdAt, _syncStatus',
  syncOutbox: '++id, mutationId, type, status, createdAt',
});
Purpose: Defines the browser's local database.

Schema notation:

++id — auto-increment primary key (like SQL BIGSERIAL)

name, price, available — indexed fields (for fast queries)

Fields not listed (like items, total) are still stored — just not indexed

Three tables:

Table	Purpose
menuItems	Cached menu from backend (works offline after first fetch)
orders	Actual orders, saved locally first
syncOutbox	Queue of pending sync actions
Why _syncStatus (underscore prefix): Signals internal field. Values: 'pending' (not yet synced) or 'synced' (backend confirmed). Used by UI to show badges like "⏳" on unsynced orders.

5.2 frontend/src/services/orderService.js — Outbox Pattern
javascript
import { db } from '../db';

export async function createOrder(orderData) {
  const mutationId = crypto.randomUUID();
  const now = new Date().toISOString();

  return await db.transaction('rw', db.orders, db.syncOutbox, async () => {
    const localId = await db.orders.add({
      ...orderData,
      status: 'PENDING',
      createdAt: now,
      syncId: mutationId,
      _syncStatus: 'pending',
    });

    await db.syncOutbox.add({
      mutationId,
      type: 'CREATE_ORDER',
      payload: {
        ...orderData,
        localId,
        createdAt: now,
      },
      status: 'pending',
      retries: 0,
      createdAt: now,
    });

    return localId;
  });
}
Purpose: The only function the UI calls to create an order. Guarantees the order is saved locally and queued for sync, atomically.

Why db.transaction('rw', ...):

'rw' means read-write

db.orders, db.syncOutbox means only these two tables are in the transaction

Inside the callback, either both writes succeed or both fail — no partial writes

Why two writes:

db.orders.add() — the actual business data

db.syncOutbox.add() — the "to-do" note for the sync worker

If you only wrote to orders, the sync worker would need to scan every order on every tick (slow). With the outbox, the worker only reads pending items.

Why crypto.randomUUID(): Generates a v4 UUID in the browser. Available in all modern browsers. This is the mutationId that flows through to the backend's processed_mutations table.

Data echoed back to backend:

json
{
  "mutationId": "uuid",
  "type": "CREATE_ORDER",
  "payload": {
    "items": [...],
    "total": 240,
    "localId": 1,         // ← backend ignores, but useful for correlation
    "createdAt": "iso"
  }
}
5.3 frontend/src/services/syncService.js — Background Worker
javascript
import { db } from '../db';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const TICK_MS = 5000;
const MAX_RETRIES = 5;

let timer = null;
let running = false;

export function startSyncWorker() {
  if (timer) return;
  timer = setInterval(tick, TICK_MS);
  window.addEventListener('online', tick);
  console.log('[sync] worker started');
}

async function tick() {
  if (running) return;
  if (!navigator.onLine) {
    console.log('[sync] offline — skipping');
    return;
  }

  running = true;
  try {
    const pending = await db.syncOutbox
      .where('status').equals('pending')
      .toArray();

    for (const item of pending) {
      await pushOne(item);
    }
  } finally {
    running = false;
  }
}

async function pushOne(item) {
  try {
    const res = await fetch(`${API_BASE}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mutationId: item.mutationId,
        type: item.type,
        payload: item.payload,
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    await db.transaction('rw', db.syncOutbox, db.orders, async () => {
      await db.syncOutbox.update(item.id, {
        status: 'sent',
        sentAt: new Date().toISOString()
      });
      if (item.type === 'CREATE_ORDER' && item.payload.localId) {
        await db.orders.update(item.payload.localId, { _syncStatus: 'synced' });
      }
    });
  } catch (err) {
    const retries = (item.retries || 0) + 1;
    await db.syncOutbox.update(item.id, {
      retries,
      status: retries >= MAX_RETRIES ? 'failed' : 'pending',
      lastError: err.message,
    });
  }
}
Purpose: Background worker that drains the outbox to the backend.

Timing model:

Runs every 5 seconds (TICK_MS = 5000)

Also runs immediately when the browser fires the online event

Skips entirely if navigator.onLine is false

Why running flag: If a tick takes longer than 5 seconds (e.g., slow network), the next tick could start before the previous one finishes. The running flag prevents concurrent ticks from processing the same outbox items twice.

Retry logic:

On any failure (network, HTTP error), increment retries

After 5 retries (MAX_RETRIES = 5), mark as failed and stop retrying

Before that, leave as pending so the next tick tries again

Success path:

Backend returns 200

Update outbox item to status: 'sent'

Update the corresponding order's _syncStatus to 'synced'

import.meta.env.VITE_API_BASE: Vite exposes env vars that start with VITE_. Anything else is hidden from the client for security.

5.4 frontend/src/components/POS.jsx — Main Screen
javascript
import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { createOrder } from '../services/orderService';
import { startSyncWorker } from '../services/syncService';
import MenuList from './MenuList';
import Cart from './Cart';

export default function POS() {
  const [cart, setCart] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    startSyncWorker();
  }, []);

  const pendingSync = useLiveQuery(
    () => db.syncOutbox.where('status').equals('pending').count(),
    []
  );

  // ... rest of component
}
Purpose: Main POS screen — menu on left, cart on right, live sync counters on top.

Key hook: useLiveQuery:

This is from dexie-react-hooks. It:

Runs the query immediately

Re-runs automatically whenever the underlying table changes

Returns undefined on first render, then the result

So pendingSync updates in real-time as orders are created and synced — no manual refresh needed.

Why useEffect(() => { startSyncWorker() }, []): Starts the sync worker once when the POS mounts. The [] dependency array ensures it runs only once, not on every render.

Cart state management:

Cart is not stored in Dexie — it's ephemeral state in React. Only placed orders go to Dexie. This is intentional: abandoned carts shouldn't persist.

Demo feature: The header shows Pending sync: N. In the offline demo, you'll watch this number climb to 3 while offline, then drop to 0 after reconnecting.

5.5 frontend/src/components/MenuList.jsx — Menu Grid
javascript
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export default function MenuList({ onAdd }) {
  const items = useLiveQuery(() => db.menuItems.toArray(), []);

  if (!items) return <p>Loading menu…</p>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => item.available && onAdd(item)}
          disabled={!item.available}
          className={/* conditional styles */}
        >
          <div className="font-bold">{item.name}</div>
          <div className="text-sm text-gray-600">₱{item.price}</div>
          {!item.available && (
            <span className="...">UNAVAILABLE</span>
          )}
        </button>
      ))}
    </div>
  );
}
Purpose: Grid of menu items from the local Dexie cache.

Why this works offline: The menu is cached in db.menuItems from a previous fetch to /api/menu. If the network drops, the cache is used. New menu items won't appear offline, but existing items remain orderable.

Unavailable item handling: Disabled button + "UNAVAILABLE" badge. Demos the watermark feature.

5.6 frontend/src/components/Cart.jsx — Cart Display
Simple cart with add/subtract buttons and a place-order button. Cart is passed in as cart prop and updated via setCart — the parent (POS.jsx) owns the state.

5.7 frontend/src/App.jsx
javascript
import { useEffect } from 'react';
import POS from './components/POS';
import { refreshMenuFromBackend } from './db';

export default function App() {
  useEffect(() => { refreshMenuFromBackend(); }, []);
  return <POS />;
}
Purpose: Entry point. Fetches the menu once on load, then renders POS.

Why refreshMenuFromBackend() on mount: Populates Dexie with the latest menu from the backend. If offline, the old cache is used (function handles the catch internally).

6. Data Flow Walkthroughs
6.1 Online Order Flow (happy path)
text
1. Cashier clicks "Place Order"
2. POS.jsx calls createOrder({ items, total })
3. orderService.js:
   ├── Generates mutationId (UUID)
   ├── BEGIN transaction on Dexie
   ├── INSERT into db.orders (with _syncStatus: 'pending', syncId: mutationId)
   ├── INSERT into db.syncOutbox (with mutationId, type: 'CREATE_ORDER')
   └── COMMIT
4. useLiveQuery in POS.jsx detects change
   └── pendingSync count updates to 1
5. Within 5 seconds, syncService.tick() runs:
   ├── navigator.onLine is true → proceed
   ├── Reads pending items from syncOutbox
   ├── POSTs to http://localhost:4000/api/sync
6. Backend sync.js:
   ├── BEGIN transaction
   ├── INSERT INTO processed_mutations (succeeds, rowCount=1)
   ├── INSERT INTO orders
   ├── COMMIT
   └── Returns { ok: true }
7. syncService.pushOne() success:
   ├── UPDATE syncOutbox SET status='sent'
   ├── UPDATE orders SET _syncStatus='synced'
8. useLiveQuery detects change
   └── pendingSync count updates to 0
9. Cashier sees "Pending sync: 0" → synced ✅
6.2 Offline Order Flow
text
1. DevTools → Network → Offline
2. Cashier clicks "Place Order" (×3)
3. Each call to createOrder():
   ├── Writes to Dexie locally (works offline — no network needed)
   └── Adds to outbox
4. pendingSync count climbs to 3
5. syncService.tick() runs every 5 seconds:
   └── navigator.onLine is false → skip
   └── Logs "[sync] offline — skipping"
6. Cashier sees orders on screen, but they're not on the server yet
7. Network restored
   └── 'online' event fires → tick() immediately
   └── Also next scheduled tick
8. All 3 outbox items POSTed sequentially
9. Backend processes all 3 (each unique mutationId)
10. pendingSync drops to 0
6.3 Idempotency Flow (retry scenario)
text
1. Cashier creates order A (mutationId: "abc-123")
2. createOrder writes to Dexie + outbox
3. syncService.pushOne sends POST /api/sync { mutationId: "abc-123" }
4. Network is slow — request times out on client side
   └── pushOne catches error, increments retries to 1
   └── Leaves outbox item as 'pending'
5. Next tick (5 seconds later) retries
   └── POST /api/sync { mutationId: "abc-123" } (same ID)
6. Backend sync.js:
   ├── INSERT INTO processed_mutations VALUES ("abc-123", ...)
   ├── But wait — "abc-123" already exists from the first attempt!
   ├── ON CONFLICT DO NOTHING → rowCount = 0
   ├── ROLLBACK (no order inserted)
   └── Returns { ok: true, duplicate: true }
7. syncService.pushOne sees res.ok === true → success
   └── Marks outbox item as 'sent'
   └── Updates order._syncStatus = 'synced'
8. Result: exactly one order in the database ✅
Why this matters: Without idempotency, step 5 would create a second order (because the client thinks the first failed). With idempotency, the backend recognizes the duplicate and skips. The order is created exactly once, regardless of retries.

7. API Reference
7.1 GET /health
Purpose: Health check.

Request: None

Response:

json
{ "ok": true }
Use case: Monitoring, smoke testing.

7.2 GET /api/menu
Purpose: Fetch all menu items.

Request: None

Response:

json
[
  { "id": 1, "name": "Classic Burger", "price": 120, "available": true },
  { "id": 2, "name": "Cheese Burger",  "price": 140, "available": true },
  { "id": 3, "name": "Bacon Burger",   "price": 160, "available": false }
]
Notes:

price is a number (float), not a string

available: false items should be shown as disabled in the UI

Ordered by id ascending

7.3 POST /api/sync
Purpose: Apply a client mutation, idempotently.

Request body:

json
{
  "mutationId": "uuid-v4",
  "type": "CREATE_ORDER",
  "payload": {
    "items": [
      { "id": 1, "name": "Classic Burger", "price": 120, "qty": 2 }
    ],
    "total": 240,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
Field reference:

Field	Type	Required	Purpose
mutationId	UUID string	✅	Unique ID for this action (idempotency key)
type	string	✅	Currently "CREATE_ORDER"; extendable
payload.items	array	✅	Cart line items
payload.total	number	✅	Order total in PHP
payload.createdAt	ISO string	✅	When the order was created on the client
Response — New mutation (200):

json
{ "ok": true }
Response — Duplicate mutation (200):

json
{ "ok": true, "duplicate": true }
Response — Validation error (400):

json
{ "error": "mutationId, type, payload required" }
Response — Server error (500):

json
{ "error": "detailed error message" }
Current supported type values:

Type	Effect
CREATE_ORDER	Inserts a row into orders with status PENDING
Future types (planned):

UPDATE_ORDER_STATUS — e.g., mark order as PREPARING or COMPLETED

CANCEL_ORDER — reverse stock, update status

ADJUST_INVENTORY — manual stock count adjustment

8. Troubleshooting Log
8.1 PowerShell < redirection fails
Symptom:

text
The '<' operator is reserved for future use.
Cause: PowerShell doesn't support < input redirection (only bash/cmd do).

Fixes:

Option A — use cmd:

powershell
cmd /c "docker exec -i burger-bombs-postgres-1 psql -U burger_user -d burger_bombs_local < db/schema.sql"
Option B — use Get-Content pipe:

powershell
Get-Content db/schema.sql | docker exec -i burger-bombs-postgres-1 psql -U burger_user -d burger_bombs_local
Option C — copy into container (most reliable):

powershell
docker cp db/schema.sql burger-bombs-postgres-1:/tmp/schema.sql
docker exec -i burger-bombs-postgres-1 psql -U burger_user -d burger_bombs_local -f /tmp/schema.sql
8.2 nodemon runs index.js instead of src/server.js
Symptom:

text
[nodemon] starting `node src/server.js index.js`
Error: Cannot find module '...\index.js'
Cause: npm init -y created "main": "index.js" in package.json. nodemon appends main to the script.

Fix: Change "main": "index.js" → "main": "src/server.js".

8.3 Cannot use import statement outside a module
Symptom:

text
SyntaxError: Cannot use import statement outside a module
Cause: "type": "commonjs" in package.json (the npm default).

Fix: Change "type": "commonjs" → "type": "module".

8.4 MODULE_NOT_FOUND for src/server.js
Symptom:

text
Error: Cannot find module 'D:\burger-bombs\backend\src\server.js'
Cause: Files were created in backend/ root instead of backend/src/.

Fix:

powershell
Move-Item server.js src\server.js
Move-Item routes src\routes
Verify with tree /F /A src — should show db.js, server.js, routes/menu.js, routes/sync.js.

8.5 SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string
Symptom:

html
Error: SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string
Cause: process.env.DATABASE_URL is undefined when new pg.Pool() runs. Usually means .env is missing or not loaded.

Diagnosis steps:

Verify .env exists:

powershell
Get-Content .env
Should show:

text
PORT=4000
DATABASE_URL=postgres://burger_user:local_password@localhost:5432/burger_bombs_local
Verify dotenv.config() runs before Pool creation:

In src/db.js, dotenv.config() must be above new pg.Pool().

In src/server.js, since import statements are hoisted, importing routes/sync.js (which imports db.js) causes db.js to run — and db.js calls dotenv.config() at the top. So it should work. If it doesn't, add dotenv.config() at the very top of db.js (it may already be there).

Verify DATABASE_URL is actually being read:

powershell
node --input-type=module -e "import 'dotenv/config'; console.log(process.env.DATABASE_URL)"
Should print the connection string, not undefined.

Common .env mistakes:

Mistake	Symptom	Fix
Quotes around value	URL includes literal quotes	Remove quotes
Spaces around =	Value includes spaces	KEY=value, no spaces
Wrong password	Connection refused	Match Docker compose credentials
Missing file	undefined	Create .env
BOM in file	undefined or parse error	Re-save as UTF-8 without BOM
9. Environment & Setup Reference
9.1 Docker Container Credentials
Setting	Value
PostgreSQL image	postgres:16-alpine
Container name	burger-bombs-postgres-1
User	burger_user
Password	local_password
Database	burger_bombs_local
Port	5432 (host) → 5432 (container)
Redis image	redis:7-alpine
Redis port	6379
9.2 Backend Environment (.env)
env
PORT=4000
DATABASE_URL=postgres://burger_user:local_password@localhost:5432/burger_bombs_local
9.3 Frontend Environment (.env)
env
VITE_API_BASE=http://localhost:4000
9.4 Useful Commands
Start containers:

powershell
docker-compose up -d
Stop containers:

powershell
docker-compose down
Check container status:

powershell
docker ps
Open psql inside the container:

powershell
docker exec -it burger-bombs-postgres-1 psql -U burger_user -d burger_bombs_local
List tables:

powershell
docker exec -i burger-bombs-postgres-1 psql -U burger_user -d burger_bombs_local -c "\dt"
Count orders:

powershell
docker exec -i burger-bombs-postgres-1 psql -U burger_user -d burger_bombs_local -c "SELECT COUNT(*) FROM orders;"
Count processed mutations:

powershell
docker exec -i burger-bombs-postgres-1 psql -U burger_user -d burger_bombs_local -c "SELECT COUNT(*) FROM processed_mutations;"
Start backend dev server:

powershell
cd backend
npm run dev
Test backend health:

powershell
curl http://localhost:4000/health
10. Lessons Learned
10.1 The Offline-First Mindset
The traditional mental model: "Send data to server, show success on response."

The offline-first model: "Save data locally, show success immediately, sync in background."

The second model is what makes restaurant POS software reliable. It trades one thing (delayed visibility of the order on the server) for a much more valuable thing (zero risk of losing an order).

10.2 Idempotency is Not Optional
Without idempotency, every network retry is a potential duplicate order. With idempotency (processed_mutations + ON CONFLICT), retries are safe. This is the single most important backend pattern in the whole system.

10.3 Verify Files Before Debugging Code
The MODULE_NOT_FOUND errors looked like code bugs but were actually file-placement bugs. Always tree /F or Get-ChildItem first to confirm what's actually on disk before debugging what the code does.

10.4 PowerShell ≠ Bash
A significant portion of troubleshooting was PowerShell syntax (< redirect, cmd1 && cmd2, export VAR=...). Future sessions should default to PowerShell-friendly commands on Windows.

10.5 Env Loading Order in ESM
In ES modules, import statements are hoisted and run before the module body. This means if db.js calls dotenv.config() at the top, and server.js imports routes/sync.js (which imports db.js), the dotenv.config() in db.js runs before the dotenv.config() in server.js — which is actually what we want, since Pool is created in db.js. But if someone later reorders things, the DATABASE_URL could be undefined when Pool is created, causing the SASL error. Always call dotenv.config() at the top of the file that uses process.env.

11. Next Steps (Phase 1 Completion)
Scaffold frontend:

powershell
cd burger-bombs
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install dexie dexie-react-hooks tailwindcss postcss autoprefixer
npx tailwindcss init -p
Create frontend/.env with VITE_API_BASE=http://localhost:4000.

Create frontend/src/db.js (from Section 5.1).

Create frontend/src/services/orderService.js (Section 5.2).

Create frontend/src/services/syncService.js (Section 5.3).

Create components (POS.jsx, MenuList.jsx, Cart.jsx) — Sections 5.4–5.6.

Update App.jsx (Section 5.7).

Run the three-terminal setup:

Terminal 1: docker-compose up -d

Terminal 2: cd backend && npm run dev

Terminal 3: cd frontend && npm run dev

Run the demo:

Open http://localhost:5173

Place an order → watch pending sync count

Go offline → place 3 orders → watch pending climb

Go online → watch pending drop → verify no duplicates in DB

End of documentation.

This document covers Phase 0 (complete) and Phase 1 (in progress). Update this file as new phases are added.

Burger Bombs — Phase 2 through Phase 5: Complete Build Guide
Prerequisite: Phase 0 (Docker + SQL + Backend) and Phase 1 (Offline-First Frontend) are working. You can place an order locally, watch it sync to the backend, and verify it in PostgreSQL.

This guide takes you from a local-only prototype to a full hybrid system you can demo to restaurants. Each phase is independently demoable — you can stop after any phase and still have something impressive to show.

Phase 2 — Cloud Database & Online Ordering
Goal: Move the PostgreSQL database from Docker to Neon (free cloud), deploy the backend, and build a customer-facing online store that shares the same database as your local POS.

Why this matters for the demo: You can show a restaurant owner: "An order placed on the customer's phone at 2:00 PM appears on your POS screen at 2:00:01 PM — even though the customer is not on your Wi-Fi."

Step 2.1 — Create a Neon Account and Database
Go to https://neon.tech and sign up with GitHub (free).

Create a project named burger-bombs.

Select the region closest to the Philippines — AWS ap-southeast-1 (Singapore).

Neon creates a database named neondb by default. You can keep it or rename to burger_bombs.

Copy the connection string. In the Neon Console, click Connect → Connection string. You will see two variants:

Pooled (hostname contains -pooler): postgresql://user:pass@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

Direct (no -pooler): postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

Use the pooled connection string for your Express backend. Neon's pooled connections route through PgBouncer, which handles up to 10,000 client connections — far more than your backend will ever open, but it protects you from connection exhaustion if the backend restarts rapidly.

Why sslmode=require is mandatory: Neon requires TLS. If you strip it, the connection will fail with an SSL error.

Step 2.2 — Migrate the Schema to Neon
Your local schema.sql needs to run against Neon. From your project root:

powershell
# Copy the schema content and run it via psql (install PostgreSQL client tools if needed)
# Or use Neon's SQL Editor in the browser — paste the entire schema.sql content and click Run
Verify tables exist:

sql
-- In Neon SQL Editor
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
-- Expected: menu_items, orders, processed_mutations
Seed menu items:

sql
INSERT INTO menu_items (name, price, available) VALUES
  ('Classic Burger', 120.00, TRUE),
  ('Cheese Burger',  140.00, TRUE),
  ('Double Patty',   180.00, TRUE),
  ('Bacon Burger',   160.00, FALSE),
  ('Fries',           60.00, TRUE),
  ('Coke',            40.00, TRUE);
Step 2.3 — Point the Backend at Neon
Edit backend/.env:

env
PORT=4000
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
The only change is the DATABASE_URL value. Your backend/src/db.js already reads process.env.DATABASE_URL and passes it to pg.Pool — no code changes needed. This is the payoff of the earlier abstraction.

Restart the backend:

powershell
cd backend
npm run dev
Test:

powershell
curl http://localhost:4000/api/menu
# → Menu items from Neon, not Docker
Verify sync writes to Neon:

powershell
curl -X POST http://localhost:4000/api/sync `
  -H "Content-Type: application/json" `
  -d '{\"mutationId\":\"22222222-2222-2222-2222-222222222222\",\"type\":\"CREATE_ORDER\",\"payload\":{\"total\":120,\"items\":[{\"id\":1,\"name\":\"Classic Burger\",\"price\":120,\"qty\":1}],\"createdAt\":\"2025-01-01T00:00:00Z\"}}'
Then in Neon SQL Editor:

sql
SELECT * FROM orders;
-- → One row with sync_id = '2222...'
Troubleshooting: If you get SASL: client password must be a string, the .env file is not being loaded. Verify dotenv.config() runs before new pg.Pool() in db.js (it does in the provided code). Also verify the Neon password has no special characters that PowerShell mangles — if it does, URL-encode it (e.g., @ becomes %40).

Step 2.4 — Deploy the Backend (Render Free Tier)
Your local backend is fine for demos, but the online store needs a publicly reachable API. Deploy to Render's free tier.

Push your backend/ folder to a GitHub repository.

Go to https://render.com → New → Web Service → connect your repo.

Settings:

Root Directory: backend

Build Command: npm install

Start Command: npm start

Environment: Node

Add environment variable:

DATABASE_URL = your Neon pooled connection string

Click Deploy.

Free tier limitation: Render spins down after 15 minutes of inactivity. The first request after spin-down takes ~30 seconds. For a demo, keep the tab open or hit /health every 10 minutes. For production, upgrade to Starter ($7/month) or keep the backend on-premise and only expose the online-store API.

Verify:

powershell
curl https://burger-bombs-backend.onrender.com/health
# → {"ok":true}
Step 2.5 — Build the Online Store
Create a new route in your React frontend (frontend/src/components/OnlineStore.jsx):

jsx
import { useState, useEffect } from 'react';
import { db } from '../db';
import { createOrder } from '../services/orderService';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function OnlineStore() {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/menu`)
      .then(r => r.json())
      .then(setMenu)
      .catch(() => db.menuItems.toArray().then(setMenu)); // fallback to Dexie cache
  }, []);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(x => x.id === item.id);
      return existing
        ? prev.map(x => x.id === item.id ? { ...x, qty: x.qty + 1 } : x)
        : [...prev, { ...item, qty: 1 }];
    });
  };

  const placeOrder = async () => {
    if (!customerName.trim()) return alert('Enter your name');
    await createOrder({
      items: cart,
      total: cart.reduce((s, c) => s + c.price * c.qty, 0),
      customerName,
      channel: 'ONLINE',
    });
    setCart([]);
    alert('Order placed! It will appear on the kitchen screen shortly.');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Order Online — Burger Bombs</h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {menu.filter(m => m.available).map(item => (
          <button key={item.id} onClick={() => addToCart(item)}
            className="p-4 bg-white rounded shadow text-left hover:bg-yellow-50">
            <div className="font-bold">{item.name}</div>
            <div className="text-gray-600">₱{item.price}</div>
          </button>
        ))}
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-bold mb-2">Your Order</h2>
        {cart.length === 0 && <p className="text-gray-500">No items yet.</p>}
        {cart.map(c => (
          <div key={c.id} className="flex justify-between py-1">
            <span>{c.name} × {c.qty}</span>
            <span>₱{c.price * c.qty}</span>
          </div>
        ))}
        <div className="border-t mt-2 pt-2 font-bold flex justify-between">
          <span>Total</span>
          <span>₱{cart.reduce((s, c) => s + c.price * c.qty, 0)}</span>
        </div>
        <input
          className="w-full border p-2 mt-3 rounded"
          placeholder="Your name"
          value={customerName}
          onChange={e => setCustomerName(e.target.value)}
        />
        <button onClick={placeOrder} disabled={cart.length === 0}
          className="w-full mt-2 bg-yellow-500 text-white font-bold py-2 rounded disabled:bg-gray-300">
          Place Order
        </button>
      </div>
    </div>
  );
}
Wire it into App.jsx with a simple route switcher:

jsx
import { useState, useEffect } from 'react';
import POS from './components/POS';
import OnlineStore from './components/OnlineStore';
import { refreshMenuFromBackend } from './db';

export default function App() {
  const [view, setView] = useState('pos');
  useEffect(() => { refreshMenuFromBackend(); }, []);

  return (
    <div>
      <nav className="bg-gray-800 text-white p-2 flex gap-4">
        <button onClick={() => setView('pos')} className={view==='pos' ? 'font-bold' : ''}>POS</button>
        <button onClick={() => setView('store')} className={view==='store' ? 'font-bold' : ''}>Online Store</button>
      </nav>
      {view === 'pos' ? <POS /> : <OnlineStore />}
    </div>
  );
}
Important: The online store uses the same createOrder() function and the same Dexie + outbox pattern. An order placed online is saved locally first, then synced to Neon. This means even the online store works if the customer's phone briefly loses signal — the order queues and syncs when connectivity returns.

Step 2.6 — Deploy the Frontend to Vercel
Push the frontend/ folder to GitHub.

Go to https://vercel.com → Add New → Project → import the repo.

Settings:

Framework Preset: Vite

Root Directory: frontend

Build Command: npm run build

Output Directory: dist

Add environment variable:

VITE_API_BASE = https://burger-bombs-backend.onrender.com (your Render URL)

Click Deploy.

Vercel reads environment variables prefixed with VITE_ and injects them into import.meta.env at build time. Because VITE_API_BASE is baked into the bundle, changing it later requires a redeploy — it is not read at runtime.

Update CORS on the backend:

In backend/src/server.js, replace app.use(cors()) with:

javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://burger-bombs.vercel.app', // your Vercel URL
  ],
}));
Redeploy the backend. Otherwise the browser will block requests from your Vercel domain.

Phase 2 Demo Script
Open the Vercel URL on your phone (or a second laptop).

Navigate to Online Store, add a burger, enter a name, click Place Order.

Watch the Neon SQL Editor: SELECT * FROM orders ORDER BY id DESC LIMIT 1; → new row.

Open the local POS on your laptop (running on Docker + local backend OR pointed at Neon).

The order appears within 5 seconds via the sync worker.

Talking point for restaurants: "A customer orders from their phone at the table. The order goes to the cloud, then down to your kitchen — no WhatsApp screenshots, no manual encoding."

Phase 3 — Kitchen Display + Real-Time
Goal: Build a kitchen screen that receives orders instantly via Socket.IO + Redis Pub/Sub. When an order is created (from POS or online store), the kitchen screen updates without refreshing.

Why Redis Pub/Sub: Socket.IO alone handles WebSocket connections within a single Node process. Redis Pub/Sub allows multiple backend instances to share events — important when you later scale horizontally or run separate processes for POS API and Kitchen API.

Step 3.1 — Install Dependencies
powershell
cd backend
npm install socket.io @socket.io/redis-adapter redis
Step 3.2 — Update backend/src/server.js
Replace the current file with:

javascript
// backend/src/server.js
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import cors from 'cors';
import dotenv from 'dotenv';
import syncRouter from './routes/sync.js';
import menuRouter from './routes/menu.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.IO with CORS for Vite + Vercel
const io = new SocketIOServer(server, {
  cors: { origin: '*' }, // tighten in production
});

// Redis Pub/Sub for multi-instance scaling
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const pubClient = createClient({ url: REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));
console.log('[redis] connected and adapter attached');

// Middleware
app.use(cors());
app.use(express.json());

// Make `io` available to routes via app.locals
app.locals.io = io;

// Routes
app.use('/api', syncRouter);
app.use('/api', menuRouter);
app.get('/health', (_req, res) => res.json({ ok: true }));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  // Kitchen screens join a room called "kitchen"
  socket.on('join:kitchen', () => {
    socket.join('kitchen');
    console.log(`[socket] ${socket.id} joined kitchen room`);
  });

  // Riders join a room named after their order
  socket.on('join:order', (orderId) => {
    socket.join(`order:${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[socket] disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`[backend] http://localhost:${PORT}`));
Key changes:

app.listen becomes server.listen — Socket.IO attaches to the HTTP server, not Express

io.adapter(createAdapter(pubClient, subClient)) enables cross-instance event delivery

app.locals.io = io lets routes emit events without circular imports

Step 3.3 — Emit Events from sync.js
In backend/src/routes/sync.js, after the COMMIT and before res.json({ ok: true }):

javascript
// After successful order creation
if (type === 'CREATE_ORDER') {
  const order = await client.query(
    `INSERT INTO orders (sync_id, status, total, items, created_at)
     VALUES ($1, 'PENDING', $2, $3, $4)
     RETURNING *`,
    [mutationId, payload.total, JSON.stringify(payload.items), payload.createdAt]
  );

  // Emit to kitchen after commit
  const io = req.app.locals.io;
  if (io) {
    io.to('kitchen').emit('order:new', {
      id: order.rows[0].id,
      items: payload.items,
      total: payload.total,
      status: 'PENDING',
      createdAt: payload.createdAt,
    });
  }
}
Why emit after COMMIT: If you emit before the transaction commits and the commit fails, the kitchen screen shows an order that doesn't exist in the database. Emitting after commit guarantees the order is durable.

Step 3.4 — Configure Redis Connection
Add to backend/.env:

env
REDIS_URL=redis://localhost:6379
Your Docker Compose already runs Redis on port 6379 — this connects to it.

For Render deployment: Render does not provide free managed Redis. Options:

Upstash Redis (free tier: 10,000 commands/day, 256 MB) — works with rediss:// URL

Railway Redis ($5 credit/month)

For demos: Run Redis locally and expose it via a tunneling tool (not recommended for production)

For the prototype, keep Redis local and run the backend locally for the Kitchen Display demo. The online store API can run on Render without Redis — it just won't push real-time events to the kitchen unless the kitchen is connected to the local backend.

Step 3.5 — Build the Kitchen Display
Create kitchen-display/ as a separate Vite React app:

powershell
cd burger-bombs
npm create vite@latest kitchen-display -- --template react
cd kitchen-display
npm install socket.io-client
kitchen-display/src/App.jsx:

jsx
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const socket = io(API_BASE, { transports: ['websocket', 'polling'] });

export default function App() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    socket.emit('join:kitchen');

    socket.on('order:new', (order) => {
      setOrders(prev => [order, ...prev]);
      // Optional: play a sound
      new Audio('/ding.mp3').play().catch(() => {});
    });

    return () => socket.off('order:new');
  }, []);

  const markDone = (id) => {
    setOrders(prev => prev.filter(o => o.id !== id));
    // In production: emit an event to update order status in DB
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <h1 className="text-3xl font-bold mb-4">🔥 Kitchen Display</h1>
      {orders.length === 0 && (
        <p className="text-gray-400 text-xl">Waiting for orders…</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map(order => (
          <div key={order.id} className="bg-yellow-600 rounded-lg p-4 shadow-lg">
            <div className="flex justify-between items-start">
              <span className="text-sm text-yellow-200">Order #{order.id}</span>
              <span className="text-xs text-yellow-200">
                {new Date(order.createdAt).toLocaleTimeString()}
              </span>
            </div>
            <ul className="mt-2 space-y-1">
              {order.items.map((item, i) => (
                <li key={i} className="text-lg font-bold">
                  {item.qty}× {item.name}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between items-center">
              <span className="font-bold">₱{order.total}</span>
              <button
                onClick={() => markDone(order.id)}
                className="bg-green-600 px-3 py-1 rounded text-sm font-bold"
              >
                DONE
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
kitchen-display/.env:

env
VITE_API_BASE=http://localhost:4000
Run it:

powershell
cd kitchen-display
npm run dev
# → http://localhost:5174 (Vite picks the next port)
Open http://localhost:5174 in a full-screen browser on a tablet or second monitor. Place an order from the POS — it appears instantly.

Phase 3 Demo Script
Open POS at http://localhost:5173 on one screen.

Open Kitchen Display at http://localhost:5174 on another screen (or a tablet on the same network).

Place an order on the POS.

The order appears on the Kitchen Display within ~100ms — no refresh, no polling.

Click DONE on the kitchen screen — the card disappears.

Place an order from the Online Store (Vercel URL). The kitchen screen also receives it (because both go through the same createOrder → sync → backend → Socket.IO path).

Talking point for restaurants: "Your kitchen staff never touches a printer. Orders appear on a screen the instant they're placed, from any channel. No more lost tickets, no more shouting."

Phase 4 — Delivery GPS Tracking
Goal: A rider opens a mobile web page on their phone. Their GPS location streams to the customer's tracking page via Socket.IO, shown on a Leaflet map with OpenStreetMap tiles (free, no API key).

Why Leaflet + OSM: Zero cost, no API key, no rate limits. Production systems use exactly this stack for real-time rider tracking.

Step 4.1 — Install Leaflet
powershell
cd frontend
npm install leaflet react-leaflet
Add Leaflet CSS to frontend/src/index.css:

css
@import 'leaflet/dist/leaflet.css';
Step 4.2 — Rider View
Create frontend/src/components/RiderView.jsx:

jsx
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function RiderView() {
  const [orderId, setOrderId] = useState('');
  const [tracking, setTracking] = useState(false);
  const [lastSent, setLastSent] = useState(null);

  useEffect(() => {
    if (!tracking || !orderId) return;

    const socket = io(API_BASE);
    socket.emit('join:order', orderId);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        socket.emit('rider:location', {
          orderId,
          lat: latitude,
          lng: longitude,
          timestamp: new Date().toISOString(),
        });
        setLastSent(new Date().toLocaleTimeString());
      },
      (err) => console.error('[geo]', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      socket.disconnect();
    };
  }, [tracking, orderId]);

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">🛵 Rider Tracking</h1>
      <input
        className="w-full border p-2 rounded mb-2"
        placeholder="Order ID (e.g., 5)"
        value={orderId}
        onChange={e => setOrderId(e.target.value)}
      />
      <button
        onClick={() => setTracking(t => !t)}
        className={`w-full py-2 rounded font-bold text-white ${
          tracking ? 'bg-red-600' : 'bg-green-600'
        }`}
      >
        {tracking ? 'Stop Tracking' : 'Start Tracking'}
      </button>
      {lastSent && (
        <p className="text-sm text-gray-600 mt-2">
          Last location sent: {lastSent}
        </p>
      )}
    </div>
  );
}
Key design decisions:

watchPosition (not getCurrentPosition) — continuously streams location as the rider moves

enableHighAccuracy: true — uses GPS, not just cell tower triangulation

maximumAge: 5000 — accepts locations up to 5 seconds old (prevents blocking on a fresh fix)

Socket.IO join:order room — scopes location updates to only the customer tracking that order

Step 4.3 — Customer Tracking View
Create frontend/src/components/TrackingView.jsx:

jsx
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { io } from 'socket.io-client';
import L from 'leaflet';

// Fix Leaflet default marker icon path (Vite issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function TrackingView() {
  const [orderId, setOrderId] = useState('');
  const [position, setPosition] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    if (!orderId) return;

    const socket = io(API_BASE);
    socket.emit('join:order', orderId);

    socket.on('rider:location', ({ lat, lng }) => {
      setPosition([lat, lng]);
      setLastUpdate(new Date().toLocaleTimeString());
    });

    return () => {
      socket.off('rider:location');
      socket.disconnect();
    };
  }, [orderId]);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">📍 Track Your Delivery</h1>
      <input
        className="w-full border p-2 rounded mb-4"
        placeholder="Enter your Order ID"
        value={orderId}
        onChange={e => setOrderId(e.target.value)}
      />

      <div className="h-96 rounded overflow-hidden shadow">
        <MapContainer
          center={[14.5995, 120.9842]} // Manila default
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {position && (
            <Marker position={position}>
              <Popup>🛵 Your rider is here</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <p className="text-sm text-gray-600 mt-2">
        {lastUpdate
          ? `Last updated: ${lastUpdate}`
          : 'Waiting for rider location…'}
      </p>
    </div>
  );
}
Why the Leaflet icon fix: Vite's bundler rewrites asset paths, which breaks Leaflet's default marker icon URL. Hardcoding the CDN URLs is the simplest fix for a prototype.

Why show "Last updated": GPS can drop (tunnel, low battery, weak signal). Showing the timestamp is honest — the customer knows if the dot is stale rather than assuming the rider is stationary.

Step 4.4 — Wire Rider Events into the Backend
In backend/src/server.js, inside the io.on('connection') block, add:

javascript
socket.on('rider:location', (data) => {
  // Forward to the customer tracking this order
  io.to(`order:${data.orderId}`).emit('rider:location', data);
  console.log(`[rider] order ${data.orderId} → ${data.lat},${data.lng}`);
});
Why not store locations in PostgreSQL: For a prototype, location history is not needed. If you add delivery analytics later, write each update to a delivery_locations table (order_id, lat, lng, recorded_at).

Phase 4 Demo Script
On your laptop, open TrackingView, enter order ID 5, and leave it on the map.

On your phone (same network), open RiderView, enter order ID 5, and click Start Tracking.

Allow the browser's location permission.

Walk around — the marker on the laptop map moves in real time.

Turn off the phone's Wi-Fi (simulate losing signal) — the marker stops moving, and "Last updated" stops ticking.

Turn Wi-Fi back on — the marker resumes.

Talking point for restaurants: "Customers stop calling to ask 'Where's my order?' They open a link and see the rider on a map. The rider doesn't need a special app — just a browser on their phone."

Phase 5 — Kiosk, Recipe BOM & Admin Dashboard
Goal: A self-service kiosk that prints a QR receipt, a recipe-level BOM inventory system that deducts ingredients per sale, and an admin dashboard for sales and stock oversight.

This is the most complex phase. It is optional and should be built last — only after Phases 2–4 are stable. For a demo, you can build a simplified version of each.

Step 5.1 — Kiosk with QR Receipt
Install QR libraries:

powershell
cd frontend
npm install react-qr-code html5-qrcode
Kiosk UI (frontend/src/components/Kiosk.jsx):

jsx
import { useState } from 'react';
import QRCode from 'react-qr-code';
import { db } from '../db';
import { createOrder } from '../services/orderService';

export default function Kiosk() {
  const [step, setStep] = useState('menu'); // menu | cart | receipt
  const [cart, setCart] = useState([]);
  const [orderId, setOrderId] = useState(null);
  const [menu, setMenu] = useState([]);

  // Load menu from Dexie cache
  useState(() => { db.menuItems.toArray().then(setMenu); }, []);

  const placeOrder = async () => {
    const id = await createOrder({
      items: cart,
      total: cart.reduce((s, c) => s + c.price * c.qty, 0),
      channel: 'KIOSK',
    });
    setOrderId(id);
    setStep('receipt');
  };

  if (step === 'receipt') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-bold mb-4">✅ Order Placed!</h1>
        <p className="text-gray-600 mb-6">Show this QR at the counter</p>
        <QRCode value={String(orderId)} size={256} />
        <p className="mt-4 text-lg font-bold">Order #{orderId}</p>
        <button
          onClick={() => { setCart([]); setStep('menu'); setOrderId(null); }}
          className="mt-8 bg-yellow-500 text-white font-bold py-3 px-8 rounded"
        >
          New Order
        </button>
      </div>
    );
  }

  // ... menu + cart UI (similar to POS but simplified)
}
POS QR Scanner (frontend/src/components/QRScanner.jsx):

jsx
import { useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScanner({ onScan }) {
  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader');
    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        onScan(decodedText); // orderId
        scanner.stop();
      },
      () => {} // ignore scan failures
    );

    return () => { scanner.stop().catch(() => {}); };
  }, []);

  return <div id="qr-reader" className="w-full max-w-sm mx-auto" />;
}
Why html5-qrcode: It handles camera permissions, decoding, and cross-browser compatibility. react-qr-code only generates QR codes — it cannot scan them.

Hardware reality: A kiosk needs a touchscreen/tablet and a receipt printer. For the demo, use a tablet on a stand and show the QR on screen — skip the printer. In production, a thermal printer via window.print() or ESC/POS library would be needed.

Step 5.2 — Recipe-Level BOM Inventory
This is a separate subsystem. Do not attempt it until the simple stock count (sell 1 burger → decrement 1 burger) is working.

Database schema additions:

sql
-- Ingredients (raw materials)
CREATE TABLE ingredients (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  unit        TEXT NOT NULL,             -- 'g', 'mL', 'pc'
  stock_qty   NUMERIC(12,3) NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC(10,4) NOT NULL DEFAULT 0
);

-- Recipes: which ingredients go into which menu item
CREATE TABLE recipes (
  id           BIGSERIAL PRIMARY KEY,
  menu_item_id BIGINT NOT NULL REFERENCES menu_items(id),
  ingredient_id BIGINT NOT NULL REFERENCES ingredients(id),
  qty_per_unit NUMERIC(10,3) NOT NULL    -- in ingredient's unit
);

-- Depletion log (audit trail)
CREATE TABLE inventory_movements (
  id          BIGSERIAL PRIMARY KEY,
  ingredient_id BIGINT NOT NULL REFERENCES ingredients(id),
  delta       NUMERIC(12,3) NOT NULL,     -- negative = depletion
  reason      TEXT NOT NULL,              -- 'SALE', 'WASTE', 'RESTOCK'
  order_id    BIGINT REFERENCES orders(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
Why qty_per_unit in the ingredient's own unit: The recipe stores "a Classic Burger uses 150 g of beef." The burger is sold as 1 unit; the beef is stocked in grams. No conversion needed if the recipe is already in the stock unit. If the recipe is in a different unit (e.g., "1 cup ketchup"), add a conversion_factor column later.

Depletion logic (in sync.js, after CREATE_ORDER):

javascript
// After inserting the order, expand each item through its recipe
for (const item of payload.items) {
  const recipe = await client.query(
    `SELECT r.ingredient_id, r.qty_per_unit
     FROM recipes r WHERE r.menu_item_id = $1`,
    [item.id]
  );

  for (const row of recipe.rows) {
    const totalDepletion = row.qty_per_unit * item.qty;
    await client.query(
      `UPDATE ingredients SET stock_qty = stock_qty - $1 WHERE id = $2`,
      [totalDepletion, row.ingredient_id]
    );
    await client.query(
      `INSERT INTO inventory_movements (ingredient_id, delta, reason, order_id)
       VALUES ($1, $2, 'SALE', $3)`,
      [row.ingredient_id, -totalDepletion, order.rows[0].id]
    );
  }
}
Critical warning: This depletion must run inside the same transaction as the order insert. If the order is created but depletion fails, inventory becomes inconsistent. The BEGIN/COMMIT block already in sync.js covers this — just add the depletion queries before the COMMIT.

Simpler alternative for the demo: Skip recipe-level BOM. Use a stock_qty column directly on menu_items and decrement by item.qty. Show the recipe-level system only if the restaurant specifically asks about ingredient tracking.

Step 5.3 — Admin Dashboard
A read-only dashboard is sufficient for the prototype. Create frontend/src/components/Admin.jsx:

jsx
import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function Admin() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => {
    // You'll need a new backend endpoint: GET /api/admin/orders
    fetch(`${API_BASE}/api/admin/orders`)
      .then(r => r.json())
      .then(data => {
        setOrders(data.orders);
        setStats(data.stats);
      });
  }, []);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">📊 Admin Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Today's Sales</div>
          <div className="text-2xl font-bold">₱{stats.todaySales ?? 0}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Orders Today</div>
          <div className="text-2xl font-bold">{stats.todayOrders ?? 0}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Pending Sync</div>
          <div className="text-2xl font-bold">{stats.pending ?? 0}</div>
        </div>
      </div>

      <table className="w-full bg-white rounded shadow">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">ID</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-right">Total</th>
            <th className="p-2 text-left">Time</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id} className="border-t">
              <td className="p-2">{o.id}</td>
              <td className="p-2">{o.status}</td>
              <td className="p-2 text-right">₱{o.total}</td>
              <td className="p-2">{new Date(o.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
Backend endpoint (backend/src/routes/admin.js):

javascript
import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/admin/orders', async (_req, res) => {
  const { rows: orders } = await pool.query(
    `SELECT id, status, total::float, created_at
     FROM orders ORDER BY id DESC LIMIT 100`
  );

  const { rows: statsRows } = await pool.query(
    `SELECT
       COALESCE(SUM(total) FILTER (WHERE created_at::date = CURRENT_DATE), 0)::float AS "todaySales",
       COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) AS "todayOrders"
     FROM orders`
  );

  res.json({ orders, stats: statsRows[0] });
});

export default router;
Mount it in server.js:

javascript
import adminRouter from './routes/admin.js';
app.use('/api', adminRouter);
Why LIMIT 100: Never return an unbounded result set. A restaurant with 6 months of orders would crash the browser trying to render 10,000 rows.

Phase 5 Demo Strategy
For a restaurant demo, do not show all features at once. Show this sequence:

Kiosk: Customer taps "Classic Burger" → "Place Order" → QR appears on screen.

POS scan: Cashier scans the QR → order appears in POS.

Kitchen: Order appears on the Kitchen Display.

Admin: Open the dashboard → sales count incremented.

(Optional) Inventory: Show SELECT * FROM ingredients; before and after — beef stock decreased by 150 g.

Talking point: "The kiosk reduces counter queues. The QR receipt eliminates manual entry errors. The admin dashboard shows you exactly what sold today without touching a spreadsheet."

What You Have After All Phases
Phase	Deliverable	Demo Value
0	Docker + Schema + Backend	Foundation
1	Offline-First POS	Never lose an order
2	Neon + Online Store + Vercel	Customer orders from phone
3	Kitchen Display + Socket.IO	Real-time kitchen, zero printers
4	GPS Tracking + Leaflet	Customer sees rider on map
5	Kiosk + BOM + Admin	Self-service + inventory + analytics
Total cash cost: $0–$7/month (Render Starter if you need always-on backend; Neon, Vercel, and Leaflet are free).

Total build time (solo, part-time): 8–14 weeks for a working demo of all phases. Phases 2 and 3 are the highest-value for restaurant demos — prioritize them.

Final Architecture Diagram
text
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Kiosk     │     │   POS       │     │ Online Store│
│ (React)     │     │ (React)     │     │ (React/Vercel│
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
              ┌────────────▼────────────┐
              │   Dexie.js (IndexedDB)  │
              │   Local-first storage   │
              └────────────┬────────────┘
                           │ Sync Worker (outbox)
                           ▼
              ┌─────────────────────────┐
              │   Express Backend       │
              │   + Socket.IO           │
              │   + Redis Pub/Sub       │
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │   PostgreSQL (Neon)     │
              │   orders, menu, stock   │
              └─────────────────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐
│ Kitchen     │     │ Rider View  │     │ Admin       │
│ Display     │     │ (GPS→Leaflet│     │ Dashboard   │
│ (Socket.IO) │     │ →Socket.IO) │     │ (REST)      │
└─────────────┘     └─────────────┘     └─────────────┘
One Final Note on Scope
You do not need to build all five phases to have a compelling demo. Phases 0–3 are enough to walk into a restaurant and say: "Your orders never get lost, your kitchen sees them instantly, and customers can order from their phone — all for $0/month while you're testing it."

Phase 4 (GPS) is a "wow" feature that closes deals. Phase 5 (Kiosk + BOM) is what you build after a restaurant says "yes."

Build in this order. Demo early. Let the restaurant owner tell you which phase matters most to them — then build that one deeper.