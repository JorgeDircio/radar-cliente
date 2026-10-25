import { describe, expect, it } from "vitest"
import { isWorkerAuthorized } from "./authorization"

describe("worker authentication", () => {
  const secret = "a-private-worker-secret"
  it("requires the exact Bearer secret", () => {
    expect(isWorkerAuthorized(`Bearer ${secret}`, secret)).toBe(true)
    expect(isWorkerAuthorized(`Bearer ${secret}x`, secret)).toBe(false)
    expect(isWorkerAuthorized(`Basic ${secret}`, secret)).toBe(false)
    expect(isWorkerAuthorized(null, secret)).toBe(false)
  })
  it("fails closed when configuration is missing or too short", () => {
    expect(isWorkerAuthorized("Bearer undefined", undefined)).toBe(false)
    expect(isWorkerAuthorized("Bearer short", "short")).toBe(false)
  })
})
