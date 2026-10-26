import "server-only"

import { discoveryEnv } from "@/lib/env.server"
import { createDenueSource } from "@/lib/sources/denue"
import { createAdminClient } from "@/lib/supabase/admin"
import { createDiscoveryRepository } from "./repository"
import { processDiscoveryJob } from "./worker"
import { createAuditRepository } from "@/lib/audit/repository"
import { processAuditJob } from "@/lib/audit/worker"

export async function runDiscoveryWorker(searchId?: string) {
  const { DENUE_TOKEN } = discoveryEnv()
  const dependencies = {
    repository: createDiscoveryRepository(createAdminClient()),
    source: createDenueSource(DENUE_TOKEN),
  }
  const outcomes = []
  // Two bounded HTTP requests per invocation. Remaining pages stay in Postgres.
  for (let index = 0; index < 2; index++) {
    const outcome = await processDiscoveryJob(dependencies, searchId)
    outcomes.push(outcome)
    if (outcome !== "done") break
  }
  const auditRepository = createAuditRepository(createAdminClient())
  for (let index = 0; index < 3; index++) {
    const outcome = await processAuditJob(auditRepository)
    outcomes.push(`audit:${outcome}`)
    if (outcome !== "done") break
  }
  return outcomes
}
