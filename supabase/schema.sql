-- ==============================================================================
-- AU75 Global Application Settings & Maintenance Mode Schema
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Create the app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY,
  maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
  maintenance_title TEXT NOT NULL DEFAULT 'AU75 is under maintenance',
  maintenance_message TEXT NOT NULL DEFAULT 'We are making a few improvements. Please check back soon.',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

-- 2. Seed the initial singleton global configuration row
INSERT INTO public.app_settings (
  id,
  maintenance_mode,
  maintenance_title,
  maintenance_message,
  updated_at,
  updated_by
)
VALUES (
  'global',
  FALSE,
  'AU75 is under maintenance',
  'We are making a few improvements. Please check back soon.',
  NOW(),
  'system'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Allow public read access (anon & authenticated) to read the global setting
DROP POLICY IF EXISTS "Allow public read access to app_settings" ON public.app_settings;
CREATE POLICY "Allow public read access to app_settings"
  ON public.app_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5. Policy: Allow service_role key full CRUD access (used only server-side by AU75 API routes)
DROP POLICY IF EXISTS "Allow service_role full access to app_settings" ON public.app_settings;
CREATE POLICY "Allow service_role full access to app_settings"
  ON public.app_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- AU75 Anonymous Admin Analytics Schema
-- ==============================================================================

-- 6. Create anonymous users tracking table (unique installations)
CREATE TABLE IF NOT EXISTS public.app_analytics_users (
  anonymous_id TEXT PRIMARY KEY,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  has_synced BOOLEAN NOT NULL DEFAULT FALSE,
  first_synced_at TIMESTAMPTZ,
  sync_count INT NOT NULL DEFAULT 0
);

-- 7. Create raw anonymous events table (30-day retention)
CREATE TABLE IF NOT EXISTS public.app_analytics_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  anonymous_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('app_visit', 'sync_started', 'sync_success', 'sync_failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for rapid aggregation & filtering
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created
  ON public.app_analytics_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_anon_type
  ON public.app_analytics_events (anonymous_id, event_type);

CREATE INDEX IF NOT EXISTS idx_analytics_users_last_seen
  ON public.app_analytics_users (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_users_has_synced
  ON public.app_analytics_users (has_synced);

-- 8. Create daily aggregate table for long-term trends
CREATE TABLE IF NOT EXISTS public.app_analytics_daily_stats (
  date DATE PRIMARY KEY,
  unique_users INT NOT NULL DEFAULT 0,
  sync_users INT NOT NULL DEFAULT 0,
  successful_syncs INT NOT NULL DEFAULT 0,
  failed_syncs INT NOT NULL DEFAULT 0,
  sync_attempts INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Enable Row Level Security (RLS) on all analytics tables
ALTER TABLE public.app_analytics_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_analytics_daily_stats ENABLE ROW LEVEL SECURITY;

-- 10. Revoke public/anon read/write access (ensures browser cannot read analytics data directly)
-- Only service_role key has full access (used exclusively server-side by AU75 API routes)
DROP POLICY IF EXISTS "Allow service_role full access to app_analytics_users" ON public.app_analytics_users;
CREATE POLICY "Allow service_role full access to app_analytics_users"
  ON public.app_analytics_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service_role full access to app_analytics_events" ON public.app_analytics_events;
CREATE POLICY "Allow service_role full access to app_analytics_events"
  ON public.app_analytics_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service_role full access to app_analytics_daily_stats" ON public.app_analytics_daily_stats;
CREATE POLICY "Allow service_role full access to app_analytics_daily_stats"
  ON public.app_analytics_daily_stats
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 11. Optional function for pruning raw events older than 30 days
CREATE OR REPLACE FUNCTION public.prune_old_analytics_events()
RETURNS void LANGUAGE sql AS $$
  DELETE FROM public.app_analytics_events
  WHERE created_at < NOW() - INTERVAL '30 days';
$$;
