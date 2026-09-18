-- ============ ENUMS ============
create type public.gender_type as enum ('man','woman','nonbinary','unspecified');
create type public.pref_type as enum ('men','women','everyone');
create type public.account_status as enum ('active','suspended','banned','deleted');
create type public.admin_role as enum ('SUPER_ADMIN','MODERATOR','SUPPORT');
create type public.report_status as enum ('NEW','UNDER_REVIEW','RESOLVED','DISMISSED','ESCALATED');
create type public.report_category as enum ('spam','fake_profile','harassment','inappropriate','underage','scam','threat','other');

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key,
  telegram_id bigint unique,
  telegram_username text,
  first_name text,
  date_of_birth date,
  gender public.gender_type,
  preferred_gender public.pref_type default 'everyone',
  city text,
  bio text,
  photo_url text,
  extra_photos text[] not null default '{}',
  interests text[] not null default '{}',
  personality jsonb not null default '{}'::jsonb,
  min_age int not null default 18,
  max_age int not null default 99,
  filter_city text,
  is_complete boolean not null default false,
  is_demo boolean not null default false,
  status public.account_status not null default 'active',
  hidden boolean not null default false,
  messaging_disabled boolean not null default false,
  suspended_until timestamptz,
  report_count int not null default 0,
  referral_code text unique default encode(gen_random_bytes(5),'hex'),
  referred_by uuid,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_discover_idx on public.profiles (status, is_complete, city);
create index profiles_telegram_idx on public.profiles (telegram_id);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.profiles_validate()
returns trigger language plpgsql as $$
begin
  if new.date_of_birth is not null
     and new.date_of_birth > (current_date - interval '18 years') then
    raise exception 'You must be 18 or older to use BlindMatch.';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger profiles_validate_trg before insert or update on public.profiles
for each row execute function public.profiles_validate();

-- ============ BLOCKS ============
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null,
  blocked_id uuid not null,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);
create index blocks_blocker_idx on public.blocks (blocker_id);
create index blocks_blocked_idx on public.blocks (blocked_id);
grant select, insert, delete on public.blocks to authenticated;
grant all on public.blocks to service_role;
alter table public.blocks enable row level security;
create policy "own blocks read" on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy "own blocks insert" on public.blocks for insert to authenticated with check (blocker_id = auth.uid() and blocked_id <> auth.uid());
create policy "own blocks delete" on public.blocks for delete to authenticated using (blocker_id = auth.uid());

-- ============ LIKES / PASSES ============
create table public.likes (
  id uuid primary key default gen_random_uuid(),
  liker_id uuid not null,
  liked_id uuid not null,
  created_at timestamptz not null default now(),
  unique (liker_id, liked_id)
);
create index likes_liked_idx on public.likes (liked_id);
grant select, insert on public.likes to authenticated;
grant all on public.likes to service_role;
alter table public.likes enable row level security;
create policy "likes read own" on public.likes for select to authenticated using (liker_id = auth.uid() or liked_id = auth.uid());
create policy "likes insert own" on public.likes for insert to authenticated with check (liker_id = auth.uid() and liked_id <> auth.uid());

create table public.passes (
  id uuid primary key default gen_random_uuid(),
  passer_id uuid not null,
  passed_id uuid not null,
  created_at timestamptz not null default now(),
  unique (passer_id, passed_id)
);
create index passes_passer_idx on public.passes (passer_id);
grant select, insert on public.passes to authenticated;
grant all on public.passes to service_role;
alter table public.passes enable row level security;
create policy "passes read own" on public.passes for select to authenticated using (passer_id = auth.uid());
create policy "passes insert own" on public.passes for insert to authenticated with check (passer_id = auth.uid() and passed_id <> auth.uid());

-- ============ MATCHES ============
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null,
  user_b uuid not null,
  compatibility int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);
create index matches_a_idx on public.matches (user_a);
create index matches_b_idx on public.matches (user_b);
grant select on public.matches to authenticated;
grant all on public.matches to service_role;
alter table public.matches enable row level security;
create policy "matches read own" on public.matches for select to authenticated using (user_a = auth.uid() or user_b = auth.uid());

-- ============ ADMIN TABLES ============
create table public.admin_users (
  user_id uuid primary key,
  email text,
  role public.admin_role not null,
  created_by uuid,
  created_at timestamptz not null default now()
);
grant select on public.admin_users to authenticated;
grant all on public.admin_users to service_role;
alter table public.admin_users enable row level security;
create policy "admin read own role" on public.admin_users for select to authenticated using (user_id = auth.uid());

-- ============ HELPERS ============
create or replace function public.is_blocked_pair(_a uuid, _b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocks b
    where (b.blocker_id = _a and b.blocked_id = _b)
       or (b.blocker_id = _b and b.blocked_id = _a));
$$;

create or replace function public.is_match_member(_match_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.matches m
    where m.id = _match_id and (m.user_a = _user_id or m.user_b = _user_id));
$$;

create or replace function public.has_admin_role(_user_id uuid, _role public.admin_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users a where a.user_id = _user_id and a.role = _role);
$$;

create or replace function public.admin_role_of(_user_id uuid)
returns public.admin_role language sql stable security definer set search_path = public as $$
  select a.role from public.admin_users a where a.user_id = _user_id;
$$;

