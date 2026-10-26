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
      summary: "Clínica con oportunidad de captar citas desde una landing.", rationale: "No hay web registrada y el teléfono público permite proponer una página de citas.", offer: "landing", whatsappDraft: "Hola, vi su clínica. Noté que no aparece una web registrada; puedo preparar una landing sencilla para recibir solicitudes de cita. ¿Le muestro una idea en 10 minutos?", websiteDraft: "Hola, vi su clínica y noté que no aparece una web registrada. Puedo preparar una landing sencilla para presentar sus servicios y recibir solicitudes de cita. ¿Le comparto una idea breve?", nextAction: "Revisar y aprobar el mensaje",
    }) })
    await expect(generateProspectDraft(context, { model: "openai/gpt-test", fallbackModels: ["anthropic/test-model"] }, generate)).resolves.toMatchObject({ offer: "landing" })
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ model: "openai/gpt-test", providerOptions: { gateway: { models: ["anthropic/test-model"] } } }))
  })
})
