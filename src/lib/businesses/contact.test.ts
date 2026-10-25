import { describe, expect, it } from "vitest"
import { phoneUrl, websiteUrl } from "./contact"

describe("public contact URLs", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html,test",
    "ftp://example.com",
    "https://user:password@example.com",
    "not a website",
    null,
  ])("rejects unsafe or malformed website %s", (value) => {
    expect(websiteUrl(value)).toBeNull()
  })
  it("normalizes a bare hostname and preserves http links", () => {
    expect(websiteUrl("ejemplo.mx")).toBe("https://ejemplo.mx/")
    expect(websiteUrl("http://ejemplo.mx/citas")).toBe(
      "http://ejemplo.mx/citas",
    )
  })
  it("normalizes phone formatting and rejects short or invalid numbers", () => {
    expect(phoneUrl("+52 (33) 3000-0000")).toBe("tel:+523330000000")
    expect(phoneUrl("123")).toBeNull()
    expect(phoneUrl("++52 3330000000")).toBeNull()
  })
})
