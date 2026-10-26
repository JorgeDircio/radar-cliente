"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { generateProspectDraft } from "@/lib/ai/prospect"
import { auditWebsite } from "@/lib/audit/website"
import { requireUser } from "@/lib/auth"
import type { ActionState } from "@/lib/discovery/model"
import { aiEnv, isAiConfigured } from "@/lib/env.server"
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

export async function generateLeadDraft(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, userId } = await requireUser()
  if (!isAiConfigured()) return { error: "Configura AI_GATEWAY_API_KEY y AI_MODEL para generar borradores." }
  const parsed = z.object({ leadId: z.uuid() }).safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "El prospecto no es válido." }
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, business:businesses!inner(id, name, scian_label, website, phone, email, estrato)")
    .eq("id", parsed.data.leadId)
    .eq("owner_id", userId)
    .maybeSingle()
  if (leadError || !lead) return { error: "No se encontró este prospecto." }
  const [auditResult, signalsResult, scoreResult] = await Promise.all([
    supabase.from("website_audits").select("url, reachable, https, responsive, psi_scores, tech, copyright_year, features, fetched_at").eq("business_id", lead.business.id).order("fetched_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("signals").select("type, code, weight, evidence").eq("business_id", lead.business.id),
    supabase.from("scores").select("opportunity, viability, total, suggested_offer").eq("business_id", lead.business.id).maybeSingle(),
  ])
  if (auditResult.error || signalsResult.error || scoreResult.error) return { error: "Analiza el prospecto antes de generar el borrador." }
  const { AI_MODEL, AI_FALLBACK_MODELS } = aiEnv()
  const draft = await generateProspectDraft({
    business: { name: lead.business.name, scianLabel: lead.business.scian_label, website: lead.business.website, phone: lead.business.phone, email: lead.business.email, estrato: lead.business.estrato },
    audit: auditResult.data,
    signals: signalsResult.data ?? [],
    score: scoreResult.data ? { opportunity: scoreResult.data.opportunity, viability: scoreResult.data.viability, total: scoreResult.data.total ?? 0, suggestedOffer: scoreResult.data.suggested_offer } : null,
  }, { model: AI_MODEL, fallbackModels: AI_FALLBACK_MODELS.split(",").map((model) => model.trim()).filter(Boolean) })
  const content = [
    `Resumen: ${draft.summary}`,
    `Por qué: ${draft.rationale}`,
    `Oferta: ${draft.offer}`,
    `WhatsApp (borrador): ${draft.whatsappDraft}`,
    `Web/email (borrador): ${draft.websiteDraft}`,
    `Siguiente acción: ${draft.nextAction}`,
  ].join("\n\n")
  const { error } = await supabase.from("activities").insert({ owner_id: userId, lead_id: lead.id, type: "propuesta", content })
  if (error) return { error: "No se pudo guardar el borrador generado." }
  revalidatePath("/pipeline")
  return { success: "Borrador de propuesta generado y guardado en actividades. Revisa antes de contactar." }
}

const contactChannels = ["llamada", "whatsapp", "email", "reunion"] as const
const contactStatuses = ["contactado", "respondio", "interesado", "opt_out"] as const

function parseNextAction(value: string | undefined) {
  if (!value) return { value: null as string | null }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? { error: "La fecha de próxima acción no es válida." } : { value: date.toISOString() }
}

export async function addLeadNote(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, userId } = await requireUser()
  const parsed = z.object({ leadId: z.uuid(), content: z.string().trim().min(2, "Escribe una nota.").max(2000) }).safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "La nota no es válida." }
  const { data: lead, error: leadError } = await supabase.from("leads").select("id").eq("id", parsed.data.leadId).eq("owner_id", userId).maybeSingle()
  if (leadError || !lead) return { error: "No se encontró este prospecto." }
  const { error } = await supabase.from("activities").insert({ owner_id: userId, lead_id: lead.id, type: "nota", content: parsed.data.content })
  if (error) return { error: "No se pudo guardar la nota." }
  revalidatePath(`/pipeline/${lead.id}`)
  revalidatePath("/pipeline")
  return { success: "Nota guardada." }
}

export async function recordLeadContact(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, userId } = await requireUser()
  const parsed = z.object({
    leadId: z.uuid(),
    channel: z.enum(contactChannels),
    content: z.string().trim().min(2, "Describe el contacto.").max(2000),
    contactStatus: z.enum(contactStatuses),
    nextActionAt: z.string().trim().max(40).optional(),
  }).safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "Los datos del contacto no son válidos." }
  const nextAction = parseNextAction(parsed.data.nextActionAt)
  if (nextAction.error) return { error: nextAction.error }
  const { data: lead, error: leadError } = await supabase.from("leads").select("id, stage, do_not_contact").eq("id", parsed.data.leadId).eq("owner_id", userId).maybeSingle()
  if (leadError || !lead) return { error: "No se encontró este prospecto." }
  if (lead.do_not_contact && parsed.data.contactStatus !== "opt_out") return { error: "Este prospecto está marcado como no contactar." }
  const { error: activityError } = await supabase.from("activities").insert({ owner_id: userId, lead_id: lead.id, type: parsed.data.channel, content: parsed.data.content })
  if (activityError) return { error: "No se pudo registrar el contacto." }
  const nextStage = lead.stage === "nuevo" || lead.stage === "calificado" ? "contactado" : lead.stage
  const { error: updateError } = await supabase.from("leads").update({
    stage: nextStage,
    contact_status: parsed.data.contactStatus,
    next_action_at: nextAction.value,
    do_not_contact: parsed.data.contactStatus === "opt_out" ? true : lead.do_not_contact,
  }).eq("id", lead.id).eq("owner_id", userId)
  if (updateError) return { error: "El contacto se guardó, pero no se pudo actualizar el seguimiento." }
  revalidatePath(`/pipeline/${lead.id}`)
  revalidatePath("/pipeline")
  return { success: "Contacto registrado." }
}

export async function markLeadDoNotContact(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, userId } = await requireUser()
  const parsed = z.object({ leadId: z.uuid() }).safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "El prospecto no es válido." }
  const { data, error } = await supabase.from("leads").update({ do_not_contact: true, contact_status: "opt_out", next_action_at: null }).eq("id", parsed.data.leadId).eq("owner_id", userId).select("id").maybeSingle()
  if (error || !data) return { error: "No se pudo marcar este prospecto." }
  revalidatePath(`/pipeline/${data.id}`)
  revalidatePath("/pipeline")
  return { success: "Prospecto marcado como no contactar." }
}
