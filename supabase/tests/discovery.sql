-- Runs in a rollback-only transaction against local Supabase (supabase test db).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

create temporary table radar_test_ids (
  owner_id uuid, other_id uuid, search_id uuid, job_id bigint,
  old_token uuid, lock_token uuid, business_id uuid
);
insert into radar_test_ids(owner_id, other_id) values (gen_random_uuid(), gen_random_uuid());
insert into auth.users(id) select owner_id from radar_test_ids union all select other_id from radar_test_ids;
grant all on radar_test_ids to authenticated, service_role;

set local role authenticated;
select set_config('request.jwt.claim.sub', (select owner_id::text from radar_test_ids), true);
update radar_test_ids set search_id = public.create_discovery_search('dentistas', '14', 100);
select is((select count(*) from public.searches), 1::bigint, 'Owner sees their search');
select is((select count(*) from public.scan_jobs), 1::bigint, 'Creating a search also creates exactly one job');
select throws_ok($$select public.create_discovery_search('x', '99', 1000)$$, '22023', 'Invalid search', 'Database validates search bounds');
select throws_ok($$insert into public.scan_jobs(type, payload) values ('discover', '{}')$$, '42501', null, 'Client cannot inject queue jobs');
select throws_ok($$select * from public.claim_scan_jobs()$$, '42501', null, 'Client cannot claim jobs');
select throws_ok($$update public.searches set max_results = 500$$, '42501', null, 'Client cannot rewrite administrative search fields');

set local role service_role;
with claimed as (select * from public.claim_scan_jobs(1, (select search_id from radar_test_ids)))
update radar_test_ids set job_id = claimed.id, old_token = claimed.lock_token, lock_token = claimed.lock_token from claimed;
select is((select count(*) from public.claim_scan_jobs(1, (select search_id from radar_test_ids))), 0::bigint, 'An active lease cannot be claimed twice');

-- Simulate a process that died. The replacement gets a distinct fencing token.
update public.scan_jobs set locked_at = now() - interval '6 minutes' where id = (select job_id from radar_test_ids);
with claimed as (select * from public.claim_scan_jobs(1, (select search_id from radar_test_ids)))
update radar_test_ids set lock_token = claimed.lock_token from claimed;
select isnt((select lock_token from radar_test_ids), (select old_token from radar_test_ids), 'Recovery invalidates the old lease');
select throws_ok($$select public.complete_discovery_job((select job_id from radar_test_ids), (select old_token from radar_test_ids), '[]')$$, 'P0002', 'Lease expired', 'A late worker cannot complete a recovered job');
select public.fail_discovery_job((select job_id from radar_test_ids), (select old_token from radar_test_ids), 'late error');
select is((select status::text from public.scan_jobs where id = (select job_id from radar_test_ids)), 'running', 'A late failure cannot overwrite the replacement');

-- Duplicate provider entries are persisted once, with search results in the same transaction.
select public.complete_discovery_job(
  (select job_id from radar_test_ids), (select lock_token from radar_test_ids),
  (select jsonb_build_array(
    jsonb_build_object('denue_id', 'test-' || owner_id, 'name', 'Clínica de prueba'),
    jsonb_build_object('denue_id', 'test-' || owner_id, 'name', 'Clínica de prueba')
  ) from radar_test_ids)
);
update radar_test_ids set business_id = (select business_id from public.search_results where search_id = radar_test_ids.search_id);
select is((select count(*) from public.search_results where search_id = (select search_id from radar_test_ids)), 1::bigint, 'Duplicate businesses do not duplicate results');
select is((select status from public.searches where id = (select search_id from radar_test_ids)), 'done', 'Last page completes the search');
select throws_ok($$select public.complete_discovery_job((select job_id from radar_test_ids), (select lock_token from radar_test_ids), '[]')$$, 'P0002', 'Lease expired', 'Completion cannot be replayed');

set local role authenticated;
insert into public.leads(business_id) select business_id from radar_test_ids;
select is((select contact_status from public.leads), 'no_contactado', 'New leads start without contact');
select is((select do_not_contact from public.leads), false, 'New leads can be contacted by default');
update public.leads set stage = 'contactado';
update public.leads set contact_status = 'interesado', do_not_contact = true;
select is((select contact_status from public.leads), 'interesado', 'Owner can update contact status');
select is((select do_not_contact from public.leads), true, 'Owner can mark a lead as no contact');
insert into public.leads(business_id) select business_id from radar_test_ids on conflict (owner_id, business_id) do nothing;
select is((select count(*) from public.leads), 1::bigint, 'Adding an existing lead does not duplicate it');
select is((select stage::text from public.leads), 'contactado', 'Adding an existing lead preserves its stage');

select set_config('request.jwt.claim.sub', (select other_id::text from radar_test_ids), true);
select is((select count(*) from public.searches), 0::bigint, 'Another user cannot read searches');
select is((select count(*) from public.scan_jobs), 0::bigint, 'Another user cannot read job errors or payloads');
select is((select count(*) from public.search_results), 0::bigint, 'Another user cannot read search results');
select is((select count(*) from public.leads), 0::bigint, 'Another user cannot read leads');
select throws_ok($$insert into public.leads(business_id) select business_id from radar_test_ids$$, '42501', null, 'A business outside the user searches cannot enter their pipeline');
select throws_ok($$select public.retry_discovery_search((select search_id from radar_test_ids))$$, 'P0002', 'Search not retryable', 'Another user cannot retry the search');

select set_config('request.jwt.claim.sub', (select owner_id::text from radar_test_ids), true);
update radar_test_ids set search_id = public.create_discovery_search('panaderías', '14', 50);
set local role service_role;
with claimed as (select * from public.claim_scan_jobs(1, (select search_id from radar_test_ids)))
update radar_test_ids set job_id = claimed.id, lock_token = claimed.lock_token from claimed;
select public.fail_discovery_job((select job_id from radar_test_ids), (select lock_token from radar_test_ids), 'Temporal', 120);
select is((select count(*) from public.claim_scan_jobs(1, (select search_id from radar_test_ids))), 0::bigint, 'Backoff prevents an early retry');

update public.scan_jobs set status = 'running', attempts = max_attempts, locked_at = now() - interval '6 minutes' where id = (select job_id from radar_test_ids);
select is((select count(*) from public.claim_scan_jobs(1, (select search_id from radar_test_ids))), 0::bigint, 'Exhausted jobs are never reclaimed');
select is((select status from public.searches where id = (select search_id from radar_test_ids)), 'failed', 'Exhaustion is visible on the search');
set local role authenticated;
select public.retry_discovery_search((select search_id from radar_test_ids));
select is((select attempts::integer from public.scan_jobs where id = (select job_id from radar_test_ids)), 0, 'Owner can retry a failed scan');
select public.create_discovery_search('talleres', '14', 50);
select public.create_discovery_search('restaurantes', '14', 50);
select throws_ok($$select public.create_discovery_search('hoteles', '14', 50)$$, 'P0001', 'Too many active searches', 'Per-user active search limit is enforced');

reset role;
select * from finish();
rollback;
