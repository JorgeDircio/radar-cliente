import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

import type { Json, Database } from "@/lib/supabase/database.types"
import type { WebsiteAudit } from "./model"

export type AuditJob = {
  id: number
  searchId: string
  businessId: string
  attempt: number
  maxAttempts: number
  lockToken: string
}

export type AuditableBusiness = {
  id: string
  website: string | null
  phone: string | null
  email: string | null
  estrato: string | null
  scian_label: string | null
}

export type AuditSignal = {
  type: "sin_web" | "web_mala" | "procesos_manuales" | "actividad"
  code: string
  weight: number
  evidence: { [key: string]: Json | undefined }
}

export type AuditScore = {
  opportunity: number
  viability: number
  suggestedOffer: "landing" | "rediseno" | "sistema_a_medida" | "ninguna"
}

export function createAuditRepository(client: SupabaseClient<Database>) {
  return {
    async claim(): Promise<AuditJob | null> {
      const { data, error } = await client.rpc("claim_scan_jobs", {
        p_limit: 1,
        p_search_id: undefined,
        p_type: "audit",
      })
      if (error) throw new Error("No se pudo consultar la cola de auditorías.")
      const job = data?.[0]
      if (!job || !job.search_id || !job.lock_token) return null
      const payload = z.object({ business_id: z.uuid() }).parse(job.payload)
      return {
        id: job.id,
        searchId: job.search_id,
        businessId: payload.business_id,
        attempt: job.attempts,
        maxAttempts: job.max_attempts,
        lockToken: job.lock_token,
      }
    },
    async getBusiness(id: string): Promise<AuditableBusiness> {
      const { data, error } = await client
        .from("businesses")
        .select("id, website, phone, email, estrato, scian_label")
        .eq("id", id)
        .single()
      if (error) throw new Error("No se pudo leer el negocio para auditarlo.")
      return data
    },
    async complete(job: AuditJob, audit: WebsiteAudit | null, signals: AuditSignal[], score: AuditScore) {
      const { error } = await client.rpc("complete_audit_job", {
        p_job_id: job.id,
        p_lock_token: job.lockToken,
        p_audit: audit as unknown as Json,
        p_signals: signals as unknown as Json,
        p_score: score as unknown as Json,
      })
      if (error) throw new Error("No se pudo guardar la auditoría.")
    },
    async fail(job: AuditJob, message: string, retryInSeconds: number | null) {
      const { error } = await client.rpc("fail_discovery_job", {
        p_job_id: job.id,
        p_lock_token: job.lockToken,
        p_message: message,
        p_retry_seconds: retryInSeconds ?? undefined,
      })
      if (error) throw new Error("No se pudo registrar el resultado de la auditoría.")
    },
  }
}
