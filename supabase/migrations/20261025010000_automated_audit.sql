-- Queue one audit per business discovered by a search. The unique index makes
-- enqueueing idempotent when a discovery page is retried.
create unique index if not exists audit_job_business_unique
  on public.scan_jobs (search_id, ((payload->>'business_id')::uuid))
  where type = 'audit' and search_id is not null;

create or replace function public.enqueue_audit_jobs(p_search_id uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.scan_jobs(owner_id, search_id, type, payload)
  select s.owner_id, s.id, 'audit'::public.job_type,
    jsonb_build_object('business_id', r.business_id)
  from public.search_results r
  join public.searches s on s.id = r.search_id
  where r.search_id = p_search_id
  on conflict (search_id, ((payload->>'business_id')::uuid))
    where type = 'audit' and search_id is not null do nothing;
$$;
revoke all on function public.enqueue_audit_jobs(uuid) from public, anon, authenticated;
grant execute on function public.enqueue_audit_jobs(uuid) to service_role;

drop function if exists public.claim_scan_jobs(integer, uuid);
create function public.claim_scan_jobs(
  p_limit integer default 1,
  p_search_id uuid default null,
  p_type public.job_type default null
)
returns setof public.scan_jobs language plpgsql security definer set search_path = '' as $$
begin
  with exhausted as (
    update public.scan_jobs set status = 'failed', lock_token = null, locked_at = null,
      last_error = 'Se agotaron los intentos de procesamiento.'
    where attempts >= max_attempts
      and (status = 'pending' or (status = 'running' and locked_at < now() - interval '5 minutes'))
      and (p_search_id is null or search_id = p_search_id)
      and (p_type is null or type = p_type)
    returning search_id
  )
  update public.searches set status = 'failed'
    where id in (select search_id from exhausted where search_id is not null);

  return query
  with claimed as (
    update public.scan_jobs j set status = 'running', locked_at = now(),
      lock_token = gen_random_uuid(), attempts = j.attempts + 1
    where j.id in (
      select q.id from public.scan_jobs q
      where q.search_id is not null and q.attempts < q.max_attempts
        and (p_search_id is null or q.search_id = p_search_id)
        and (p_type is null or q.type = p_type)
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
revoke all on function public.claim_scan_jobs(integer, uuid, public.job_type) from public, anon, authenticated;
grant execute on function public.claim_scan_jobs(integer, uuid, public.job_type) to service_role;

create function public.complete_audit_job(
  p_job_id bigint,
  p_lock_token uuid,
  p_audit jsonb,
  p_signals jsonb,
  p_score jsonb
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_job public.scan_jobs;
  v_business_id uuid;
begin
  select * into v_job from public.scan_jobs
    where id = p_job_id and lock_token = p_lock_token and status = 'running' for update;
  if not found or v_job.type <> 'audit' then raise exception 'Lease expired' using errcode = 'P0002'; end if;
  v_business_id := (v_job.payload->>'business_id')::uuid;

  if p_audit is not null then
    insert into public.website_audits(
      business_id, url, reachable, https, responsive, psi_scores, tech,
      copyright_year, features, fetched_at
    ) values (
      v_business_id,
      p_audit->>'url',
      coalesce((p_audit->>'reachable')::boolean, false),
      (p_audit->>'https')::boolean,
      (p_audit->>'responsive')::boolean,
      p_audit->'psiScores',
      p_audit->'tech',
      nullif(p_audit->>'copyrightYear', '')::integer,
      p_audit->'features',
      coalesce((p_audit->>'fetchedAt')::timestamptz, now())
    );
  end if;

  delete from public.signals where business_id = v_business_id;
  insert into public.signals(business_id, type, code, weight, evidence)
  select v_business_id, (item->>'type')::public.signal_type, item->>'code',
    (item->>'weight')::numeric, coalesce(item->'evidence', '{}'::jsonb)
  from jsonb_array_elements(coalesce(p_signals, '[]'::jsonb)) item;

  insert into public.scores(business_id, opportunity, viability, suggested_offer)
  values (
    v_business_id,
    (p_score->>'opportunity')::numeric,
    (p_score->>'viability')::numeric,
    (p_score->>'suggestedOffer')::public.suggested_offer
  )
  on conflict (business_id) do update set
    opportunity = excluded.opportunity,
    viability = excluded.viability,
    suggested_offer = excluded.suggested_offer,
    computed_at = now();

  update public.scan_jobs set status = 'done', locked_at = null, lock_token = null,
    last_error = null where id = v_job.id;
  update public.searches set status = 'done'
    where id = v_job.search_id
      and not exists (
        select 1 from public.scan_jobs
        where search_id = v_job.search_id and status in ('pending', 'running')
      );
end $$;
revoke all on function public.complete_audit_job(bigint, uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.complete_audit_job(bigint, uuid, jsonb, jsonb, jsonb) to service_role;
