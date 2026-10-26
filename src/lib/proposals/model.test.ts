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

  it("parses the structured creative direction without breaking old activities", () => {
    const result = parseProposalDraft([
      "Resumen: Landing para recibir citas.",
      "Por qué: No hay web registrada.",
      "Oferta: landing",
      "WhatsApp (borrador): Hola, vi su negocio. ¿Le muestro una idea?",
      "Web/email (borrador): Hola, preparé una idea breve.",
      "Siguiente acción: Revisar y aprobar",
      `Creative (JSON): ${JSON.stringify({ brandVoice: "calido", designVariant: "clinical", headline: "Más claridad para tus pacientes", subheadline: "Una página breve para explicar tus servicios y facilitar el contacto.", valuePillars: ["Servicios claros", "Ubicación visible"], ctaLabel: "Ver la idea" })}`,
    ].join("\n\n"))
    expect(result.creative?.designVariant).toBe("clinical")
    expect(result.creative?.valuePillars).toHaveLength(2)
  })
})
