export type ProposalDraftContent = {
  summary: string
  rationale: string
  offer: string
  whatsappMessage: string | null
  websiteMessage: string | null
  nextAction: string | null
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
  return {
    summary: section(content, "Resumen", ["Por qué", "Oferta", "WhatsApp (borrador)"]) ?? "Propuesta de mejora digital.",
    rationale: section(content, "Por qué", ["Oferta", "WhatsApp (borrador)"]) ?? "Hay una oportunidad de mejorar la presencia digital.",
    offer: section(content, "Oferta", ["WhatsApp (borrador)", "Web/email (borrador)"]) ?? "landing",
    whatsappMessage: section(content, "WhatsApp (borrador)", ["Web/email (borrador)", "Siguiente acción"]),
    websiteMessage: section(content, "Web/email (borrador)", ["Siguiente acción"]),
    nextAction: section(content, "Siguiente acción", []),
  }
}
