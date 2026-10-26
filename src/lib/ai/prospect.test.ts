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
      summary: "Clínica con oportunidad de captar citas desde una landing.", rationale: "No hay web registrada y el teléfono público permite proponer una página de citas.", offer: "landing", whatsappDraft: "Hola, vi su clínica. Noté que no aparece una web registrada; puedo preparar una landing sencilla para recibir solicitudes de cita. ¿Le muestro una idea en 10 minutos?", websiteDraft: "Hola, vi su clínica y noté que no aparece una web registrada. Puedo preparar una landing sencilla para presentar sus servicios y recibir solicitudes de cita. ¿Le comparto una idea breve?", nextAction: "Revisar y aprobar el mensaje", creative: { brandVoice: "calido", designVariant: "clinical", headline: "Una página clara para tu clínica", subheadline: "Presenta tus servicios y facilita el contacto.", valuePillars: ["Servicios claros", "Contacto directo"], ctaLabel: "Ver la idea" },
    }) })
    await expect(generateProspectDraft(context, { model: "openai/gpt-test", fallbackModels: ["anthropic/test-model"] }, generate)).resolves.toMatchObject({ offer: "landing" })
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ model: "openai/gpt-test", providerOptions: { gateway: { models: ["anthropic/test-model"] } } }))
  })

  it("turns a defensive no-website answer into a concrete offer", async () => {
    const generate = vi.fn().mockResolvedValue({ output: prospectDraftSchema.parse({
      summary: "La información no basta para identificar una oportunidad.", rationale: "No hay sitio web ni señales para recomendar algo específico.", offer: "ninguna", whatsappDraft: "No tengo suficiente información. ¿Una llamada de diagnóstico?", websiteDraft: "No tengo suficiente información para recomendar un servicio.", nextAction: "Proponer una conversación de diagnóstico", creative: { brandVoice: "directo", designVariant: "editorial", headline: "Una mejora digital", subheadline: "Una página para facilitar el contacto.", valuePillars: ["Mensaje claro", "Contacto directo"], ctaLabel: "Ver la idea" },
    }) })
    const result = await generateProspectDraft(context, { model: "openai/gpt-test", fallbackModels: [] }, generate)
    expect(result.offer).toBe("landing")
    expect(result.whatsappDraft).toContain("landing")
    expect(result.whatsappDraft).toContain("¿Te envío un ejemplo por aquí?")
    expect(result.summary).not.toContain("no basta")
  })
})