-- ============ MESSAGES ============
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null,
  receiver_id uuid not null,
  body text not null check (char_length(body) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index messages_match_idx on public.messages (match_id, created_at);
create index messages_unread_idx on public.messages (receiver_id, read_at);
grant select, insert, update on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "messages read in match" on public.messages for select to authenticated
  using (public.is_match_member(match_id, auth.uid()));
create policy "messages insert in match" on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_match_member(match_id, auth.uid())
    and not public.is_blocked_pair(sender_id, receiver_id)
    and not exists (select 1 from public.profiles p where p.id = auth.uid()
      and (p.messaging_disabled or p.status <> 'active'))
  );
create policy "messages mark read" on public.messages for update to authenticated
  using (receiver_id = auth.uid()) with check (receiver_id = auth.uid());

alter publication supabase_realtime add table public.messages;

-- ============ REPORTS ============
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null,
  reported_id uuid not null,
  match_id uuid references public.matches(id) on delete set null,
  category public.report_category not null,
  description text,
  status public.report_status not null default 'NEW',
  priority int not null default 2,
  assigned_to uuid,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index reports_status_idx on public.reports (status, created_at desc);
create index reports_reported_idx on public.reports (reported_id);
grant select, insert on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "reports read own" on public.reports for select to authenticated using (reporter_id = auth.uid());
create policy "reports insert own" on public.reports for insert to authenticated with check (reporter_id = auth.uid() and reported_id <> auth.uid());

create or replace function public.bump_report_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set report_count = report_count + 1 where id = new.reported_id;
  return new;
end $$;
create trigger reports_bump_count after insert on public.reports
for each row execute function public.bump_report_count();

-- ============ REFERRALS / DAILY / STREAKS / ANALYTICS ============
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null,
  referred_id uuid not null unique,
  created_at timestamptz not null default now()
);
create index referrals_referrer_idx on public.referrals (referrer_id);
grant select on public.referrals to authenticated;
grant all on public.referrals to service_role;
alter table public.referrals enable row level security;
create policy "referrals read own" on public.referrals for select to authenticated using (referrer_id = auth.uid() or referred_id = auth.uid());

create table public.daily_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  target_id uuid not null,
  day date not null default current_date,
  opened boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, target_id, day)
);
create index daily_matches_user_day_idx on public.daily_matches (user_id, day);
grant select, update on public.daily_matches to authenticated;
grant all on public.daily_matches to service_role;
alter table public.daily_matches enable row level security;
create policy "daily read own" on public.daily_matches for select to authenticated using (user_id = auth.uid());
create policy "daily update own" on public.daily_matches for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.streaks (
  user_id uuid primary key,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_active_day date
);
grant select on public.streaks to authenticated;
grant all on public.streaks to service_role;
alter table public.streaks enable row level security;
create policy "streak read own" on public.streaks for select to authenticated using (user_id = auth.uid());

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  event text not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index analytics_event_idx on public.analytics_events (event, created_at desc);
grant insert on public.analytics_events to authenticated;
grant all on public.analytics_events to service_role;
alter table public.analytics_events enable row level security;
create policy "analytics insert own" on public.analytics_events for insert to authenticated with check (user_id = auth.uid());

-- ============ INTERESTS ============
create table public.interests (
  id serial primary key,
  name text not null unique
);
grant select on public.interests to authenticated, anon;
grant all on public.interests to service_role;
alter table public.interests enable row level security;
create policy "interests public read" on public.interests for select to authenticated, anon using (true);
insert into public.interests (name) values
 ('Music'),('Movies'),('Travel'),('Gaming'),('Fitness'),('Books'),('Photography'),
 ('Architecture'),('Technology'),('Art'),('Food'),('Business'),('Fashion'),('Sports'),('Nature');

-- ============ AUDIT / MODERATION ============
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  admin_role public.admin_role not null,
  action text not null,
  target_user_id uuid,
  target_resource_id uuid,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create or replace function public.audit_logs_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'Audit logs are immutable.';
end $$;
create trigger audit_logs_no_update before update or delete on public.audit_logs
for each row execute function public.audit_logs_immutable();

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  target_user_id uuid not null,
  action text not null,
  reason text not null,
  duration_hours int,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index moderation_actions_target_idx on public.moderation_actions (target_user_id, created_at desc);
grant all on public.moderation_actions to service_role;
alter table public.moderation_actions enable row level security;

create table public.moderation_notes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  admin_id uuid not null,
  note text not null,
  created_at timestamptz not null default now()
);
grant all on public.moderation_notes to service_role;
alter table public.moderation_notes enable row level security;

create table public.conversation_access_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  report_id uuid references public.reports(id) on delete set null,
  match_id uuid,
  reason text not null,
  created_at timestamptz not null default now()
);
grant all on public.conversation_access_log to service_role;
alter table public.conversation_access_log enable row level security;

-- ============ PUBLIC PROFILE VIEW (safe columns only) ============
create view public.public_profiles
with (security_invoker = false) as
select
  p.id,
  p.first_name,
  date_part('year', age(p.date_of_birth))::int as age,
  p.gender,
  p.preferred_gender,
  p.city,
  p.bio,
  p.photo_url,
  p.extra_photos,
  p.interests,
  p.personality,
  p.is_demo,
  p.created_at
from public.profiles p
where p.is_complete
  and p.status = 'active'
  and not p.hidden
  and p.date_of_birth is not null
  and (p.id = auth.uid() or not public.is_blocked_pair(auth.uid(), p.id));

grant select on public.public_profiles to authenticated;
