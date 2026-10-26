# ADR 0006 — Skills de propuesta y dirección creativa estable

- **Estado:** Aceptado
- **Fecha:** 2026-10-25

## Contexto

Una sola instrucción para el modelo producía mensajes defensivos y páginas visualmente repetitivas. El producto necesita que cada propuesta conecte una señal pública con una oferta entendible, una voz natural y una landing reconocible para el giro del prospecto.

## Decisión

- Las capacidades de propuesta se organizan como **skills** composables en `src/lib/ai/skills.ts`: posicionamiento de marca, diseño de oferta, voz natural, copy de conversión, guardas de evidencia y dirección artística.
- La IA devuelve un contrato estructurado (`creative`) con voz, titular, subtítulo, pilares de valor, CTA y variante visual; no devuelve JSX ni clases arbitrarias.
- `src/lib/proposals/variants.ts` actúa como seam de dirección creativa. Elige de forma estable entre seis variantes (`editorial`, `clinical`, `local`, `conversion`, `premium`, `bold`) usando el prospecto, su giro y la oferta.
- La landing pública renderiza la variante con componentes seguros y datos escapados. Volver a publicar el mismo prospecto conserva su identidad visual.
- La ausencia de sitio web es una señal válida para proponer una landing, pero no autoriza a afirmar pérdidas, clientes, métricas ni problemas no observados.
- El modelo caro queda reservado para una futura revisión premium; la ruta normal usa un modelo económico y fallbacks configurados en AI Gateway.

## Consecuencias

- (+) Más leverage: cambiar una skill cambia el comportamiento de todas las propuestas sin duplicar prompts.
- (+) Más locality: la selección de oferta, copy y diseño tienen seams testeables y no se mezclan con el renderer público.
- (+) Variación controlada: las páginas no parecen clones ni permiten que el modelo ejecute código.
- (+) El contrato estructurado permite evaluar voz, CTA y pilares de valor con fixtures antes de enviar outreach.
- (−) Se mantienen seis familias visuales; nuevas identidades requieren editar el catálogo de variantes.
- (−) La personalización por marca depende primero de señales públicas y del giro; se puede enriquecer con auditoría y Places bajo presupuesto.

## Relación con ADR 0005

Este ADR reemplaza únicamente el límite de lenguaje de propuesta de ADR 0005. La selección manual de prospectos sigue vigente; lo que cambia es que una señal real (por ejemplo, sitio web no registrado) sí puede convertirse en una oferta explícita sin inventar resultados.
