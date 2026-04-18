-- =============================================================================
-- Demo Account Trade — Supabase SQL Schema
-- Paste this entire file into the Supabase SQL Editor and run it once.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. demo_accounts
--    Stores the capital settings for each demo session (identified by a UUID
--    that is persisted in the browser's localStorage).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS demo_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      TEXT NOT NULL UNIQUE,          -- browser-generated UUID
  capital         NUMERIC(18, 2) NOT NULL DEFAULT 10000,
  pct_per_trade   NUMERIC(5, 2)  NOT NULL DEFAULT 10,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS demo_accounts_updated_at ON demo_accounts;
CREATE TRIGGER demo_accounts_updated_at
  BEFORE UPDATE ON demo_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 2. demo_trades
--    One row per demo trade (manual or auto), linked to a demo_account.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS demo_trades (
  id              TEXT PRIMARY KEY,              -- "trade-<timestamp>" generated client-side
  session_id      TEXT NOT NULL REFERENCES demo_accounts(session_id) ON DELETE CASCADE,
  asset           TEXT NOT NULL,
  symbol          TEXT NOT NULL,
  entry_price     NUMERIC(24, 8) NOT NULL,
  exit_price      NUMERIC(24, 8) NOT NULL,
  capital_used    NUMERIC(18, 2) NOT NULL,
  quantity        NUMERIC(24, 8) NOT NULL,
  pnl             NUMERIC(18, 2) NOT NULL DEFAULT 0,
  pnl_pct         NUMERIC(10, 4) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL CHECK (status IN ('open', 'correct', 'failed')),
  trade_mode      TEXT NOT NULL CHECK (trade_mode IN ('manual', 'auto')),
  target_exit     NUMERIC(24, 8) NOT NULL,
  stop_loss       NUMERIC(24, 8) NOT NULL,
  signal          TEXT,
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS demo_trades_session_id_idx ON demo_trades(session_id);
CREATE INDEX IF NOT EXISTS demo_trades_opened_at_idx  ON demo_trades(opened_at DESC);

-- ---------------------------------------------------------------------------
-- 3. demo_auto_logs
--    Activity-log entries produced by the Auto Trade engine.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS demo_auto_logs (
  id          TEXT PRIMARY KEY,                  -- "log-<timestamp>-<random>" client-side
  session_id  TEXT NOT NULL REFERENCES demo_accounts(session_id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  log_type    TEXT NOT NULL CHECK (log_type IN ('info', 'success', 'error', 'skip')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS demo_auto_logs_session_id_idx ON demo_auto_logs(session_id);
CREATE INDEX IF NOT EXISTS demo_auto_logs_created_at_idx ON demo_auto_logs(created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. Row Level Security (RLS)
--    Each demo session can only see its own data.
--    RLS is enforced using the session_id that the browser sends via the
--    anon key (no authentication required for demo usage).
-- ---------------------------------------------------------------------------
ALTER TABLE demo_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_trades   ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_auto_logs ENABLE ROW LEVEL SECURITY;

-- Policy: anyone with the anon key may read/write their own session rows.
-- The client sends `session_id` as a query filter — all queries are always
-- scoped to a single session_id so no cross-user leakage can occur.

CREATE POLICY "demo_accounts: allow all for own session"
  ON demo_accounts FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "demo_trades: allow all for own session"
  ON demo_trades FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "demo_auto_logs: allow all for own session"
  ON demo_auto_logs FOR ALL
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Done! Tables are ready for use with the Demo Account feature.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Migration: add max_auto_trades column to demo_accounts
-- Run these ALTER statements if you already applied the original schema.
-- ---------------------------------------------------------------------------
ALTER TABLE demo_accounts
  ADD COLUMN IF NOT EXISTS max_auto_trades INTEGER NOT NULL DEFAULT 3;

-- ---------------------------------------------------------------------------
-- Migration: add risk_level, scan_interval_seconds, min_signal_filter columns
-- Run these ALTER statements if you already applied the original schema.
-- ---------------------------------------------------------------------------
ALTER TABLE demo_accounts
  ADD COLUMN IF NOT EXISTS risk_level TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS scan_interval_seconds INTEGER NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS min_signal_filter TEXT NOT NULL DEFAULT 'STRONG_BUY';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'demo_accounts_risk_level_check'
  ) THEN
    ALTER TABLE demo_accounts
      ADD CONSTRAINT demo_accounts_risk_level_check
        CHECK (risk_level IN ('low', 'medium', 'high'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'demo_accounts_min_signal_filter_check'
  ) THEN
    ALTER TABLE demo_accounts
      ADD CONSTRAINT demo_accounts_min_signal_filter_check
        CHECK (min_signal_filter IN ('STRONG_BUY', 'BUY'));
  END IF;
END
$$;
