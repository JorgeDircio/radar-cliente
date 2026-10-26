import { describe, expect, it, vi } from "vitest"
import { createDenueSource, parseDenueResponse } from "./denue"

const record = {
  Id: "123",
  Nombre: "  Clínica del Centro  ",
  Ubicacion: "CENTRO, Guadalajara, Jalisco",
  Clase_actividad: "Consultorios dentales",
  Sitio_internet: "WWW.EJEMPLO.MX",
  Telefono: "3330000000",
  Latitud: "20.67",
  Longitud: "-103.35",
  Correo_e: "",
  Estrato: "6 a 10 personas",
}
const query = { keywords: "clínicas/dentales", entidad: "14", maxResults: 100 }

describe("DENUE adapter", () => {
  it("normalizes the published INEGI response and preserves unavailable values", () => {
    const [business] = parseDenueResponse([record])
    expect(business).toMatchObject({
      denue_id: "123",
      name: "Clínica del Centro",
      website: "https://www.ejemplo.mx/",
      municipio: "Guadalajara",
      entidad: "Jalisco",
      lat: 20.67,
      lng: -103.35,
      email: null,
    })
  })
  it("accepts an empty result without inventing businesses", () => {
    expect(parseDenueResponse([])).toEqual([])
  })
  it("decodes the JSON-encoded string returned by DENUE", () => {
    expect(parseDenueResponse(JSON.stringify([record]))[0]).toMatchObject({
      denue_id: "123",
      name: "Clínica del Centro",
    })
  })
  it("rejects an error payload even when HTTP status is 200", () => {
    expect(() => parseDenueResponse({ error: "invalid token" })).toThrow(
      "DENUE rechazó el token configurado",
    )
    expect(() => parseDenueResponse([{ Nombre: "Missing ID" }])).toThrow()
  })
  it("explains token errors returned as a successful HTTP payload", () => {
    expect(() => parseDenueResponse({ error: "Token inválido" })).toThrow(
      "DENUE rechazó el token configurado",
    )
  })
  it("does not convert empty coordinates into a location at 0,0", () => {
    expect(
      parseDenueResponse([{ ...record, Latitud: "", Longitud: "200" }])[0],
    ).toMatchObject({ lat: null, lng: null })
  })
  it("encodes each URL segment and requests the exact page", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json([record]))
    await createDenueSource("private-token", fetcher).discover(query, 51, 100)
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining(
        "BuscarEntidad/cl%C3%ADnicas%2Fdentales/14/51/100/",
      ),
      expect.objectContaining({ cache: "no-store", redirect: "error" }),
    )
  })
  it.each([
    [429, true],
    [503, true],
    [401, false],
    [403, false],
  ])("classifies HTTP %s for retries", async (status, retryable) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status }))
    await expect(
      createDenueSource("private-token", fetcher).discover(query, 1, 50),
    ).rejects.toMatchObject({ retryable })
  })
  it("never leaks a token through a failed fetch", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("failed: /private-token"))
    await expect(
      createDenueSource("private-token", fetcher).discover(query, 1, 50),
    ).rejects.toThrow("DENUE no respondió")
  })
})
