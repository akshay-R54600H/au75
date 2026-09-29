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
