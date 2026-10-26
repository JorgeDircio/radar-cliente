import "server-only"

import { notFound } from "next/navigation"
import { z } from "zod"

import { requireUser } from "@/lib/auth"
import { BUSINESS_FIELDS } from "@/lib/discovery/queries"

export async function getLeadDetail(leadId: string) {
  const parsed = z.uuid().safeParse(leadId)
  if (!parsed.success) notFound()
  const { supabase, userId } = await requireUser()
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select(`id, stage, priority, next_action_at, estimated_value, lost_reason, contact_status, do_not_contact, created_at, updated_at, business:businesses!inner(${BUSINESS_FIELDS})`)
    .eq("id", parsed.data)
    .eq("owner_id", userId)
    .maybeSingle()
  if (leadError) throw new Error("No se pudo cargar el prospecto.")
  if (!lead) notFound()

  const [auditResult, signalsResult, scoreResult, activitiesResult] = await Promise.all([
    supabase.from("website_audits").select("id, url, reachable, https, responsive, tech, copyright_year, features, fetched_at").eq("business_id", lead.business.id).order("fetched_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("signals").select("id, type, code, weight, evidence, created_at").eq("business_id", lead.business.id).order("created_at", { ascending: false }),
    supabase.from("scores").select("opportunity, viability, total, suggested_offer, computed_at").eq("business_id", lead.business.id).maybeSingle(),
    supabase.from("activities").select("id, type, content, occurred_at").eq("lead_id", lead.id).eq("owner_id", userId).order("occurred_at", { ascending: false }).limit(20),
  ])
  if (auditResult.error || signalsResult.error || scoreResult.error || activitiesResult.error) throw new Error("No se pudo cargar el análisis del prospecto.")
  return { lead, audit: auditResult.data, signals: signalsResult.data ?? [], score: scoreResult.data, activities: activitiesResult.data ?? [] }
}
