-- =============================================================
-- Antoch Session Trainer — Supabase schema
--
-- Paste this whole file into the Supabase SQL editor and press Run.
-- It is safe to run more than once.
--
-- Two rules are enforced here rather than in the browser, because
-- anything enforced only in the browser is not enforced at all:
--   * a trainer reaches their own trainees and nobody else's
--   * a trainee reaches their own sessions and nobody else's
-- =============================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------------
-- TABLES
-- -------------------------------------------------------------

create table if not exists profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text,
  name        text,
  role        text not null default 'trainee' check (role in ('admin','trainer','trainee')),
  trainer_id  uuid references profiles(id) on delete set null,
  trainee_id  uuid,
  created_at  timestamptz not null default now()
);

create table if not exists trainees (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  level       text not null default 'A2' check (level in ('A1','A2','B1','B2','C1','C2')),
  trainer_id  uuid references profiles(id) on delete set null,
  profile_id  uuid references profiles(id) on delete set null,
  notes       text not null default '',
  join_code   text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists topics (
  id          uuid primary key default gen_random_uuid(),
  trainee_id  uuid not null references trainees(id) on delete cascade,
  text        text not null,
  tag         text not null default 'anchor' check (tag in ('anchor','stretch')),
  created_at  timestamptz not null default now()
);

create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  trainee_id  uuid not null references trainees(id) on delete cascade,
  trainer_id  uuid references profiles(id) on delete set null,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  plan        jsonb not null default '{}'::jsonb,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists invites (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  role        text not null check (role in ('admin','trainer')),
  used_at     timestamptz,
  used_by     uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists sessions_trainee_idx on sessions(trainee_id, started_at desc);
create index if not exists topics_trainee_idx   on topics(trainee_id);
create index if not exists trainees_trainer_idx on trainees(trainer_id);

-- -------------------------------------------------------------
-- NEW SIGNUPS
-- Every new account starts as a plain trainee with no links. The
-- real role is granted afterwards by claim_code(), server side, so
-- a browser cannot award itself administrator rights by editing
-- the signup metadata.
-- -------------------------------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, email, name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', new.email), 'trainee')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- -------------------------------------------------------------
-- ROLE HELPERS
-- security definer so that a policy on profiles can read profiles
-- without re-entering its own policy.
-- -------------------------------------------------------------

create or replace function app_role()
returns text
language sql
stable
security definer set search_path = public
as $$ select role from profiles where id = auth.uid() $$;

create or replace function app_is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$ select coalesce((select role = 'admin' from profiles where id = auth.uid()), false) $$;

-- Can the current user see this trainee at all?
create or replace function app_can_see_trainee(p_trainee uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from trainees t
    where t.id = p_trainee
      and ( app_is_admin()
         or t.trainer_id = auth.uid()
         or t.profile_id = auth.uid() )
  )
$$;

-- Can the current user change this trainee's material?
create or replace function app_can_edit_trainee(p_trainee uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from trainees t
    where t.id = p_trainee
      and ( app_is_admin() or t.trainer_id = auth.uid() )
  )
$$;

-- -------------------------------------------------------------
-- CODES
-- resolve_code answers one narrow question for a signed-out visitor
-- and reveals nothing else. claim_code does the actual granting and
-- can only ever act on the caller's own account.
-- -------------------------------------------------------------

create or replace function resolve_code(p_code text)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_trainee trainees;
  v_invite  invites;
begin
  if p_code is null or length(trim(p_code)) = 0 then
    return null;
  end if;

  select * into v_trainee from trainees
    where upper(join_code) = upper(trim(p_code)) and profile_id is null;
  if found then
    return jsonb_build_object('role', 'trainee',
                              'trainer_id', v_trainee.trainer_id,
                              'trainee_id', v_trainee.id);
  end if;

  select * into v_invite from invites
    where upper(code) = upper(trim(p_code)) and used_at is null;
  if found then
    return jsonb_build_object('role', v_invite.role);
  end if;

  return null;
end;
$$;

create or replace function claim_code(p_code text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_trainee trainees;
  v_invite  invites;
begin
  if v_uid is null then
    raise exception 'Not signed in.';
  end if;

  select * into v_trainee from trainees
    where upper(join_code) = upper(trim(p_code)) and profile_id is null;
  if found then
    update profiles
       set role = 'trainee', trainer_id = v_trainee.trainer_id, trainee_id = v_trainee.id
     where id = v_uid;
    update trainees set profile_id = v_uid where id = v_trainee.id;
    return jsonb_build_object('role', 'trainee', 'trainee_id', v_trainee.id);
  end if;

  select * into v_invite from invites
    where upper(code) = upper(trim(p_code)) and used_at is null;
  if found then
    update profiles set role = v_invite.role where id = v_uid;
    update invites set used_at = now(), used_by = v_uid where id = v_invite.id;
    return jsonb_build_object('role', v_invite.role);
  end if;

  raise exception 'That code was not recognised, or it has already been used.';
end;
$$;

grant execute on function resolve_code(text) to anon, authenticated;
grant execute on function claim_code(text)   to authenticated;

-- -------------------------------------------------------------
-- ROW LEVEL SECURITY
-- -------------------------------------------------------------

alter table profiles enable row level security;
alter table trainees enable row level security;
alter table topics   enable row level security;
alter table sessions enable row level security;
alter table invites  enable row level security;

-- profiles ----------------------------------------------------
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select
  using (id = auth.uid() or app_is_admin());

drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update
  using (id = auth.uid() or app_is_admin())
  with check (id = auth.uid() or app_is_admin());

drop policy if exists profiles_delete on profiles;
create policy profiles_delete on profiles for delete
  using (app_is_admin());

-- trainees ----------------------------------------------------
drop policy if exists trainees_select on trainees;
create policy trainees_select on trainees for select
  using (app_is_admin() or trainer_id = auth.uid() or profile_id = auth.uid());

drop policy if exists trainees_insert on trainees;
create policy trainees_insert on trainees for insert
  with check (app_is_admin() or (app_role() = 'trainer' and trainer_id = auth.uid()));

drop policy if exists trainees_update on trainees;
create policy trainees_update on trainees for update
  using (app_is_admin() or trainer_id = auth.uid())
  with check (app_is_admin() or trainer_id = auth.uid());

drop policy if exists trainees_delete on trainees;
create policy trainees_delete on trainees for delete
  using (app_is_admin() or trainer_id = auth.uid());

-- topics ------------------------------------------------------
drop policy if exists topics_select on topics;
create policy topics_select on topics for select
  using (app_can_see_trainee(trainee_id));

drop policy if exists topics_write on topics;
create policy topics_write on topics for insert
  with check (app_can_edit_trainee(trainee_id));

drop policy if exists topics_update on topics;
create policy topics_update on topics for update
  using (app_can_edit_trainee(trainee_id))
  with check (app_can_edit_trainee(trainee_id));

drop policy if exists topics_delete on topics;
create policy topics_delete on topics for delete
  using (app_can_edit_trainee(trainee_id));

-- sessions ----------------------------------------------------
drop policy if exists sessions_select on sessions;
create policy sessions_select on sessions for select
  using (app_can_see_trainee(trainee_id));

drop policy if exists sessions_insert on sessions;
create policy sessions_insert on sessions for insert
  with check (app_can_edit_trainee(trainee_id));

drop policy if exists sessions_update on sessions;
create policy sessions_update on sessions for update
  using (app_can_edit_trainee(trainee_id))
  with check (app_can_edit_trainee(trainee_id));

drop policy if exists sessions_delete on sessions;
create policy sessions_delete on sessions for delete
  using (app_can_edit_trainee(trainee_id));

-- invites -----------------------------------------------------
-- Nobody reads this table from the browser. resolve_code and
-- claim_code reach it as security definer functions instead.
drop policy if exists invites_admin on invites;
create policy invites_admin on invites for all
  using (app_is_admin())
  with check (app_is_admin());

-- -------------------------------------------------------------
-- FIRST ADMINISTRATOR
-- Create your own account through the app's "Create account" form
-- using any invite code you generate below, or simply promote
-- yourself once by running this with your email address:
--
--   update profiles set role = 'admin' where email = 'you@example.com';
--
-- To hand out the very first trainer code, insert one by hand:
--
--   insert into invites (code, role) values ('ABC123', 'trainer');
-- -------------------------------------------------------------
