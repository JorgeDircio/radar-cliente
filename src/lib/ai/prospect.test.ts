import { describe, expect, it, vi } from "vitest"
import { generateProspectDraft, prospectDraftSchema, type ProspectContext } from "./prospect"

const context: ProspectContext = {
  business: { name: "Clínica", scianLabel: "Consultorio", website: null, phone: "555", email: null, estrato: "0 a 5" },
  audit: null,
  signals: [],
  score: null,
}

describe("prospect AI adapter", () => {
  it("uses structured output and configures model fallbacks", async () => {
    const generate = vi.fn().mockResolvedValue({ output: prospectDraftSchema.parse({
      summary: "Clínica con oportunidad de mejorar reservas.", rationale: "No hay agenda online y el negocio tiene teléfono público.", offer: "sistema_a_medida", whatsappDraft: "Hola, vi su clínica...", websiteDraft: "Detecté una oportunidad...", nextAction: "Revisar y aprobar el mensaje",
    }) })
    await expect(generateProspectDraft(context, { model: "openai/gpt-test", fallbackModels: ["anthropic/test-model"] }, generate)).resolves.toMatchObject({ offer: "sistema_a_medida" })
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ model: "openai/gpt-test", providerOptions: { gateway: { models: ["anthropic/test-model"] } } }))
  })
})
