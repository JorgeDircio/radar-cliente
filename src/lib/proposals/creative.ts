import { proposalCreativeSchema, type ProposalCreative } from "./model"
import { chooseLandingVariant } from "./variants"

export function fallbackProposalCreative({ businessName, scianLabel, offer, summary }: { businessName: string; scianLabel: string | null; offer: string; summary: string }): ProposalCreative {
  const serviceBusiness = /(sal[oó]n|cl[ií]nica|consultorio|restaurante|hotel|m[eé]dico|dent)/i.test(scianLabel ?? "")
  const friendlyName = /sin nombre/i.test(businessName)
    ? /dent/i.test(scianLabel ?? "") ? "tu consultorio dental" : serviceBusiness ? "tu consultorio" : "tu negocio"
    : businessName
  return proposalCreativeSchema.parse({
    brandVoice: serviceBusiness ? "calido" : "directo",
    designVariant: chooseLandingVariant(businessName, offer, scianLabel),
    headline: offer === "landing" ? `Una presencia digital que explique ${friendlyName}` : summary.slice(0, 110),
    subheadline: serviceBusiness ? "Una página clara para presentar tus servicios y facilitar el primer contacto." : "Una experiencia breve, clara y pensada para convertir interés en conversación.",
    valuePillars: serviceBusiness ? ["Servicios fáciles de entender", "Ubicación y contacto visibles", "WhatsApp como siguiente paso"] : ["Mensaje más claro", "Contacto sin fricción", "Una presencia que te representa"],
    ctaLabel: "Ver la idea",
  })
}
