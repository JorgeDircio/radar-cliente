-- A search and its queue entry are one transaction. Only the worker writes the catalog.
alter table public.searches
  add column max_results integer not null default 100 check (max_results between 1 and 500),
  add column status text not null default 'pending' check (status in ('pending', 'running', 'done', 'failed')),
  add constraint searches_id_owner_unique unique (id, owner_id);

alter table public.scan_jobs
  add column search_id uuid,
  add column lock_token uuid,
  add constraint scan_jobs_search_owner_fk foreign key (search_id, owner_id)
    references public.searches(id, owner_id) on delete cascade;

create index searches_owner_created on public.searches (owner_id, created_at desc, id);
create index scan_jobs_search on public.scan_jobs (search_id);
create unique index discovery_page_unique on public.scan_jobs (search_id, ((payload->>'start')::integer))
  where type = 'discover' and search_id is not null;
create index search_results_business on public.search_results (business_id);
create index activities_lead on public.activities (lead_id);

-- No client-supplied queue payloads or administrative search fields.
revoke insert, update on public.searches from authenticated;
revoke insert, update, delete on public.scan_jobs from authenticated;
drop policy own_jobs_insert on public.scan_jobs;

create function public.create_discovery_search(p_keywords text, p_entidad text, p_max_results integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_id uuid;
begin
  if v_owner is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_keywords is null or length(trim(p_keywords)) not between 2 and 100
    or p_entidad is null or p_entidad !~ '^(0[1-9]|[12][0-9]|3[0-2])$'
    or p_max_results is null or p_max_results not between 1 and 500 then
    raise exception 'Invalid search' using errcode = '22023';
  end if;
  -- Serialize requests from the same user, including concurrent browser tabs.
  perform pg_advisory_xact_lock(hashtextextended(v_owner::text, 0));
  if (select count(*) from public.searches where owner_id = v_owner and status in ('pending', 'running')) >= 3 then
    raise exception 'Too many active searches' using errcode = 'P0001';
  end if;
  insert into public.searches(owner_id, keywords, entidad, max_results)
    values (v_owner, trim(p_keywords), p_entidad, p_max_results) returning id into v_id;
  insert into public.scan_jobs(owner_id, search_id, type, payload)
    values (v_owner, v_id, 'discover', '{"start":1}');
  return v_id;
end $$;
revoke all on function public.create_discovery_search(text, text, integer) from public, anon;
grant execute on function public.create_discovery_search(text, text, integer) to authenticated;

drop function public.claim_scan_jobs(integer);
create function public.claim_scan_jobs(p_limit integer default 1, p_search_id uuid default null)
returns setof public.scan_jobs language plpgsql security definer set search_path = '' as $$
begin
  with exhausted as (
    update public.scan_jobs set status = 'failed', lock_token = null, locked_at = null,
      last_error = 'Se agotaron los intentos de procesamiento.'
    where type = 'discover' and attempts >= max_attempts
      and (status = 'pending' or (status = 'running' and locked_at < now() - interval '5 minutes'))
      and (p_search_id is null or search_id = p_search_id)
    returning search_id
  )
  update public.searches set status = 'failed' where id in (select search_id from exhausted);

  return query
  with claimed as (
    update public.scan_jobs j set status = 'running', locked_at = now(),
      lock_token = gen_random_uuid(), attempts = j.attempts + 1
    where j.id in (
      select q.id from public.scan_jobs q
      where q.type = 'discover' and q.search_id is not null and q.attempts < q.max_attempts
        and (p_search_id is null or q.search_id = p_search_id)
        and ((q.status = 'pending' and q.run_after <= now())
          or (q.status = 'running' and q.locked_at < now() - interval '5 minutes'))
      order by q.run_after, q.id
      limit greatest(1, least(coalesce(p_limit, 1), 3))
      for update skip locked
    ) returning j.*
  ), updated_searches as (
    update public.searches set status = 'running', last_run_at = now()
      where id in (select search_id from claimed)
  ) select * from claimed;
end $$;
revoke all on function public.claim_scan_jobs(integer, uuid) from public, anon, authenticated;
grant execute on function public.claim_scan_jobs(integer, uuid) to service_role;

create function public.complete_discovery_job(p_job_id bigint, p_lock_token uuid, p_businesses jsonb, p_next_start integer default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_job public.scan_jobs;
  v_max integer;
begin
  select * into v_job from public.scan_jobs
    where id = p_job_id and lock_token = p_lock_token and status = 'running' for update;
  if not found then raise exception 'Lease expired' using errcode = 'P0002'; end if;
  select max_results into v_max from public.searches where id = v_job.search_id;
  if jsonb_typeof(p_businesses) <> 'array' or jsonb_array_length(p_businesses) > 50
    or (p_next_start is not null and (p_next_start > v_max or p_next_start <> (v_job.payload->>'start')::integer + 50)) then
    raise exception 'Invalid discovery batch' using errcode = '22023';
  end if;

  with records as (
    select distinct on (denue_id) * from jsonb_to_recordset(p_businesses) as b(
      denue_id text, name text, scian_code text, scian_label text, address text,
      entidad text, municipio text, lat double precision, lng double precision,
      phone text, email text, website text, estrato text
    ) order by denue_id
  ), saved as (
    insert into public.businesses as existing
      (denue_id, name, scian_code, scian_label, address, entidad, municipio, lat, lng, phone, email, website, estrato)
    select denue_id, name, scian_code, scian_label, address, entidad, municipio, lat, lng, phone, email, website, estrato from records
    on conflict (denue_id) do update set
      name = excluded.name, scian_code = coalesce(excluded.scian_code, existing.scian_code),
      scian_label = excluded.scian_label, address = excluded.address,
      entidad = excluded.entidad, municipio = excluded.municipio, lat = excluded.lat, lng = excluded.lng,
      phone = coalesce(excluded.phone, existing.phone), email = coalesce(excluded.email, existing.email),
      website = coalesce(excluded.website, existing.website), estrato = excluded.estrato
    returning id
  )
  insert into public.search_results(search_id, business_id)
    select v_job.search_id, id from saved on conflict do nothing;

  update public.scan_jobs set status = 'done', locked_at = null, lock_token = null, last_error = null where id = v_job.id;
  if p_next_start is not null then
    insert into public.scan_jobs(owner_id, search_id, type, payload)
      values (v_job.owner_id, v_job.search_id, 'discover', jsonb_build_object('start', p_next_start))
      on conflict do nothing;
  end if;
  update public.searches set status = case when p_next_start is null then 'done' else 'pending' end
    where id = v_job.search_id;
end $$;
revoke all on function public.complete_discovery_job(bigint, uuid, jsonb, integer) from public, anon, authenticated;
grant execute on function public.complete_discovery_job(bigint, uuid, jsonb, integer) to service_role;

create function public.fail_discovery_job(p_job_id bigint, p_lock_token uuid, p_message text, p_retry_seconds integer default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_job public.scan_jobs; v_retry boolean;
begin
  select * into v_job from public.scan_jobs
    where id = p_job_id and lock_token = p_lock_token and status = 'running' for update;
  if not found then return; end if; -- A late process cannot overwrite a newer lease.
  v_retry := p_retry_seconds is not null and v_job.attempts < v_job.max_attempts;
  update public.scan_jobs set status = case when v_retry then 'pending'::public.job_status else 'failed'::public.job_status end,
    run_after = now() + make_interval(secs => greatest(1, least(coalesce(p_retry_seconds, 0), 1800))),
    last_error = left(p_message, 300), locked_at = null, lock_token = null where id = v_job.id;
  update public.searches set status = case when v_retry then 'pending' else 'failed' end where id = v_job.search_id;
end $$;
revoke all on function public.fail_discovery_job(bigint, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.fail_discovery_job(bigint, uuid, text, integer) to service_role;

create function public.retry_discovery_search(p_search_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid();
begin
  if v_owner is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_owner::text, 0));
  if (select count(*) from public.searches where owner_id = v_owner and status in ('pending', 'running')) >= 3 then
    raise exception 'Too many active searches' using errcode = 'P0001';
  end if;
  perform 1 from public.searches where id = p_search_id and owner_id = v_owner and status = 'failed' for update;
  if not found then raise exception 'Search not retryable' using errcode = 'P0002'; end if;
  update public.scan_jobs set status = 'pending', attempts = 0, run_after = now(),
    locked_at = null, lock_token = null, last_error = null
    where search_id = p_search_id and owner_id = v_owner and status = 'failed';
  update public.searches set status = 'pending' where id = p_search_id;
end $$;
revoke all on function public.retry_discovery_search(uuid) from public, anon;
grant execute on function public.retry_discovery_search(uuid) to authenticated;

-- Only businesses found in the user's searches can enter their pipeline.
drop policy own_leads on public.leads;
create policy own_leads_read on public.leads for select to authenticated using (owner_id = (select auth.uid()));
create policy own_leads_insert on public.leads for insert to authenticated
  with check (owner_id = (select auth.uid()) and exists (
    select 1 from public.search_results r join public.searches s on s.id = r.search_id
    where r.business_id = leads.business_id and s.owner_id = (select auth.uid())
  ));
create policy own_leads_update on public.leads for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy own_leads_delete on public.leads for delete to authenticated using (owner_id = (select auth.uid()));
revoke update on public.leads from authenticated;
grant update (stage, priority, next_action_at, estimated_value, lost_reason) on public.leads to authenticated;

-- Activities must reference a lead owned by the same user, even through the Data API.
drop policy own_activities on public.activities;
create policy own_activities on public.activities for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and exists (
    select 1 from public.leads l where l.id = activities.lead_id and l.owner_id = (select auth.uid())
  ));
