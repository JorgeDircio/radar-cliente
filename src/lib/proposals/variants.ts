export const LANDING_VARIANTS = ["editorial", "clinical", "local", "conversion", "premium", "bold"] as const
export type LandingVariant = (typeof LANDING_VARIANTS)[number]

export type LandingVariantDefinition = {
  id: LandingVariant
  label: string
  eyebrow: string
  pageClass: string
  shellClass: string
  accentClass: string
  buttonClass: string
  mutedClass: string
}

const variants: Record<LandingVariant, LandingVariantDefinition> = {
  editorial: { id: "editorial", label: "Editorial", eyebrow: "Una idea con dirección", pageClass: "bg-stone-100 text-stone-950", shellClass: "border-stone-900/10 bg-stone-50 shadow-stone-900/10", accentClass: "text-amber-700", buttonClass: "bg-stone-950 text-stone-50 hover:bg-stone-800", mutedClass: "text-stone-600" },
  clinical: { id: "clinical", label: "Clínica", eyebrow: "Una experiencia más clara para tus pacientes", pageClass: "bg-sky-50 text-slate-950", shellClass: "border-sky-900/10 bg-white shadow-sky-900/10", accentClass: "text-sky-700", buttonClass: "bg-sky-700 text-white hover:bg-sky-800", mutedClass: "text-slate-600" },
  local: { id: "local", label: "Local", eyebrow: "Más cerca de las personas que te buscan", pageClass: "bg-orange-50 text-orange-950", shellClass: "border-orange-900/10 bg-[#fffaf3] shadow-orange-900/10", accentClass: "text-orange-700", buttonClass: "bg-orange-700 text-white hover:bg-orange-800", mutedClass: "text-orange-900/70" },
  conversion: { id: "conversion", label: "Conversión", eyebrow: "Menos fricción. Más conversaciones.", pageClass: "bg-zinc-950 text-zinc-50", shellClass: "border-white/15 bg-zinc-900 shadow-black/30", accentClass: "text-lime-300", buttonClass: "bg-lime-300 text-zinc-950 hover:bg-lime-200", mutedClass: "text-zinc-300" },
  premium: { id: "premium", label: "Premium", eyebrow: "Una presencia digital a la altura", pageClass: "bg-[#11100f] text-[#f8f0df]", shellClass: "border-[#d9b77a]/30 bg-[#1a1713] shadow-black/30", accentClass: "text-[#e7c78d]", buttonClass: "bg-[#e7c78d] text-[#211a11] hover:bg-[#f0d8a7]", mutedClass: "text-[#d8cbb8]" },
  bold: { id: "bold", label: "Bold", eyebrow: "Haz que la primera impresión trabaje por ti", pageClass: "bg-fuchsia-50 text-fuchsia-950", shellClass: "border-fuchsia-900/10 bg-white shadow-fuchsia-900/10", accentClass: "text-fuchsia-700", buttonClass: "bg-fuchsia-700 text-white hover:bg-fuchsia-800", mutedClass: "text-fuchsia-950/65" },
}

export function getLandingVariant(value: string | null | undefined): LandingVariantDefinition {
  return variants[value as LandingVariant] ?? variants.editorial
}

/** Stable variation: the same prospect keeps its visual identity across republishing. */
export function chooseLandingVariant(seed: string, offer: string, scianLabel: string | null | undefined): LandingVariant {
  const lower = `${seed} ${scianLabel ?? ""}`.toLowerCase()
  if (/(dent|m[eé]dic|cl[ií]nic|consultorio|odont)/i.test(lower)) return "clinical"
  if (offer === "sistema_a_medida") return "conversion"
  if (/(restaurante|hotel|sal[oó]n|caf[eé]|local|tienda)/i.test(lower)) return "local"
  if (offer === "rediseno") return "premium"
  const hash = [...seed].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 0)
  return LANDING_VARIANTS[hash % LANDING_VARIANTS.length]
}

export function landingVariantSkill(variant: LandingVariant): string {
  return `La landing usará la dirección visual ${variants[variant].label}. Mantén esa personalidad: ${variants[variant].eyebrow}. No uses frases genéricas de plantilla ni menciones que el contenido fue generado por IA.`
}
