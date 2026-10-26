import { describe, expect, it } from "vitest"
import { parseProposalDraft } from "./model"

describe("proposal draft parser", () => {
  it("extracts the concise contact message from an activity", () => {
    const result = parseProposalDraft([
      "Resumen: Landing para recibir citas.",
      "Por qué: No hay web registrada.",
      "Oferta: landing",
      "WhatsApp (borrador): Hola, vi su negocio. ¿Le muestro una idea?",
      "Web/email (borrador): Hola, preparé una idea breve.",
      "Siguiente acción: Revisar y aprobar",
    ].join("\n\n"))
    expect(result.offer).toBe("landing")
    expect(result.whatsappMessage).toBe("Hola, vi su negocio. ¿Le muestro una idea?")
  })
})
