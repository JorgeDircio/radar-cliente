"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { generateProspectDraft } from "@/lib/ai/prospect"
import { auditWebsite } from "@/lib/audit/website"
import { requireUser } from "@/lib/auth"
import type { ActionState } from "@/lib/discovery/model"
import { aiEnv, isAiConfigured } from "@/lib/env.server"
import { leadStageSchema } from "@/lib/leads/model"
import { fallbackProposalCreative } from "@/lib/proposals/creative"
import { parseProposalDraft } from "@/lib/proposals/model"
import { chooseLandingVariant } from "@/lib/proposals/variants"
import { computeScore, deriveSignals } from "@/lib/scoring/model"
import { createAdminClient } from "@/lib/supabase/admin"
import { whatsappUrl } from "@/lib/businesses/contact"

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
    `Creative (JSON): ${JSON.stringify(draft.creative)}`,
  ].join("\n\n")
  const { error } = await supabase.from("activities").insert({ owner_id: userId, lead_id: lead.id, type: "propuesta", content })
  if (error) return { error: "No se pudo guardar el borrador generado." }
  revalidatePath("/pipeline")
  return { success: "Borrador de propuesta generado y guardado en actividades. Revisa antes de contactar." }
}

export async function publishProposalPage(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, userId } = await requireUser()
  const parsed = z.object({ leadId: z.uuid() }).safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "El prospecto no es válido." }
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, business:businesses!inner(name, scian_label, phone, email)")
    .eq("id", parsed.data.leadId)
    .eq("owner_id", userId)
    .maybeSingle()
  if (leadError || !lead) return { error: "No se encontró este prospecto." }
  const { data: activity, error: activityError } = await supabase.from("activities").select("content").eq("lead_id", lead.id).eq("owner_id", userId).eq("type", "propuesta").order("occurred_at", { ascending: false }).limit(1).maybeSingle()
  if (activityError || !activity) return { error: "Genera primero una propuesta IA." }
  const draft = parseProposalDraft(activity.content)
  const fallbackMessage = `Hola, ${lead.business.name}. Preparé una idea breve para mejorar su presencia digital. ¿Te la comparto?`
  const message = draft.whatsappMessage ?? fallbackMessage
  const ctaUrl = whatsappUrl(lead.business.phone, message) ?? (lead.business.email ? `mailto:${lead.business.email}?subject=${encodeURIComponent(`Idea para ${lead.business.name}`)}&body=${encodeURIComponent(draft.websiteMessage ?? message)}` : null)
  const creative = draft.creative ?? fallbackProposalCreative({ businessName: lead.business.name, scianLabel: lead.business.scian_label, offer: draft.offer, summary: draft.summary })
  const designVariant = chooseLandingVariant(lead.business.name, draft.offer, lead.business.scian_label)
  const { data: page, error } = await supabase.from("proposal_pages").upsert({ owner_id: userId, lead_id: lead.id, status: "published", title: creative.headline, summary: draft.summary, rationale: draft.rationale, offer: draft.offer, whatsapp_message: message, cta_url: ctaUrl, creative, design_variant: designVariant }, { onConflict: "owner_id,lead_id" }).select("token").single()
  if (error || !page) return { error: "No se pudo publicar la propuesta visual." }
  revalidatePath(`/pipeline/${lead.id}`)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")
  return { success: `Propuesta publicada: ${baseUrl ? `${baseUrl}/p/${page.token}` : `/p/${page.token}`}` }
}

const contactChannels = ["llamada", "whatsapp", "email", "reunion"] as const
const contactStatuses = ["contactado", "respondio", "interesado", "opt_out"] as const
const outreachChannels = ["whatsapp", "email"] as const

function parseNextAction(value: string | undefined) {
  if (!value) return { value: null as string | null }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? { error: "La fecha de próxima acción no es válida." } : { value: date.toISOString() }
}

const outreachInput = z.object({
  leadId: z.uuid(),
  channel: z.enum(outreachChannels),
  content: z.string().trim().min(2, "Escribe el mensaje.").max(4000),
})

async function getOutreachLead(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], leadId: string, userId: string) {
  return supabase.from("leads").select("id, do_not_contact, business:businesses!inner(phone, email)").eq("id", leadId).eq("owner_id", userId).maybeSingle()
}

export async function saveOutreachDraft(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, userId } = await requireUser()
  const parsed = outreachInput.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "El borrador no es válido." }
  const { data: lead, error: leadError } = await getOutreachLead(supabase, parsed.data.leadId, userId)
  if (leadError || !lead) return { error: "No se encontró este prospecto." }
  if (lead.do_not_contact) return { error: "Este prospecto está marcado como no contactar." }
  const { error } = await supabase.from("outreach_messages").insert({ owner_id: userId, lead_id: lead.id, channel: parsed.data.channel, content: parsed.data.content, status: "draft" })
  if (error) return { error: "No se pudo guardar el borrador." }
  revalidatePath(`/pipeline/${lead.id}`)
  return { success: "Borrador guardado." }
}

export async function simulateOutreach(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, userId } = await requireUser()
  const parsed = outreachInput.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "El mensaje no es válido." }
  const { data: lead, error: leadError } = await getOutreachLead(supabase, parsed.data.leadId, userId)
  if (leadError || !lead) return { error: "No se encontró este prospecto." }
  if (lead.do_not_contact) return { error: "Este prospecto está marcado como no contactar." }
  if (parsed.data.channel === "whatsapp" && !lead.business.phone) return { error: "El prospecto no tiene teléfono registrado." }
  if (parsed.data.channel === "email" && !lead.business.email) return { error: "El prospecto no tiene email registrado." }
  const providerMessageId = `sandbox_${crypto.randomUUID()}`
  const sentAt = new Date().toISOString()
  const { error: outreachError } = await supabase.from("outreach_messages").insert({ owner_id: userId, lead_id: lead.id, channel: parsed.data.channel, content: parsed.data.content, status: "simulated", provider_message_id: providerMessageId, sent_at: sentAt })
  if (outreachError) return { error: "No se pudo registrar la simulación." }
  const { error: activityError } = await supabase.from("activities").insert({ owner_id: userId, lead_id: lead.id, type: parsed.data.channel, content: `[Sandbox] ${parsed.data.content}` })
  if (activityError) return { error: "La simulación se guardó, pero no se pudo registrar la actividad." }
  revalidatePath(`/pipeline/${lead.id}`)
  revalidatePath("/pipeline")
  return { success: "Mensaje simulado y registrado. No se envió a ningún proveedor." }
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
