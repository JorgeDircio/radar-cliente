"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { auditWebsite } from "@/lib/audit/website"
import { requireUser } from "@/lib/auth"
import type { ActionState } from "@/lib/discovery/model"
import { leadStageSchema } from "@/lib/leads/model"
import { computeScore, deriveSignals } from "@/lib/scoring/model"
import { createAdminClient } from "@/lib/supabase/admin"

export async function addLead(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, userId } = await requireUser()
  const parsed = z.object({ businessId: z.uuid(), searchId: z.uuid() }).safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "El negocio no es válido." }
  const found = await supabase.from("search_results").select("business_id")
    .eq("search_id", parsed.data.searchId).eq("business_id", parsed.data.businessId).maybeSingle()
  if (found.error || !found.data) return { error: "No se encontró el negocio en tus búsquedas." }
  const { error } = await supabase.from("leads").upsert({ owner_id: userId, business_id: parsed.data.businessId }, {
    onConflict: "owner_id,business_id", ignoreDuplicates: true,
  })
  if (error) return { error: "No se pudo agregar al pipeline." }
  revalidatePath("/pipeline")
  revalidatePath("/radar")
  return { success: "Agregado al pipeline." }
}

export async function updateLeadStage(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, userId } = await requireUser()
  const parsed = z.object({ leadId: z.uuid(), stage: leadStageSchema }).safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "La etapa no es válida." }
  const { data, error } = await supabase.from("leads").update({ stage: parsed.data.stage })
    .eq("id", parsed.data.leadId).eq("owner_id", userId).select("id").maybeSingle()
  if (error || !data) return { error: "No se pudo actualizar este prospecto." }
  revalidatePath("/pipeline")
  return { success: "Etapa actualizada." }
}

export async function auditLead(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, userId } = await requireUser()
  const parsed = z.object({ leadId: z.uuid() }).safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "El prospecto no es válido." }
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, business:businesses!inner(id, name, scian_label, phone, email, website, estrato)")
    .eq("id", parsed.data.leadId)
    .eq("owner_id", userId)
    .maybeSingle()
  if (leadError || !lead) return { error: "No se encontró este prospecto." }

  const audit = await auditWebsite(lead.business.website)
  const signals = deriveSignals(lead.business, audit)
  const score = computeScore(signals)
  const admin = createAdminClient()
  if (audit) {
    const { error } = await admin.from("website_audits").insert({
      business_id: lead.business.id,
      url: audit.url,
      reachable: audit.reachable,
      https: audit.https,
      responsive: audit.responsive,
      psi_scores: audit.psiScores,
      tech: audit.tech,
      copyright_year: audit.copyrightYear,
      features: audit.features,
      fetched_at: audit.fetchedAt,
    })
    if (error) return { error: "No se pudo guardar la auditoría." }
  }
  const { error: signalDeleteError } = await admin.from("signals").delete().eq("business_id", lead.business.id)
  if (signalDeleteError) return { error: "No se pudieron actualizar las señales." }
  if (signals.length) {
    const { error } = await admin.from("signals").insert(signals.map((signal) => ({
      business_id: lead.business.id,
      type: signal.type,
      code: signal.code,
      weight: signal.weight,
      evidence: signal.evidence,
    })))
    if (error) return { error: "No se pudieron guardar las señales." }
  }
  const { error: scoreError } = await admin.from("scores").upsert({
    business_id: lead.business.id,
    opportunity: score.opportunity,
    viability: score.viability,
    suggested_offer: score.suggestedOffer,
  }, { onConflict: "business_id" })
  if (scoreError) return { error: "No se pudo guardar el score." }
  revalidatePath("/pipeline")
  revalidatePath("/radar")
  return { success: `Analizado: ${score.total}/100. Oferta sugerida: ${score.suggestedOffer}.` }
}
