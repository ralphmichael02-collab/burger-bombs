-- Burger Bombs — Multi-Branch Support Migration
-- Safe to re-run: uses IF NOT EXISTS + guards the seed

CREATE TABLE IF NOT EXISTS branches (
  id                  BIGSERIAL PRIMARY KEY,
  name                TEXT NOT NULL,
  address             TEXT,
  lat                 NUMERIC(10,7) NOT NULL,
  lng                 NUMERIC(10,7) NOT NULL,
  phone               TEXT,
  hours               TEXT,
  delivery_radius_km  NUMERIC(5,2) NOT NULL DEFAULT 5.0,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  is_main             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_branches_active
  ON branches (is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_orders_branch
  ON orders (branch_id);

INSERT INTO branches
  (name, address, lat, lng, delivery_radius_km, is_active, is_main)
SELECT
  COALESCE(restaurant_name, 'Main Branch'),
  COALESCE(contact_address, 'Main Branch — Set in Admin'),
  COALESCE(contact_lat, 12.4989),
  COALESCE(contact_lng, 124.6377),
  5.0,
  TRUE,
  TRUE
FROM store_settings
WHERE id = 1
  AND NOT EXISTS (SELECT 1 FROM branches)
  AND contact_lat IS NOT NULL
  AND contact_lng IS NOT NULL;