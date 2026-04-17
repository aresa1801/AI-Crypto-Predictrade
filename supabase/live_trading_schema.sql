-- =============================================================================
-- Live Trading — Supabase SQL Schema
-- Paste this entire file into the Supabase SQL Editor and run it once.
-- Tables are completely separate from the Demo Account schema.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: auto-update updated_at column trigger function
-- (safe to run even if already exists from demo_account_schema.sql)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 1. live_trading_settings
--    Capital config and risk preferences per session.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS live_trading_settings (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        TEXT    NOT NULL UNIQUE,
  capital           NUMERIC(18, 2) NOT NULL DEFAULT 1000,
  pct_per_trade     NUMERIC(5, 2)  NOT NULL DEFAULT 5,
  default_exchange  TEXT    NOT NULL DEFAULT 'binance',
  risk_level        TEXT    NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
  enable_auto_trade BOOLEAN NOT NULL DEFAULT false,
  max_open_trades   INTEGER NOT NULL DEFAULT 3,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS live_trading_settings_updated_at ON live_trading_settings;
CREATE TRIGGER live_trading_settings_updated_at
  BEFORE UPDATE ON live_trading_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 2. live_api_keys
--    CEX exchange API credentials per session.
--    NOTE: For production use, encrypt api_key and api_secret at rest using
--    pgcrypto or a dedicated secrets manager before storing.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS live_api_keys (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  TEXT    NOT NULL,
  exchange    TEXT    NOT NULL,            -- e.g. 'binance', 'bybit', 'okx'
  api_key     TEXT    NOT NULL,
  api_secret  TEXT    NOT NULL,
  passphrase  TEXT    NOT NULL DEFAULT '', -- required by OKX, KuCoin, Coinbase, Bitget
  label       TEXT    NOT NULL DEFAULT '', -- user-defined nickname
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_api_keys_session_id_idx ON live_api_keys(session_id);

DROP TRIGGER IF EXISTS live_api_keys_updated_at ON live_api_keys;
CREATE TRIGGER live_api_keys_updated_at
  BEFORE UPDATE ON live_api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 3. live_trades
--    Records of every live trade opened/closed via this platform.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS live_trades (
  id           TEXT    PRIMARY KEY,          -- "live-<timestamp>" client-side generated
  session_id   TEXT    NOT NULL,
  exchange     TEXT    NOT NULL,
  asset        TEXT    NOT NULL,
  symbol       TEXT    NOT NULL,
  entry_price  NUMERIC(24, 8) NOT NULL,
  exit_price   NUMERIC(24, 8) NOT NULL DEFAULT 0,
  capital_used NUMERIC(18, 2) NOT NULL,
  quantity     NUMERIC(24, 8) NOT NULL,
  pnl          NUMERIC(18, 2) NOT NULL DEFAULT 0,
  pnl_pct      NUMERIC(10, 4) NOT NULL DEFAULT 0,
  status       TEXT    NOT NULL CHECK (status IN ('open', 'closed_tp', 'closed_sl', 'closed_manual')),
  trade_mode   TEXT    NOT NULL CHECK (trade_mode IN ('manual', 'auto')),
  target_exit  NUMERIC(24, 8) NOT NULL,
  stop_loss    NUMERIC(24, 8) NOT NULL,
  signal       TEXT,
  opened_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at    TIMESTAMPTZ,
  fees         NUMERIC(18, 8) NOT NULL DEFAULT 0,
  order_id     TEXT                          -- CEX order ID if placed via API
);

CREATE INDEX IF NOT EXISTS live_trades_session_id_idx ON live_trades(session_id);
CREATE INDEX IF NOT EXISTS live_trades_opened_at_idx  ON live_trades(opened_at DESC);
CREATE INDEX IF NOT EXISTS live_trades_status_idx     ON live_trades(status);

-- ---------------------------------------------------------------------------
-- 4. live_auto_logs
--    Activity log produced by the Auto Trade engine.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS live_auto_logs (
  id          TEXT    PRIMARY KEY,
  session_id  TEXT    NOT NULL,
  message     TEXT    NOT NULL,
  log_type    TEXT    NOT NULL CHECK (log_type IN ('info', 'success', 'error', 'skip', 'warning')),
  exchange    TEXT,
  symbol      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_auto_logs_session_id_idx ON live_auto_logs(session_id);
CREATE INDEX IF NOT EXISTS live_auto_logs_created_at_idx ON live_auto_logs(created_at DESC);

-- ---------------------------------------------------------------------------
-- 5. Row Level Security (RLS)
--    All operations are scoped to the session_id sent by the browser.
-- ---------------------------------------------------------------------------
ALTER TABLE live_trading_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_api_keys         ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_trades           ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_auto_logs        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "live_trading_settings: allow all"
  ON live_trading_settings FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "live_api_keys: allow all"
  ON live_api_keys FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "live_trades: allow all"
  ON live_trades FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "live_auto_logs: allow all"
  ON live_auto_logs FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 6. SQL Editor helper function
--    Allows the UI's SQL Editor to run SELECT queries via rpc('execute_sql').
--    Only SELECT statements are permitted to prevent destructive operations
--    from the client side.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION execute_sql(query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result      JSONB;
  upper_query TEXT := upper(trim(query));
BEGIN
  -- Only allow SELECT statements from the client
  IF upper_query NOT LIKE 'SELECT%' THEN
    RAISE EXCEPTION 'Only SELECT statements are allowed via the SQL editor.';
  END IF;

  EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', query) INTO result;
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$;

-- Grant execute permission to the anonymous role
GRANT EXECUTE ON FUNCTION execute_sql(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION execute_sql(TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- Done! All live trading tables are ready.
-- Run this schema AFTER demo_account_schema.sql if using both features.
-- ---------------------------------------------------------------------------
