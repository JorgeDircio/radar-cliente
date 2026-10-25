import { describe, expect, it, vi } from "vitest"
import {
  DiscoveryError,
  type BusinessSource,
  type DiscoveryJob,
  type DiscoveryRepository,
} from "./model"
import { parseDenueResponse } from "@/lib/sources/denue"
import { processDiscoveryJob, retryDelay } from "./worker"

function setup(overrides: Partial<DiscoveryJob> = {}) {
  const job: DiscoveryJob = {
    id: 1,
    searchId: "search",
    start: 1,
    attempt: 1,
    maxAttempts: 5,
    lockToken: "lease",
    ...overrides,
  }
  const repository = {
    claim: vi.fn<DiscoveryRepository["claim"]>().mockResolvedValue(job),
    getSearch: vi
      .fn<DiscoveryRepository["getSearch"]>()
      .mockResolvedValue({
        keywords: "dentistas",
        entidad: "14",
        maxResults: 100,
      }),
    complete: vi.fn<DiscoveryRepository["complete"]>().mockResolvedValue(),
    fail: vi.fn<DiscoveryRepository["fail"]>().mockResolvedValue(),
  }
  const source = {
    discover: vi.fn<BusinessSource["discover"]>().mockResolvedValue([]),
  }
  return { job, repository, source }
}

describe("discovery use case", () => {
  it("does not call the provider when there is no job", async () => {
    const dependencies = setup()
    dependencies.repository.claim.mockResolvedValue(null)
    expect(await processDiscoveryJob(dependencies)).toBe("idle")
    expect(dependencies.source.discover).not.toHaveBeenCalled()
  })
  it("ends an empty scan successfully", async () => {
    const dependencies = setup()
    expect(await processDiscoveryJob(dependencies)).toBe("done")
    expect(dependencies.repository.complete).toHaveBeenCalledWith(
      dependencies.job,
      [],
      null,
    )
  })
  it("queues the next page only after a full response", async () => {
    const dependencies = setup()
    const rows = parseDenueResponse(
      Array.from({ length: 50 }, (_, index) => ({
        Id: String(index),
        Nombre: "Negocio",
      })),
    )
    dependencies.source.discover.mockResolvedValue(rows)
    await processDiscoveryJob(dependencies)
    expect(dependencies.repository.complete).toHaveBeenCalledWith(
      dependencies.job,
      rows,
      51,
    )
  })
  it("caps the last page at the user's requested limit", async () => {
    const dependencies = setup({ start: 51 })
    dependencies.repository.getSearch.mockResolvedValue({
      keywords: "dentistas",
      entidad: "14",
      maxResults: 55,
    })
    dependencies.source.discover.mockResolvedValue(
      parseDenueResponse(
        Array.from({ length: 5 }, (_, index) => ({
          Id: String(index),
          Nombre: "Negocio",
        })),
      ),
    )
    await processDiscoveryJob(dependencies)
    expect(dependencies.source.discover).toHaveBeenCalledWith(
      expect.anything(),
      51,
      55,
    )
    expect(dependencies.repository.complete).toHaveBeenCalledWith(
      dependencies.job,
      expect.anything(),
      null,
    )
  })
  it("backs off on a transient provider failure", async () => {
    const dependencies = setup()
    dependencies.source.discover.mockRejectedValue(
      new DiscoveryError("DENUE no disponible"),
    )
    expect(await processDiscoveryJob(dependencies)).toBe("retry")
    expect(dependencies.repository.fail).toHaveBeenCalledWith(
      dependencies.job,
      { message: "DENUE no disponible", retryInSeconds: 120 },
    )
    expect(dependencies.repository.complete).not.toHaveBeenCalled()
  })
  it("stops retrying at max_attempts", async () => {
    const dependencies = setup({ attempt: 5 })
    dependencies.source.discover.mockRejectedValue(
      new DiscoveryError("DENUE no disponible"),
    )
    expect(await processDiscoveryJob(dependencies)).toBe("failed")
    expect(dependencies.repository.fail).toHaveBeenCalledWith(
      dependencies.job,
      expect.objectContaining({ retryInSeconds: null }),
    )
  })
  it("fails permanently for invalid credentials and sanitizes unexpected failures", async () => {
    const dependencies = setup()
    dependencies.source.discover.mockRejectedValue(
      new DiscoveryError("Acceso inválido", false),
    )
    expect(await processDiscoveryJob(dependencies)).toBe("failed")
    dependencies.repository.complete.mockRejectedValue(
      new Error("secret database details"),
    )
    dependencies.source.discover.mockResolvedValue([])
    expect(await processDiscoveryJob(dependencies)).toBe("retry")
    expect(dependencies.repository.fail).toHaveBeenLastCalledWith(
      dependencies.job,
      {
        message: "No se pudo procesar este lote. Inténtalo de nuevo.",
        retryInSeconds: 120,
      },
    )
  })
  it("rejects invalid cursors before contacting the provider", async () => {
    const dependencies = setup({ start: 501 })
    expect(await processDiscoveryJob(dependencies)).toBe("failed")
    expect(dependencies.source.discover).not.toHaveBeenCalled()
  })
  it("bounds the retry delay", () => {
    expect(retryDelay(10, 20, true)).toBe(1800)
    expect(retryDelay(1, 5, false)).toBeNull()
  })
})
