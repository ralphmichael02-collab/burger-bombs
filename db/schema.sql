-- burger-bombs/db/schema.sql

-- 1. Menu items (the products you sell)
CREATE TABLE IF NOT EXISTS menu_items (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL,
  available   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Orders
CREATE TABLE IF NOT EXISTS orders (
  id          BIGSERIAL PRIMARY KEY,
  sync_id     UUID UNIQUE NOT NULL,     -- the mutationId from the frontend
  status      TEXT NOT NULL,            -- PENDING, PREPARING, COMPLETED, CANCELLED
  total       NUMERIC(10,2) NOT NULL,
  items       JSONB NOT NULL,           -- the cart array, stored as JSON
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Idempotency ledger — THE most important table for the sync pattern
CREATE TABLE IF NOT EXISTS processed_mutations (
  mutation_id  UUID PRIMARY KEY,
  type         TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);