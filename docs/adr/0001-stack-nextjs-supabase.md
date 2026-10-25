# ADR 0001 — Stack: Next.js (App Router) + Supabase + Vercel

- **Estado:** Aceptado
- **Fecha:** 2026-10-13

## Contexto

Radar de Clientes es una herramienta personal de un único desarrollador freelancer para descubrir, auditar, puntuar y dar seguimiento a negocios de todo México que necesitan digitalizarse. Restricciones reales:

- Equipo de una persona; el tiempo de mantenimiento es el recurso más escaso.
- Costo de infraestructura cercano a cero (planes gratuitos siempre que sea posible).
- Dominio pequeño (búsquedas, negocios, señales, scores, leads), pero con trabajo en segundo plano (llamadas a APIs externas, auditorías web).
- Se quiere dejar abierta la puerta a convertirlo en SaaS sin reescribir.

## Decisión

- **Frontend + backend:** Next.js 16 (App Router, TypeScript, Server Components y Server Actions), Tailwind 4 y shadcn/ui. Mapa con MapLibre o Leaflet (gratis). Gestor de paquetes `pnpm`.
- **Datos y plataforma:** Supabase — Postgres como única base de datos, Supabase Auth, `pg_cron` + `pg_net` para tareas programadas (ver ADR 0002). Migraciones versionadas con Supabase CLI (`supabase/migrations`) y desarrollo local con `supabase start`.
- **Deploy:** Vercel (plan Hobby al inicio).
- **Auth y multi-tenant:** un solo usuario, pero todas las tablas de dominio llevan `owner_id` con **RLS** activo desde el día uno.
- **Estructura:** monolito modular con capas ligeras:
  - `src/lib/sources/*` — adaptadores de APIs externas (DENUE, Places, PSI).
  - `src/lib/audit/*` — auditoría del sitio (fetch, detección de tecnología y features).
  - `src/lib/scoring/*` — funciones puras de señales, score y oferta sugerida (ADR 0004).
  - `src/app/*` — UI y rutas (incluido `/api/worker`).
- **Pruebas:** Vitest (unitarias, TDD en `lib/scoring` y `lib/audit`) y Playwright (E2E).

## Alternativas consideradas

- **Microservicios / backend separado (NestJS, FastAPI):** más piezas que desplegar y operar para un equipo de uno; sin beneficio a esta escala.
- **Prisma/Drizzle sobre Postgres propio (Neon, RDS):** obligaría a resolver por separado auth, cron y RLS que Supabase ya trae.
- **Firebase:** modelo documental poco adecuado para consultas relacionales y geoespaciales (filtros por score, señal, distancia).
- **Remix / SvelteKit:** válidos, pero Next.js es el stack que el desarrollador ya domina y el que mejor se integra con Vercel.

## Consecuencias

- (+) Una sola base de código y un solo lenguaje; despliegue trivial; costo inicial ~0.
- (+) RLS por `owner_id` permite evolucionar a SaaS sin migración de datos.
- (+) La lógica de dominio (scoring, auditoría) es pura y testeable, independiente del framework.
- (−) Acoplamiento a Supabase (Auth, `pg_cron`, `pg_net`). Mitigación: el dominio no importa el SDK de Supabase; solo los repositorios y el worker lo hacen.
- (−) Las funciones de Vercel tienen límite de duración; el trabajo pesado debe partirse en lotes pequeños (ADR 0002).
- (−) Next.js 16 introduce cambios respecto a versiones previas; revisar la documentación incluida en `node_modules/next/dist/docs/` antes de usar APIs nuevas (ver `AGENTS.md`).
