# ADR 0004 — Modelo de scoring y oferta sugerida

- **Estado:** Aceptado
- **Fecha:** 2026-10-13

## Contexto

El radar descubre muchos negocios; el valor está en **ordenarlos** por probabilidad de cerrar una venta y en sugerir **qué venderles**. El modelo debe ser explicable (cada punto con evidencia), ajustable sin desplegar código y fácil de probar.

## Decisión

### Señales
Cada negocio genera registros en `signals` (`type`, `weight`, `evidence` jsonb):

| Señal | Se activa cuando |
|---|---|
| `sin_web` | Sin website en DENUE ni en Places, o el dominio no responde. |
| `web_mala` | Sin HTTPS, no responsive (sin meta viewport), PSI mobile < 50, tecnología obsoleta (p. ej. jQuery viejo, Flash), copyright ≤ 2019, constructor gratuito con subdominio (Wix/Blogger). |
| `procesos_manuales` | Sin reservas/agenda online en giros que lo usan (clínicas, salones, restaurantes), sin tienda online en retail, contacto solo por teléfono/WhatsApp. |
| `actividad` | Rating, número de reseñas, `businessStatus = OPERATIONAL`, estrato DENUE; reseñas con keywords de dolor ("no contestan", "difícil agendar"…). |

### Score (0–100)
**Score = Oportunidad (0–60) + Viabilidad (0–40)**

- **Oportunidad** — cuánto necesita digitalizarse: suma ponderada de `sin_web`, `web_mala` y `procesos_manuales`, acotada a 60.
- **Viabilidad** — probabilidad de que pague y responda: `actividad` (operativo, reseñas, rating, estrato, dolor en reseñas), acotada a 40.
- Un negocio no `OPERATIONAL` tiene viabilidad 0.
- **Pesos configurables** en `settings` (pantalla Ajustes), con valores por defecto versionados en código. Se guarda en `scores` el desglose (`opportunity`, `viability`, `total`, `suggested_offer`, `computed_at`) y los pesos usados.

### Oferta sugerida
Reglas en orden de prioridad:
1. `procesos_manuales` fuerte **y** viabilidad alta → **Sistema a medida**.
2. `sin_web` → **Landing**.
3. `web_mala` → **Rediseño**.
4. Ninguna → sin oferta (prospecto de baja prioridad).

Los umbrales ("fuerte", "alta") son parte de los pesos configurables.

### Implementación
- Funciones **puras** en `src/lib/scoring/*`: `deriveSignals(business, audit, places) → Signal[]`, `computeScore(signals, weights) → Score`, `suggestOffer(signals, score, weights) → Offer`. Sin I/O, sin Supabase.
- Desarrolladas con **TDD (Vitest)** usando fixtures de negocios y auditorías.
- El job `score` del worker (ADR 0002) solo carga datos, llama a estas funciones y persiste. Cambiar pesos permite recalcular encolando jobs `score`.

## Alternativas consideradas

- **Modelo de ML / LLM para puntuar:** sin datos de entrenamiento (cierres) aún y poco explicable; se reconsiderará con historial de leads ganados/perdidos.
- **Score único sin desglose:** más simple, pero impide entender por qué un prospecto está arriba.
- **Reglas en SQL:** difíciles de probar y versionar frente a TypeScript puro.

## Consecuencias

- (+) Explicable: la ficha muestra cada señal con su evidencia y el desglose del score.
- (+) Testeable y ajustable sin migraciones.
- (−) Heurísticas iniciales arbitrarias; habrá que calibrar pesos con resultados reales.
- (−) Las keywords de dolor en reseñas son frágiles; el análisis con LLM queda para después del MVP.
- (−) Recalcular scores tras cambiar pesos genera carga en la cola.
