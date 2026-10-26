import { describe, expect, it, vi } from "vitest"
import { generateProspectDraft } from "./prospect"

describe("prospect AI adapter", () => {
  it("requests strict structured output and validates the draft", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ output_text: JSON.stringify({
      summary: "Clínica con oportunidad de mejorar reservas.", rationale: "No hay agenda online y el negocio tiene teléfono público.", offer: "sistema_a_medida", whatsappDraft: "Hola, vi su clínica...", websiteDraft: "Detecté una oportunidad...", nextAction: "Revisar y aprobar el mensaje",
    }) }))
    await expect(generateProspectDraft({ business: { name: "Clínica", scianLabel: "Consultorio", website: null, phone: "555", email: null, estrato: "0 a 5" }, audit: null, signals: [], score: null }, fetcher, { apiKey: "test", model: "gpt-test" })).resolves.toMatchObject({ offer: "sistema_a_medida" })
    expect(fetcher).toHaveBeenCalledWith("https://api.openai.com/v1/responses", expect.objectContaining({ method: "POST" }))
  })
  it("rejects malformed model output", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ output_text: "not-json" }))
    await expect(generateProspectDraft({ business: { name: "Clínica", scianLabel: null, website: null, phone: null, email: null, estrato: null }, audit: null, signals: [], score: null }, fetcher, { apiKey: "test", model: "gpt-test" })).rejects.toThrow("formato inválido")
  })
})
