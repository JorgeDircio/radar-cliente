import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

import type { Database } from "@/lib/supabase/database.types"
import { searchInputSchema, type DiscoveryRepository } from "./model"

export function createDiscoveryRepository(
  client: SupabaseClient<Database>,
): DiscoveryRepository {
  return {
    async claim(searchId) {
      const { data, error } = await client.rpc("claim_scan_jobs", {
        p_limit: 1,
        p_search_id: searchId,
      })
      if (error) throw new Error("No se pudo consultar la cola de búsquedas.")
      const job = data?.[0]
      if (!job) return null
      const payload = z
        .object({ start: z.number().int().positive() })
        .parse(job.payload)
      if (!job.search_id || !job.lock_token)
        throw new Error("Trabajo sin búsqueda o sin bloqueo.")
      return {
        id: job.id,
        searchId: job.search_id,
        type: "discover",
        start: payload.start,
        attempt: job.attempts,
        maxAttempts: job.max_attempts,
        lockToken: job.lock_token,
      }
    },
    async getSearch(id) {
      const { data, error } = await client
        .from("searches")
        .select("keywords, entidad, max_results")
        .eq("id", id)
        .single()
      if (error) throw new Error("No se pudo leer la búsqueda.")
      return searchInputSchema.parse({
        keywords: data.keywords,
        entidad: data.entidad,
        maxResults: data.max_results,
      })
    },
    async complete(job, businesses, nextStart) {
      const { error } = await client.rpc("complete_discovery_job", {
        p_job_id: job.id,
        p_lock_token: job.lockToken,
        p_businesses: businesses,
        p_next_start: nextStart ?? undefined,
      })
      if (error) throw new Error("No se pudo guardar el lote de negocios.")
    },
    async fail(job, failure) {
      const { error } = await client.rpc("fail_discovery_job", {
        p_job_id: job.id,
        p_lock_token: job.lockToken,
        p_message: failure.message,
        p_retry_seconds: failure.retryInSeconds ?? undefined,
      })
      if (error)
        throw new Error("No se pudo registrar el resultado del trabajo.")
      const { error: enqueueError } = await client.rpc("enqueue_audit_jobs", {
        p_search_id: job.searchId,
      })
      if (enqueueError) throw new Error("No se pudieron programar las auditorías.")
    },
  }
}
