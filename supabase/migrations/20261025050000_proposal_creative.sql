-- Dirección creativa versionada para que cada propuesta tenga una identidad estable.
alter table public.proposal_pages
  add column if not exists design_variant text not null default 'editorial'
    check (design_variant in ('editorial', 'clinical', 'local', 'conversion', 'premium', 'bold')),
  add column if not exists creative jsonb not null default '{}'::jsonb;
