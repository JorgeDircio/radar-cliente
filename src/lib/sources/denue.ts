import { z } from "zod"

import { websiteUrl } from "@/lib/businesses/contact"
import {
  DiscoveryError,
  type BusinessSource,
  type DiscoveredBusiness,
} from "@/lib/discovery/model"

const text = z
  .string()
  .nullish()
  .transform((value) => value?.trim() || null)
const recordSchema = z.object({
  Id: z.union([z.string().min(1), z.number()]).transform(String),
  Nombre: z.string().trim().min(1),
  Clase_actividad: text,
  CLASE_ACTIVIDAD_ID: text,
  Estrato: text,
  Tipo_vialidad: text,
  Calle: text,
  Num_Exterior: text,
  Num_Interior: text,
  Colonia: text,
  CP: text,
  Ubicacion: text,
  Telefono: text,
  Correo_e: text,
  Sitio_internet: text,
  Latitud: text,
  Longitud: text,
})

function coordinate(value: string | null, limit: number): number | null {
  if (!value) return null
  const number = Number(value)
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null
}

export function parseDenueResponse(value: unknown): DiscoveredBusiness[] {
  // DENUE may return the JSON array as a JSON-encoded string (HTTP 200).
  // Decode that envelope before validating the published record shape.
  if (typeof value === "string") {
    try {
      return parseDenueResponse(JSON.parse(value))
    } catch {
      throw new DiscoveryError(
        "DENUE devolvió una respuesta que no se pudo interpretar.",
        false,
      )
    }
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const payload = value as Record<string, unknown>
    const detail = [payload.error, payload.message, payload.mensaje]
      .find((item): item is string => typeof item === "string")
      ?.toLowerCase()
    if (detail?.includes("token")) {
      throw new DiscoveryError(
        "DENUE rechazó el token configurado. Verifica que sea el token de la API DENUE y vuelve a intentar.",
        false,
      )
    }
  }
  const parsed = z.array(recordSchema).safeParse(value)
  if (!parsed.success)
    throw new DiscoveryError(
      "DENUE devolvió una respuesta que no se pudo interpretar.",
      false,
    )
  return parsed.data.map((record) => {
    const location =
      record.Ubicacion?.split(",").map((part) => part.trim()) ?? []
    return {
      denue_id: record.Id,
      name: record.Nombre,
      scian_code: record.CLASE_ACTIVIDAD_ID,
      scian_label: record.Clase_actividad,
      address:
        [
          record.Tipo_vialidad,
          record.Calle,
          record.Num_Exterior,
          record.Num_Interior,
          record.Colonia,
          record.CP,
          record.Ubicacion,
        ]
          .filter(Boolean)
          .join(" ") || null,
      entidad: location[2] || null,
      municipio: location[1] || null,
      lat: coordinate(record.Latitud, 90),
      lng: coordinate(record.Longitud, 180),
      phone: record.Telefono,
      email: record.Correo_e,
      website: websiteUrl(record.Sitio_internet),
      estrato: record.Estrato,
    }
  })
}

export function createDenueSource(
  token: string,
  fetcher: typeof fetch = fetch,
): BusinessSource {
  return {
    async discover(input, start, end) {
      if (!token.trim())
        throw new DiscoveryError("Falta configurar el acceso a DENUE.", false)
      const path = [input.keywords, input.entidad, start, end, token]
        .map((part) => encodeURIComponent(String(part)))
        .join("/")
      let response: Response
      try {
        response = await fetcher(
          `https://www.inegi.org.mx/app/api/denue/v1/consulta/BuscarEntidad/${path}`,
          {
            headers: { Accept: "application/json" },
            cache: "no-store",
            signal: AbortSignal.timeout(12_000),
            redirect: "error",
          },
        )
      } catch {
        throw new DiscoveryError(
          "DENUE no respondió a tiempo o no está disponible.",
        )
      }
      if (!response.ok) {
        throw new DiscoveryError(
          `DENUE respondió con un error (${response.status}).`,
          response.status === 429 || response.status >= 500,
        )
      }
      let value: unknown
      try {
        value = await response.json()
      } catch {
        throw new DiscoveryError(
          "DENUE devolvió una respuesta que no se pudo interpretar.",
        )
      }
      const businesses = parseDenueResponse(value)
      if (businesses.length > end - start + 1)
        throw new DiscoveryError(
          "DENUE devolvió más registros que los solicitados.",
          false,
        )
      return businesses
    },
  }
}
