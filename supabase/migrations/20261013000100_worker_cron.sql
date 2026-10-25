-- Dispara /api/worker cada minuto (ADR 0002).
-- La URL y el secreto viven en Vault para no versionarlos:
--   select vault.create_secret('http://host.docker.internal:3000/api/worker', 'worker_url');
--   select vault.create_secret('<WORKER_SECRET>', 'worker_secret');
-- En local los crea supabase/seed.sql.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create function invoke_worker() returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'worker_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'worker_secret';
  if v_url is null or v_secret is null then
    return; -- sin configurar: no hace nada
  end if;
  if not exists (
    select 1 from scan_jobs
    where (status = 'pending' and run_after <= now())
       or (status = 'running' and locked_at < now() - interval '5 minutes')
  ) then
    return; -- nada que procesar: evita llamadas vacías
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end $$;
revoke execute on function invoke_worker from public, anon, authenticated;

select cron.schedule('radar-worker', '* * * * *', 'select public.invoke_worker()');
