import type { WebsiteAudit } from "@/lib/audit/model"
import type { DiscoveredBusiness } from "@/lib/discovery/model"
import type { Json } from "@/lib/supabase/database.types"

export const SIGNAL_TYPES = ["sin_web", "web_mala", "procesos_manuales", "actividad"] as const
export type SignalType = (typeof SIGNAL_TYPES)[number]
export type Offer = "landing" | "rediseno" | "sistema_a_medida" | "ninguna"
export type Signal = {
  type: SignalType
  code: string
  weight: number
  evidence: { [key: string]: Json | undefined }
}
export type Score = {
  opportunity: number
  viability: number
  total: number
  suggestedOffer: Offer
}
export type ScoringWeights = {
  opportunity: Record<string, number>
  viability: Record<string, number>
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  opportunity: { sin_web: 35, web_mala: 20, procesos_manuales: 15 },
  viability: { actividad: 40 },
}

export function deriveSignals(
  business: Pick<DiscoveredBusiness, "website" | "phone" | "email" | "estrato" | "scian_label">,
  audit: WebsiteAudit | null,
): Signal[] {
  const signals: Signal[] = []
  if (!business.website && !audit) {
    signals.push({ type: "sin_web", code: "sin_web_registrada", weight: 1, evidence: { source: "denue" } })
  } else if (audit && !audit.reachable) {
    signals.push({ type: "sin_web", code: "web_no_disponible", weight: 1, evidence: { url: audit.url } })
  }
  if (audit && audit.reachable && (!audit.https || audit.responsive === false || (audit.copyrightYear !== null && audit.copyrightYear <= 2019))) {
    signals.push({ type: "web_mala", code: "experiencia_web_debil", weight: 1, evidence: { https: audit.https, responsive: audit.responsive, copyrightYear: audit.copyrightYear } })
  }
  const serviceBusiness = /(sal[oó]n|cl[ií]nica|consultorio|restaurante|hotel|m[eé]dico|dent)/i.test(business.scian_label ?? "")
  if (serviceBusiness && audit?.reachable && !audit.features.booking) {
    signals.push({ type: "procesos_manuales", code: "sin_reservas_online", weight: 1, evidence: { scianLabel: business.scian_label } })
  }
  if (business.phone || business.email || business.estrato) {
    signals.push({ type: "actividad", code: "negocio_con_datos_operativos", weight: 1, evidence: { hasPhone: Boolean(business.phone), hasEmail: Boolean(business.email), estrato: business.estrato } })
  }
  return signals
}

export function computeScore(signals: Signal[], weights: ScoringWeights = DEFAULT_WEIGHTS): Score {
  const opportunity = Math.min(60, signals.filter((signal) => signal.type !== "actividad").reduce((sum, signal) => sum + (weights.opportunity[signal.type] ?? 0) * signal.weight, 0))
  const viability = Math.min(40, signals.filter((signal) => signal.type === "actividad").reduce((sum, signal) => sum + (weights.viability[signal.type] ?? 0) * signal.weight, 0))
  const total = opportunity + viability
  const suggestedOffer: Offer = signals.some((signal) => signal.type === "procesos_manuales") && viability >= 20
    ? "sistema_a_medida"
    : signals.some((signal) => signal.type === "sin_web")
      ? "landing"
      : signals.some((signal) => signal.type === "web_mala")
        ? "rediseno"
        : "ninguna"
  return { opportunity, viability, total, suggestedOffer }
}
