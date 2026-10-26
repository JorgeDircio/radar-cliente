# Radar de Clientes

Herramienta personal para descubrir negocios mexicanos y dar seguimiento a oportunidades freelance. Producto y evolución previstos en [docs/producto.md](docs/producto.md).

## Flujo implementado

1. Crea una cuenta en `/signup` o inicia sesión en `/login` con Supabase Auth. En local las confirmaciones de correo están desactivadas; en un proyecto hospedado el usuario normalmente debe confirmar su email.
2. Busca un giro o palabra clave en uno de los 32 estados. Elige un máximo de 1 a 500 registros.
3. La búsqueda se guarda junto con su primer trabajo en una transacción. Se permiten hasta tres búsquedas activas por usuario.
4. El worker consulta DENUE en páginas de hasta 50 negocios. Cada lote guarda negocios, relaciones y siguiente trabajo de forma atómica. Un fallo no pierde las páginas anteriores.
5. El Radar muestra progreso, resultados paginados, sitio registrado y teléfono. Puedes agregar negocios a tu pipeline y cambiar su etapa.
6. En Búsquedas puedes volver a resultados anteriores. Un escaneo fallido puede reintentarse desde su Radar.

**Pendiente:** mapas, búsqueda por municipio/radio, Google Places, auditoría web, señales y scoring, notas/recordatorios, re-escaneo programado y configuración de pesos. Un negocio sin web en DENUE aparece como **sin web registrada**; todavía no se ha auditado. El pipeline permite selección manual antes de disponer del scoring.

## Desarrollo local

Requisitos: Node 22 (o Node 20.9+ y menor que 25), pnpm 10, Supabase CLI y Docker. Next.js 16.4 no arranca correctamente con Node 25.

```bash
pnpm install
supabase start
cp .env.example .env.local
```

Si usas `nvm`, ejecuta `nvm use` para tomar la versión indicada por `.nvmrc` antes de `pnpm dev`.

Completa `.env.local` con los valores de tu Supabase local y tu token de [DENUE, INEGI](https://www.inegi.org.mx/servicios/api_denue.html):

- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: acceso público a Supabase.
- `SUPABASE_SECRET_KEY`: solo servidor; permite al worker escribir el catálogo.
- `WORKER_SECRET`: al menos 16 caracteres. Debe coincidir con `worker_secret` en Supabase Vault.
- `DENUE_TOKEN`: requerido para descubrir negocios.
- Las claves de Google Places y PageSpeed quedan reservadas para los próximos módulos.

El seed configura Vault para `http://host.docker.internal:3000/api/worker` con un secreto **exclusivamente local**, indicado en `supabase/seed.sql`. Si cambias puerto o secreto, actualiza también Vault. No uses ese secreto en producción.

En una base local existente, aplica las migraciones pendientes sin borrar datos:

```bash
supabase migration up --local
pnpm dev
```

Crea un usuario desde Authentication en Supabase Studio y entra en `http://localhost:3000/login`. Ajustes muestra si las credenciales necesarias están presentes, sin exponer sus valores. Las conexiones se comprueban al lanzar el escaneo.

## Worker y recuperación

- `POST /api/worker` exige `Authorization: Bearer <WORKER_SECRET>` y no usa cookies de sesión.
- `pg_cron` llama al endpoint cada minuto únicamente si hay trabajos disponibles. En despliegue, configura `worker_url` y `worker_secret` en Vault.
- Crear/reintentar una búsqueda inicia un intento inmediato con `after()`; el cron recupera el trabajo si ese intento se interrumpe.
- Una invocación procesa hasta dos páginas, con timeout de 12 segundos por petición a DENUE.
- Los fallos transitorios usan espera exponencial y máximo de cinco intentos. Los errores permanentes requieren intervención.
- Los bloqueos vencen después de cinco minutos. Un token de bloqueo evita escrituras de trabajadores que hayan perdido su turno.
- Solo se procesan trabajos `discover` en esta entrega. Las etapas `enrich`, `audit` y `score` quedan pendientes.

## Arquitectura y pruebas

El caso de uso de descubrimiento depende de interfaces pequeñas (`BusinessSource`, `DiscoveryRepository`). El adaptador DENUE maneja HTTP y normalización; el repositorio Supabase maneja persistencia. Next.js se encarga de sesión, acciones y presentación. Ver [ADR 0005](docs/adr/0005-primer-flujo-de-descubrimiento.md).

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
supabase test db
```

Las pruebas unitarias usan respuestas simuladas de DENUE y no requieren token. Las pruebas SQL comprueban transacciones, duplicados, reintentos y aislamiento de usuarios dentro de una transacción que se revierte al terminar. No usan ni modifican un Supabase remoto.

Los tipos de la base se generan desde las migraciones aplicadas:

```bash
supabase gen types typescript --local --schema public > src/lib/supabase/database.types.ts
```

El catálogo de negocios es compartido y legible por usuarios autenticados; búsquedas, resultados y pipeline son privados. Antes de añadir scoring por usuario, habrá que decidir cómo se relacionan los pesos personales con la tabla global `scores`.
