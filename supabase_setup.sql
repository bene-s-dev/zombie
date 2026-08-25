-- ============================================================
-- Zombie Survival Game – Highscore Table Setup (Supabase)
-- Run this once in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/jyoxxkngxxfmiskfxndp/sql
-- ============================================================

-- 1. Create the zombie_highscores table
CREATE TABLE IF NOT EXISTS public.zombie_highscores (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 20),
  wave        integer     NOT NULL DEFAULT 1,
  kills       integer     NOT NULL DEFAULT 0,
  time        integer     NOT NULL DEFAULT 0,
  difficulty  text        NOT NULL DEFAULT 'medium',
  date        text,
  created_at  timestamptz DEFAULT now()
);

-- 2. Index for fast ranking by wave, kills, and survival time
CREATE INDEX IF NOT EXISTS zombie_highscores_rank_idx 
  ON public.zombie_highscores (wave DESC, kills DESC, time DESC);

-- 3. Row Level Security (RLS) – allow anonymous reads and inserts
ALTER TABLE public.zombie_highscores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on zombie_highscores" ON public.zombie_highscores;
CREATE POLICY "Allow public read on zombie_highscores" 
  ON public.zombie_highscores 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Allow public insert on zombie_highscores" ON public.zombie_highscores;
CREATE POLICY "Allow public insert on zombie_highscores" 
  ON public.zombie_highscores 
  FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on zombie_highscores" ON public.zombie_highscores;
CREATE POLICY "Allow public update on zombie_highscores" 
  ON public.zombie_highscores 
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- 4. Initial Seed (Top Community Runs)
INSERT INTO public.zombie_highscores (name, wave, kills, time, difficulty, date)
VALUES
  ('ZOMBIEBERGER', 28, 3367, 1759, 'medium', '22.08.'),
  ('OPPI 3', 28, 2574, 1193, 'easy', '21.08.'),
  ('OPPI 2', 27, 2276, 1048, 'easy', '21.08.'),
  ('OPPI', 25, 2466, 1125, 'easy', '21.08.'),
  ('HERETODIE', 21, 1744, 1021, 'medium', '22.08.'),
  ('HERETODIE', 19, 1216, 943, 'medium', '22.08.'),
  ('HERETODIE', 14, 798, 672, 'medium', '22.08.'),
  ('VIPER-07', 12, 620, 540, 'medium', '22.08.')
ON CONFLICT DO NOTHING;
