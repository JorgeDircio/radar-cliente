-- Radar de Clientes: modelo inicial (ver docs/adr/).
-- Catálogo público de negocios (businesses, audits, signals, scores) lo escribe solo el worker (service role);
-- los datos de trabajo del usuario (searches, leads, activities, settings, scan_jobs) son por owner_id con RLS.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- unaccent() no es IMMUTABLE; este wrapper permite usarla en columnas generadas e índices.
create function unaccent_immutable(text) returns text
language sql immutable parallel safe strict
set search_path = ''
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

create type lead_stage as enum ('nuevo', 'calificado', 'contactado', 'propuesta', 'ganado', 'perdido');
create type suggested_offer as enum ('landing', 'rediseno', 'sistema_a_medida', 'ninguna');
create type signal_type as enum ('sin_web', 'web_mala', 'procesos_manuales', 'actividad');
create type job_type as enum ('discover', 'enrich', 'audit', 'score');
create type job_status as enum ('pending', 'running', 'done', 'failed');
create type activity_type as enum ('nota', 'llamada', 'whatsapp', 'email', 'propuesta', 'reunion');

-- Búsquedas ---------------------------------------------------------------
create table searches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  keywords text not null,
  entidad text,             -- clave/nombre de estado
  municipio text,
  center_lat double precision,
  center_lng double precision,
  radius_m integer check (radius_m between 100 and 5000), -- DENUE limita el radio a 5 km
  auto_rescan boolean not null default false,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  check ((center_lat is null) = (center_lng is null))
);

-- Negocios ----------------------------------------------------------------
create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_normalized text generated always as (lower(unaccent_immutable(name))) stored,
  scian_code text,
  scian_label text,
  address text,
  entidad text,
  municipio text,
  lat double precision,
  lng double precision,
  phone text,
  email text,
  website text,
  denue_id text unique,
  place_id text unique,
  estrato text,              -- tamaño por personal ocupado (DENUE)
  rating numeric(2, 1),
  reviews_count integer,
  business_status text,
  places_payload jsonb,      -- contenido de Places: expira por ToS, ver places_fetched_at
  places_fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index businesses_name_trgm on businesses using gin (name_normalized extensions.gin_trgm_ops);
create index businesses_phone on businesses (phone) where phone is not null;

create table search_results (
  search_id uuid not null references searches on delete cascade,
  business_id uuid not null references businesses on delete cascade,
  found_at timestamptz not null default now(),
  primary key (search_id, business_id)
);

-- Auditoría, señales y score ----------------------------------------------
create table website_audits (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  url text not null,
  reachable boolean not null,
  https boolean,
  responsive boolean,
  psi_scores jsonb,          -- {performance, accessibility, seo, best_practices} mobile
  tech jsonb,                -- {cms, builder, jquery_version, ...}
  copyright_year integer,
  features jsonb,            -- {booking, ecommerce, whatsapp, contact_form}
  fetched_at timestamptz not null default now()
);
create index website_audits_business on website_audits (business_id, fetched_at desc);

create table signals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  type signal_type not null,
  code text not null,        -- p. ej. 'no_https', 'psi_mobile_bajo', 'sin_reservas'
  weight numeric not null,
  evidence jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (business_id, code)
);

create table scores (
  business_id uuid primary key references businesses on delete cascade,
  opportunity numeric not null check (opportunity between 0 and 60),
  viability numeric not null check (viability between 0 and 40),
  total numeric generated always as (opportunity + viability) stored,
  suggested_offer suggested_offer not null,
  computed_at timestamptz not null default now()
);
create index scores_total on scores (total desc);

-- CRM ---------------------------------------------------------------------
create table leads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  business_id uuid not null references businesses on delete cascade,
  stage lead_stage not null default 'nuevo',
  priority smallint not null default 2 check (priority between 1 and 3),
  next_action_at timestamptz,
  estimated_value numeric(12, 2),
  lost_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, business_id)
);
create index leads_next_action on leads (owner_id, next_action_at) where stage not in ('ganado', 'perdido');

create table activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  lead_id uuid not null references leads on delete cascade,
  type activity_type not null,
  content text not null,
  occurred_at timestamptz not null default now()
);

create table settings (
  owner_id uuid primary key default auth.uid() references auth.users on delete cascade,
  scoring_weights jsonb not null default '{}',
  places_monthly_budget integer not null default 1000, -- llamadas/mes
  updated_at timestamptz not null default now()
);

-- Cola de jobs (ADR 0002) ---------------------------------------------------
create table scan_jobs (
  id bigint generated always as identity primary key,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  type job_type not null,
  payload jsonb not null,
  status job_status not null default 'pending',
  attempts smallint not null default 0,
  max_attempts smallint not null default 5,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index scan_jobs_ready on scan_jobs (run_after) where status = 'pending';

-- Toma hasta p_limit jobs listos; recupera los 'running' abandonados (> 5 min).
create function claim_scan_jobs(p_limit integer default 10)
returns setof scan_jobs
language sql
security definer
set search_path = public
as $$
  update scan_jobs j
  set status = 'running', locked_at = now(), attempts = j.attempts + 1, updated_at = now()
  where j.id in (
    select id from scan_jobs
    where (status = 'pending' and run_after <= now())
       or (status = 'running' and locked_at < now() - interval '5 minutes')
    order by run_after
    limit p_limit
    for update skip locked
  )
  returning j.*;
$$;
revoke execute on function claim_scan_jobs from public, anon, authenticated;

-- Utilidades ----------------------------------------------------------------
create function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger businesses_updated_at before update on businesses for each row execute function set_updated_at();
create trigger leads_updated_at before update on leads for each row execute function set_updated_at();
create trigger settings_updated_at before update on settings for each row execute function set_updated_at();
create trigger scan_jobs_updated_at before update on scan_jobs for each row execute function set_updated_at();

-- RLS -----------------------------------------------------------------------
alter table searches enable row level security;
alter table businesses enable row level security;
alter table search_results enable row level security;
alter table website_audits enable row level security;
alter table signals enable row level security;
alter table scores enable row level security;
alter table leads enable row level security;
alter table activities enable row level security;
alter table settings enable row level security;
alter table scan_jobs enable row level security;

-- Datos del usuario: CRUD propio.
create policy own_searches on searches for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy own_leads on leads for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy own_activities on activities for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy own_settings on settings for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy own_jobs_read on scan_jobs for select to authenticated
  using (owner_id = (select auth.uid()));
create policy own_jobs_insert on scan_jobs for insert to authenticated
  with check (owner_id = (select auth.uid()) and status = 'pending' and attempts = 0);

-- Catálogo público de negocios: lectura para usuarios autenticados, escritura solo service role.
create policy read_businesses on businesses for select to authenticated using (true);
create policy read_audits on website_audits for select to authenticated using (true);
create policy read_signals on signals for select to authenticated using (true);
create policy read_scores on scores for select to authenticated using (true);
create policy read_search_results on search_results for select to authenticated
  using (exists (select 1 from searches s where s.id = search_id and s.owner_id = (select auth.uid())));
