# ADR 0005 — Primer recorrido funcional y límites de responsabilidad

- **Estado:** Aceptado
- **Fecha:** 2026-10-25

## Decisión

Completar primero búsqueda por giro + estado → descubrimiento DENUE → resultados → selección manual en pipeline. La auditoría y el scoring se implementarán sobre datos reales en una entrega posterior. Esta selección manual amplía el flujo inicial del producto: no exige que el negocio ya haya sido auditado.

Se conserva el monolito Next.js + Supabase, sin contenedor de inyección ni jerarquías de clases. SOLID se aplica mediante responsabilidades concretas:

- `lib/discovery/worker.ts`: orquesta una página, sin importar Next.js ni Supabase. Recibe `BusinessSource` y `DiscoveryRepository`.
- `lib/sources/denue.ts`: implementa la fuente HTTP y convierte respuestas externas en datos del dominio. Valida la respuesta y sanea los errores para no guardar tokens incluidos en URLs.
- `lib/discovery/repository.ts`: implementa persistencia a través de RPC tipadas.
- Funciones SQL: garantizan atomicidad, deduplicación, permisos y exclusión mutua, independientemente del cliente.
- `lib/auth.ts` y módulos `queries.ts`: verifican la sesión cerca de los datos, acotan las proyecciones y paginan las consultas.
- Server Actions: validan entradas, autorizan y coordinan la persistencia y la invalidación. Componentes cliente solo para formularios y actualización de progreso.

## Consistencia y seguridad

Una transacción crea búsqueda y trabajo. Otra persiste la página, marca el trabajo como terminado y encola la siguiente. Los negocios se deduplican por `denue_id` y cada búsqueda conserva sus propias relaciones.

`SKIP LOCKED` evita reclamar simultáneamente el mismo trabajo. Cada reclamo genera un `lock_token`; una respuesta atrasada no puede completar ni fallar un trabajo cuyo bloqueo ya cambió. La recuperación de huérfanos respeta `max_attempts`.

La cola solo se escribe mediante funciones autorizadas. El cliente no puede inyectar payloads ni aumentar el tamaño del escaneo. El límite de tres búsquedas activas se serializa por usuario. El esquema también verifica que cada trabajo pertenezca al dueño de su búsqueda y cada actividad al dueño de su lead.

Los datos públicos de negocios siguen compartidos, como en la migración inicial. Las búsquedas, sus relaciones y los leads usan RLS. No se presenta el catálogo compartido como aislamiento completo de un SaaS; la personalización del scoring requiere una decisión posterior.

## Límites deliberados

- Hasta 500 registros por búsqueda, páginas DENUE de 50 y dos páginas por invocación.
- Búsqueda por estado; sin mapa, municipio ni radio en esta entrega.
- Reintentos automáticos para fallos transitorios y reintento manual para búsquedas fallidas.
- Sin puntuaciones ni ofertas inventadas a partir de la mera ausencia de un sitio registrado.
- Las búsquedas históricas se conservan, pero todavía no se reejecutan periódicamente.

## Validación

Vitest prueba el adaptador, las reglas de paginación/reintento, los enlaces de contacto y la autenticación del worker. pgTAP prueba el comportamiento real de las funciones, los permisos y RLS con dos usuarios; todos los datos de prueba se revierten.
