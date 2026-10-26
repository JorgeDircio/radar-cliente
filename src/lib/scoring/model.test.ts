import { describe, expect, it } from "vitest"
import { computeScore, deriveSignals } from "./model"

describe("scoring", () => {
  it("keeps the score explainable and bounded", () => {
    const signals = deriveSignals({ website: null, phone: "555", email: null, estrato: "0 a 5", scian_label: "Consultorios dentales" }, null)
    expect(signals.map((signal) => signal.code)).toEqual(["sin_web_registrada", "negocio_con_datos_operativos"])
    expect(computeScore(signals)).toMatchObject({ opportunity: 35, viability: 40, total: 75, suggestedOffer: "landing" })
  })
  it("suggests a custom system when manual processes are strong", () => {
    const signals = deriveSignals({ website: "https://ejemplo.mx", phone: "555", email: null, estrato: "6 a 10", scian_label: "Restaurante" }, {
      url: "https://ejemplo.mx", reachable: true, https: true, responsive: true, psiScores: null,
      tech: { cms: null, jqueryVersion: null }, copyrightYear: 2024,
      features: { booking: false, ecommerce: false, whatsapp: false, contactForm: true }, fetchedAt: "2026-01-01T00:00:00.000Z",
    })
    expect(computeScore(signals).suggestedOffer).toBe("sistema_a_medida")
  })
})
