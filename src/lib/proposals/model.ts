import { z } from "zod"

import { LANDING_VARIANTS } from "./variants"

export const proposalCreativeSchema = z.object({
  brandVoice: z.enum(["directo", "calido", "premium", "tecnico", "local"]),
  designVariant: z.enum(LANDING_VARIANTS),
  headline: z.string().trim().min(1).max(120),
  subheadline: z.string().trim().min(1).max(240),
  valuePillars: z.array(z.string().trim().min(1).max(140)).min(2).max(4),
  ctaLabel: z.string().trim().min(1).max(60),
})

export type ProposalCreative = z.infer<typeof proposalCreativeSchema>

export type ProposalDraftContent = {
  summary: string
  rationale: string
  offer: string
  whatsappMessage: string | null
  websiteMessage: string | null
  nextAction: string | null
  creative: ProposalCreative | null
}

function section(content: string, label: string, nextLabels: string[]) {
  const start = content.indexOf(`${label}: `)
  if (start < 0) return null
  const valueStart = start + label.length + 2
  const end = nextLabels
    .map((nextLabel) => content.indexOf(`\n\n${nextLabel}:`, valueStart))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0] ?? content.length
  return content.slice(valueStart, end).trim() || null
}

export function parseProposalDraft(content: string): ProposalDraftContent {
  const creativeMatch = content.match(/Creative \(JSON\): (\{[\s\S]*\})\s*$/)
  let creative: ProposalCreative | null = null
  if (creativeMatch) {
    try {
      const parsed = proposalCreativeSchema.safeParse(JSON.parse(creativeMatch[1]))
      creative = parsed.success ? parsed.data : null
    } catch {
      creative = null
    }
  }
  return {
    summary: section(content, "Resumen", ["Por qué", "Oferta", "WhatsApp (borrador)"]) ?? "Propuesta de mejora digital.",
    rationale: section(content, "Por qué", ["Oferta", "WhatsApp (borrador)"]) ?? "Hay una oportunidad de mejorar la presencia digital.",
    offer: section(content, "Oferta", ["WhatsApp (borrador)", "Web/email (borrador)"]) ?? "landing",
    whatsappMessage: section(content, "WhatsApp (borrador)", ["Web/email (borrador)", "Siguiente acción"]),
    websiteMessage: section(content, "Web/email (borrador)", ["Siguiente acción"]),
    nextAction: section(content, "Siguiente acción", ["Creative (JSON)"]),
    creative,
  }
}
