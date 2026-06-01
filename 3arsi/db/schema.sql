-- ============================================================================
-- 3ARSI — Cloudflare D1 schema (SQLite).
-- Multi-tenant by `bride_id`: every bride is an isolated workspace/tenant.
-- Apply locally:  wrangler d1 execute arsi-db --local --file=./db/schema.sql
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ---- Identity & tenancy --------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'bride' CHECK (role IN ('admin','bride')),
  name          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- A bride = a tenant = a personalised workspace.
CREATE TABLE IF NOT EXISTS brides (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bride_name   TEXT NOT NULL,
  groom_name   TEXT NOT NULL,
  wedding_date TEXT NOT NULL,
  city         TEXT NOT NULL,
  guest_count  INTEGER NOT NULL,
  budget       INTEGER NOT NULL,
  wedding_type TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  paid         INTEGER NOT NULL DEFAULT 0,           -- 0/1 has an active paid order
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_brides_user ON brides(user_id);

-- ---- Orders & payments (Chargily Pay) ------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                   TEXT PRIMARY KEY,
  bride_id             TEXT NOT NULL REFERENCES brides(id) ON DELETE CASCADE,
  amount               INTEGER NOT NULL,
  currency             TEXT NOT NULL DEFAULT 'dzd',
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','canceled')),
  provider             TEXT NOT NULL DEFAULT 'chargily',
  provider_checkout_id TEXT,
  provider_payload     TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at              TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_bride ON orders(bride_id);
CREATE INDEX IF NOT EXISTS idx_orders_checkout ON orders(provider_checkout_id);

-- ---- Module data (all tenant-scoped by bride_id) -------------------------
CREATE TABLE IF NOT EXISTS budget_items (
  id        TEXT PRIMARY KEY,
  bride_id  TEXT NOT NULL REFERENCES brides(id) ON DELETE CASCADE,
  category  TEXT NOT NULL,
  item      TEXT NOT NULL,
  planned   INTEGER NOT NULL DEFAULT 0,
  actual    INTEGER NOT NULL DEFAULT 0,
  note      TEXT,
  sort      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_budget_bride ON budget_items(bride_id);

CREATE TABLE IF NOT EXISTS timeline_entries (
  id        TEXT PRIMARY KEY,
  bride_id  TEXT NOT NULL REFERENCES brides(id) ON DELETE CASCADE,
  ord       INTEGER NOT NULL DEFAULT 0,
  task      TEXT NOT NULL,
  date      TEXT NOT NULL,
  owner     TEXT,
  status    TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','done')),
  priority  TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  note      TEXT
);
CREATE INDEX IF NOT EXISTS idx_timeline_bride ON timeline_entries(bride_id);

CREATE TABLE IF NOT EXISTS tasks (
  id        TEXT PRIMARY KEY,
  bride_id  TEXT NOT NULL REFERENCES brides(id) ON DELETE CASCADE,
  title     TEXT NOT NULL,
  category  TEXT,
  due_date  TEXT,
  status    TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','done')),
  priority  TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low'))
);
CREATE INDEX IF NOT EXISTS idx_tasks_bride ON tasks(bride_id);

CREATE TABLE IF NOT EXISTS equipment_items (
  id        TEXT PRIMARY KEY,
  bride_id  TEXT NOT NULL REFERENCES brides(id) ON DELETE CASCADE,
  list      TEXT NOT NULL,
  room      TEXT,
  item      TEXT NOT NULL,
  quantity  INTEGER NOT NULL DEFAULT 1,
  est_price INTEGER NOT NULL DEFAULT 0,
  status    TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','done')),
  note      TEXT
);
CREATE INDEX IF NOT EXISTS idx_equipment_bride ON equipment_items(bride_id);

CREATE TABLE IF NOT EXISTS events (
  id        TEXT PRIMARY KEY,
  bride_id  TEXT NOT NULL REFERENCES brides(id) ON DELETE CASCADE,
  ord       INTEGER NOT NULL DEFAULT 0,
  name      TEXT NOT NULL,
  date      TEXT NOT NULL,
  time      TEXT,
  place     TEXT,
  guests    INTEGER NOT NULL DEFAULT 0,
  note      TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_bride ON events(bride_id);

CREATE TABLE IF NOT EXISTS guests (
  id        TEXT PRIMARY KEY,
  bride_id  TEXT NOT NULL REFERENCES brides(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  gender    TEXT CHECK (gender IN ('male','female')),
  relation  TEXT,
  grp       TEXT,
  rsvp      TEXT NOT NULL DEFAULT 'pending' CHECK (rsvp IN ('confirmed','pending','declined')),
  plus_one  INTEGER NOT NULL DEFAULT 0,
  table_no  INTEGER,
  phone     TEXT
);
CREATE INDEX IF NOT EXISTS idx_guests_bride ON guests(bride_id);

CREATE TABLE IF NOT EXISTS tables_plan (
  id        TEXT PRIMARY KEY,
  bride_id  TEXT NOT NULL REFERENCES brides(id) ON DELETE CASCADE,
  number    INTEGER NOT NULL,
  grp       TEXT,
  capacity  INTEGER NOT NULL DEFAULT 10,
  assigned  INTEGER NOT NULL DEFAULT 0,
  note      TEXT
);
CREATE INDEX IF NOT EXISTS idx_tables_bride ON tables_plan(bride_id);

CREATE TABLE IF NOT EXISTS vendors (
  id        TEXT PRIMARY KEY,
  bride_id  TEXT NOT NULL REFERENCES brides(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  type      TEXT,
  phone     TEXT,
  instagram TEXT,
  whatsapp  TEXT,
  note      TEXT
);
CREATE INDEX IF NOT EXISTS idx_vendors_bride ON vendors(bride_id);

CREATE TABLE IF NOT EXISTS payments (
  id        TEXT PRIMARY KEY,
  bride_id  TEXT NOT NULL REFERENCES brides(id) ON DELETE CASCADE,
  vendor    TEXT NOT NULL,
  service   TEXT,
  total     INTEGER NOT NULL DEFAULT 0,
  paid      INTEGER NOT NULL DEFAULT 0,
  due_date  TEXT,
  method    TEXT
);
CREATE INDEX IF NOT EXISTS idx_payments_bride ON payments(bride_id);

CREATE TABLE IF NOT EXISTS gold_items (
  id        TEXT PRIMARY KEY,
  bride_id  TEXT NOT NULL REFERENCES brides(id) ON DELETE CASCADE,
  piece     TEXT NOT NULL,
  karat     TEXT,
  grams     REAL,
  price_gram INTEGER,
  status    TEXT,
  source    TEXT
);
CREATE INDEX IF NOT EXISTS idx_gold_bride ON gold_items(bride_id);

-- Flexible storage for the remaining workbook modules (dress, food, music,
-- photography, beauty, invitations, gifts, honeymoon, notes, dayof).
CREATE TABLE IF NOT EXISTS module_items (
  id        TEXT PRIMARY KEY,
  bride_id  TEXT NOT NULL REFERENCES brides(id) ON DELETE CASCADE,
  module    TEXT NOT NULL,
  payload   TEXT NOT NULL DEFAULT '{}',  -- JSON
  sort      INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_module_bride ON module_items(bride_id, module);

-- ---- Admin templates -----------------------------------------------------
CREATE TABLE IF NOT EXISTS templates (
  id           TEXT PRIMARY KEY,
  key          TEXT NOT NULL,
  name         TEXT NOT NULL,
  wedding_type TEXT,
  payload      TEXT NOT NULL DEFAULT '{}',
  active       INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---- Security: audit logs + exports --------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id         TEXT PRIMARY KEY,
  bride_id   TEXT,
  user_id    TEXT,
  action     TEXT NOT NULL,
  target     TEXT,
  ip         TEXT,
  meta       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_bride ON audit_logs(bride_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS exports (
  id         TEXT PRIMARY KEY,
  bride_id   TEXT NOT NULL REFERENCES brides(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL DEFAULT 'pdf',
  r2_key     TEXT NOT NULL,
  watermark  TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_exports_bride ON exports(bride_id);
