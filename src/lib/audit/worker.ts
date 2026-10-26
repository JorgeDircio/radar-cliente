import { auditWebsite } from "./website"
import { computeScore, deriveSignals } from "@/lib/scoring/model"
import { retryDelay } from "@/lib/discovery/worker"
import type { createAuditRepository } from "./repository"

type AuditRepository = ReturnType<typeof createAuditRepository>

export async function processAuditJob(repository: AuditRepository): Promise<"idle" | "done" | "retry" | "failed"> {
  const job = await repository.claim()
  if (!job) return "idle"
  try {
    const business = await repository.getBusiness(job.businessId)
    const audit = await auditWebsite(business.website)
    const signals = deriveSignals(business, audit)
    const score = computeScore(signals)
    await repository.complete(job, audit, signals, score)
    return "done"
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo auditar este negocio."
    const retryInSeconds = retryDelay(job.attempt, job.maxAttempts, true)
    await repository.fail(job, message, retryInSeconds)
    return retryInSeconds === null ? "failed" : "retry"
  }
}
