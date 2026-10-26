-- Mensajes de outreach trazables. El MVP usa proveedor sandbox; los adaptadores
-- reales (WhatsApp/email) pueden reutilizar esta cola sin cambiar el CRM.
create table if not exists public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  lead_id uuid not null references public.leads on delete cascade,
  channel text not null check (channel in ('whatsapp', 'email')),
  status text not null default 'draft' check (status in ('draft', 'simulated', 'queued', 'sent', 'replied', 'failed', 'opt_out')),
  content text not null check (char_length(content) between 2 and 4000),
  provider_message_id text,
  error_message text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outreach_messages_lead on public.outreach_messages (lead_id, created_at desc);
create index if not exists outreach_messages_queue on public.outreach_messages (status, scheduled_at)
  where status = 'queued';

create trigger outreach_messages_updated_at before update on public.outreach_messages
  for each row execute function public.set_updated_at();

alter table public.outreach_messages enable row level security;

create policy own_outreach_messages on public.outreach_messages for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
