-- =============================================================
-- THE LIVE COLUMN
--
-- Run this once in the Supabase SQL editor, after supabase-schema.sql.
--
-- Why it exists. A session's `data` holds everything: harvested words,
-- every drill's answers, recording paths, the feedback note. It grows
-- all lesson. The trainer used to rewrite that whole blob on every
-- mark and every keystroke, and each trainee polled for the whole blob
-- to find out which stage was on screen. Three people in a lesson was
-- enough to feel it.
--
-- `live` is the small, fast-changing part — which stage, and what the
-- trainee should be looking at. The trainer writes it often and it is
-- a few hundred bytes. `data` is now written rarely, and the trainee's
-- poll never asks for it at all.
-- =============================================================

alter table sessions add column if not exists live jsonb not null default '{}'::jsonb;

-- The trainee's poll is: newest unfinished session for this trainee.
-- Without this index that is a scan of every session they have ever had.
create index if not exists sessions_live_idx
  on sessions(trainee_id, started_at desc)
  where ended_at is null;
