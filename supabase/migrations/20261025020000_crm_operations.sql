-- Operación comercial del pipeline: seguimiento, consentimiento y próxima acción.
alter table public.leads
  add column if not exists contact_status text not null default 'no_contactado'
    check (contact_status in ('no_contactado', 'contactado', 'respondio', 'interesado', 'opt_out')),
  add column if not exists do_not_contact boolean not null default false;

create index if not exists leads_contact_status on public.leads (owner_id, contact_status);

-- La política existente limita la actualización a campos de CRM. Extendemos
-- explícitamente la lista para no abrir cambios sobre owner_id/business_id.
revoke update on public.leads from authenticated;
grant update (stage, priority, next_action_at, estimated_value, lost_reason, contact_status, do_not_contact)
  on public.leads to authenticated;
