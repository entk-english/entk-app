-- =============================================================
-- RECORDINGS BUCKET
--
-- Run this once in the Supabase SQL editor, after supabase-schema.sql.
-- It creates the private bucket the pronunciation attempts are uploaded
-- to and the three policies that decide who may reach them.
--
-- Every object is stored as
--     <trainee_id>/<session_id>/<timestamp>-<word>.webm
-- so the first folder in the path is the only thing a policy has to
-- look at: app_can_see_trainee already answers "may this account reach
-- this trainee at all", and it answers yes for the trainee themselves,
-- their trainer, and an administrator.
-- =============================================================

insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

-- A path whose first folder is not a uuid must not raise an error
-- inside a policy — it simply belongs to nobody.
create or replace function app_uuid_or_null(t text)
returns uuid
language sql
immutable
as $$
  select case when t ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
              then t::uuid else null end
$$;

drop policy if exists recordings_read on storage.objects;
create policy recordings_read on storage.objects for select to authenticated
using (
  bucket_id = 'recordings'
  and app_can_see_trainee(app_uuid_or_null((storage.foldername(name))[1]))
);

-- The trainee is the one recording, so they must be able to write into
-- their own folder. app_can_edit_trainee would exclude them.
drop policy if exists recordings_write on storage.objects;
create policy recordings_write on storage.objects for insert to authenticated
with check (
  bucket_id = 'recordings'
  and app_can_see_trainee(app_uuid_or_null((storage.foldername(name))[1]))
);

-- Clearing old audio is the trainer's job, not the trainee's.
drop policy if exists recordings_delete on storage.objects;
create policy recordings_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'recordings'
  and app_can_edit_trainee(app_uuid_or_null((storage.foldername(name))[1]))
);
