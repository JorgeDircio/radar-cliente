# ADR 0002 — Cola de jobs en Postgres (`scan_jobs`) con worker disparado por pg_cron

- **Estado:** Aceptado
- **Fecha:** 2026-10-13

## Contexto

Una búsqueda ("dentistas en Guadalajara") genera decenas o cientos de negocios, y cada uno pasa por varias etapas que llaman a APIs externas lentas o con cuota: `discover → enrich → audit → score`. Esto no cabe en una sola petición HTTP:

- Las funciones serverless de Vercel tienen límite de duración por invocación.
- Vercel Cron en plan **Hobby** solo permite ejecuciones **una vez al día**, insuficiente para procesar una búsqueda en minutos.
- Se quiere evitar otro servicio (Redis, SQS, Inngest, QStash, Trigger.dev) que agregue costo, credenciales y un punto de falla más.

## Decisión

1. **Cola en Postgres:** tabla `scan_jobs` con `type` (`discover` | `enrich` | `audit` | `score`), `payload` (jsonb), `status` (`pending` | `running` | `done` | `failed`), `attempts`, `max_attempts`, `run_after`, `locked_at`, `last_error`, `owner_id`, timestamps.
2. **Un job por etapa y por negocio.** Al terminar una etapa se encola la siguiente; si falla, solo se reintenta esa etapa.
3. **Disparador:** `pg_cron` ejecuta cada minuto un `net.http_post` (`pg_net`) a `POST /api/worker` en Vercel, autenticado con un secreto compartido (header `Authorization: Bearer <WORKER_SECRET>`, guardado en Supabase Vault). La UI también puede invocar el worker al crear una búsqueda para no esperar al siguiente minuto.
4. **Reclamo de jobs con locking:** el worker toma un lote pequeño (N configurable, p. ej. 5–10) en una transacción con

   ```sql
   update scan_jobs set status = 'running', locked_at = now(), attempts = attempts + 1
   where id in (
     select id from scan_jobs
     where status = 'pending' and run_after <= now()
     order by created_at
     limit $1
     for update skip locked
   )
   returning *;
   ```

   `FOR UPDATE SKIP LOCKED` permite invocaciones concurrentes sin procesar dos veces el mismo job. Conviene encapsularlo en una función SQL (`claim_scan_jobs(n)`) llamada vía RPC.
5. **Idempotencia:** cada handler usa upserts por claves naturales (`denue_id`, `place_id`, `business_id` + etapa), de modo que repetir un job no duplica datos.
6. **Reintentos:** si falla, `status = 'pending'`, `run_after = now() + backoff` (exponencial, p. ej. `2^attempts` minutos con tope) y se guarda `last_error`. Al llegar a `max_attempts` (p. ej. 5) queda en `failed` y visible en la UI.
7. **Jobs huérfanos:** un job en `running` con `locked_at` más antiguo que el límite de duración del worker se devuelve a `pending` (barrido en el mismo cron).
8. **Presupuesto por tick:** el worker corta antes de agotar su tiempo y respeta las cuotas de `settings` (p. ej. llamadas diarias a Places).

## Alternativas consideradas

- **Vercel Cron:** en Hobby solo diario; el plan Pro lo resolvería, pero con costo fijo.
- **Servicio de colas externo (QStash, Inngest, Trigger.dev, SQS/Redis):** más robustos, pero otra dependencia, otra cuenta y otro costo para un volumen bajo.
- **Supabase Edge Functions como worker:** viable, pero duplicaría el runtime (Deno) y separaría la lógica de `src/lib/*`. Se mantiene como plan B si Vercel limita.
- **Procesar todo en la petición del usuario:** excede timeouts y bloquea la UI.

## Consecuencias

- (+) Cero infraestructura adicional; la cola es consultable con SQL (progreso del escaneo = conteo por estado).
- (+) Reintentos granulares por etapa; tolerante a fallos de APIs externas.
- (−) Latencia mínima de ~1 minuto entre ticks (mitigada con el disparo inmediato desde la UI).
- (−) Throughput limitado (N jobs por minuto); suficiente para uso personal, a revisar si se vuelve SaaS.
- (−) El endpoint `/api/worker` es público en red: debe validar el secreto y no exponer datos.

## Referencias

- Supabase Cron / pg_cron + pg_net: https://supabase.com/docs/guides/cron
- Vercel Cron Jobs, límites por plan: https://vercel.com/docs/cron-jobs/usage-and-pricing
- PostgreSQL `SKIP LOCKED`: https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE
