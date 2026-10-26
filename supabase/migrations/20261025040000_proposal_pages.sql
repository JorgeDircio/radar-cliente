-- Propuestas visuales compartibles y eventos de interés para handoff humano.
create table if not exists public.proposal_pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  lead_id uuid not null references public.leads on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  title text not null,
  summary text not null,
  rationale text not null,
  offer text not null,
  whatsapp_message text,
  cta_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, lead_id)
);

create index if not exists proposal_pages_token on public.proposal_pages (token) where status = 'published';
create trigger proposal_pages_updated_at before update on public.proposal_pages
  for each row execute function public.set_updated_at();

create table if not exists public.proposal_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposal_pages on delete cascade,
  type text not null check (type in ('view', 'cta_clicked')),
  metadata jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);

create index if not exists proposal_events_proposal on public.proposal_events (proposal_id, occurred_at desc);

alter table public.proposal_pages enable row level security;
alter table public.proposal_events enable row level security;

create policy own_proposal_pages on public.proposal_pages for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
