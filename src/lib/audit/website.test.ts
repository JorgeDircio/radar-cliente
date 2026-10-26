import { describe, expect, it, vi } from "vitest"
import { auditWebsite } from "./website"

describe("website audit", () => {
  it("extracts safe, useful signals from a reachable page", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(`
      <meta name="viewport" content="width=device-width">
      <meta name="generator" content="WordPress 6">
      <a href="https://wa.me/5215555555555">WhatsApp</a>
      <form><input name="email"></form><p>Copyright 2024</p>
    `))
    await expect(auditWebsite("https://ejemplo.mx", fetcher)).resolves.toMatchObject({
      reachable: true,
      responsive: true,
      tech: { cms: "WordPress 6" },
      copyrightYear: 2024,
      features: { whatsapp: true, contactForm: true },
    })
  })
  it("rejects local targets and returns null", async () => {
    await expect(auditWebsite("http://127.0.0.1:3000")).resolves.toBeNull()
  })
})
