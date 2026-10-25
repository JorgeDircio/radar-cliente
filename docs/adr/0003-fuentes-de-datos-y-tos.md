# ADR 0003 — Fuentes de datos, costos y cumplimiento (ToS y LFPDPPP)

- **Estado:** Aceptado
- **Fecha:** 2026-10-13

## Contexto

Para encontrar negocios en todo México y evaluar su presencia digital necesitamos datos de descubrimiento (quién existe y dónde), de enriquecimiento (web, rating, reseñas, estado) y de auditoría (calidad del sitio). Las fuentes tienen costos y términos de uso distintos, y además los datos se refieren a negocios, algunos de personas físicas, por lo que aplica la LFPDPPP.

## Decisión

### 1. DENUE (INEGI) — fuente primaria de descubrimiento (gratis, con token)
Base `https://www.inegi.org.mx/app/api/denue/v1/consulta/`. Métodos que usaremos:
- `Buscar/{condición}/{lat,lng}/{metros}/{token}` — por punto y radio (**máximo 5,000 m**).
- `BuscarEntidad/{condición}/{entidad}/{ini}/{fin}/{token}` — por estado (01–32, 00 = todos), paginado.
- `BuscarAreaActEstr/...` — por área (entidad/municipio/localidad), actividad SCIAN y **estrato** (1: 0–5 personas … 7: 251+), paginado.
- `Ficha/{id}/{token}` — detalle; `Cuantificar/...` — conteos para estimar el tamaño de un escaneo antes de lanzarlo.

Aporta nombre, SCIAN, dirección, lat/lng, teléfono, email, web y estrato. Búsquedas de radio mayor a 5 km se parten en varias celdas.

### 2. Google Places API (New) — solo enriquecimiento de candidatos
- Solo se consulta para negocios que pasan un primer filtro (giro, estrato, falta de datos), nunca para todo el universo DENUE.
- **Field mask obligatorio** (`X-Goog-FieldMask`); Google factura cada petición al SKU más alto de los campos pedidos. Referencia de precios (0–100k/mes, USD por 1,000):

  | SKU | Gratis/mes | Precio |
  |---|---|---|
  | Text Search Essentials (IDs Only) | ilimitado | — |
  | Text Search Pro (nombre, ubicación, dirección) | 5,000 | 32 |
  | Place Details Enterprise (`websiteUri`, `rating`, `userRatingCount`, teléfono, horarios) | 1,000 | 20 |
  | Place Details Enterprise + Atmosphere (`reviews`) | 1,000 | 25 |

- Flujo: Text Search con máscara mínima para el match DENUE↔Places (nombre + distancia) → Place Details con máscara Enterprise. Las **reseñas** (Atmosphere) se piden solo bajo demanda o para candidatos con score alto.
- **Presupuesto:** contador de llamadas por SKU en `settings`; el worker se detiene al alcanzar el límite diario/mensual configurado.
- **Caché y ToS:** `place_id` se almacena **indefinidamente** (exento de las restricciones de caché). El resto del contenido de Places se guarda con `places_fetched_at` y se **refresca o expira en ≤ 30 días**; las señales y el score calculados son datos propios. Al mostrar reseñas o rating se atribuye al autor/Google.

### 3. PageSpeed Insights API (gratis, con API key)
Puntajes de rendimiento, accesibilidad, buenas prácticas y SEO en estrategia `mobile`. Se ejecuta solo si el negocio tiene sitio que responde; respeta la cuota diaria del proyecto de Google Cloud.

### 4. Fetch propio del sitio
`GET` de la página principal con **User-Agent identificable** (`RadarClientesBot/1.0 (+contacto)`), timeout corto (~10 s), límite de tamaño de respuesta, máximo de redirecciones y sin ejecutar JS. Detecta HTTPS, meta viewport, CMS/tecnología, año de copyright y features (reservas, tienda, WhatsApp, formularios). Una sola petición por dominio y por escaneo; se respeta `robots.txt` cuando lo prohíba explícitamente.

### 5. Privacidad (LFPDPPP)
- Solo se recopilan **datos públicos de negocios** (registros DENUE, fichas públicas, sitio web).
- No se hace scraping de redes sociales ni de datos de personas fuera del contexto del negocio.
- El **contacto es manual** (llamada, WhatsApp, email uno a uno); no hay envíos masivos automatizados en el MVP.
- Se permite marcar un prospecto como "no contactar" y borrar sus datos a solicitud.

## Alternativas consideradas

- **Solo Google Places para descubrir:** cobertura buena pero costo alto por búsqueda y restricciones de almacenamiento.
- **Scraping de Google Maps / directorios:** viola ToS y es frágil.
- **Proveedores de datos pagados (Apollo, Outscraper):** costo recurrente y cobertura incierta de PyMEs mexicanas.

## Consecuencias

- (+) Descubrimiento nacional sin costo; Places se usa de forma acotada y medible.
- (+) Cumplimiento razonable de ToS y LFPDPPP por diseño.
- (−) DENUE puede tener datos desactualizados (web/teléfono); por eso se enriquece con Places y se verifica el dominio.
- (−) El match DENUE↔Places es heurístico y puede fallar; se guarda la confianza del match.
- (−) Requiere un job de refresco/expiración de datos de Places.

## Referencias

- API DENUE: https://www.inegi.org.mx/servicios/api_denue.html
- Precios Google Maps Platform: https://developers.google.com/maps/billing-and-pricing/pricing
- Políticas Places API (place_id exento de caché): https://developers.google.com/maps/documentation/places/web-service/policies
- Términos específicos de servicio de Google Maps Platform: https://cloud.google.com/maps-platform/terms/maps-service-terms
- PageSpeed Insights API: https://developers.google.com/speed/docs/insights/v5/get-started
- LFPDPPP: https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf
