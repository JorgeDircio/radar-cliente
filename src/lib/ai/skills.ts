import type { ProspectContext } from "./prospect"
import { chooseLandingVariant, landingVariantSkill, type LandingVariant } from "@/lib/proposals/variants"

export type ProspectSkill = {
  id: string
  purpose: string
  instruction: string
}

export type SelectedProspectSkills = {
  skills: ProspectSkill[]
  landingVariant: LandingVariant
  instructions: string
}

const skillLibrary: ProspectSkill[] = [
  { id: "brand-positioning", purpose: "Traducir el giro en una identidad comercial clara.", instruction: "Habla desde el mundo del negocio: sus clientes, su decisión y el momento en que necesita ayuda. No describas al prospecto como un registro de directorio." },
  { id: "value-ladder", purpose: "Vender una mejora observable, no una lista de tecnología.", instruction: "Conecta una señal real con un entregable y una consecuencia útil: qué se construye, para qué sirve y cuál es el siguiente paso. No prometas ventas ni resultados garantizados." },
  { id: "voice-natural", purpose: "Evitar el tono robótico de IA.", instruction: "Escribe en español mexicano natural, con frases cortas y una observación específica. Evita 'solución integral', 'llevar tu negocio al siguiente nivel', 'he detectado una oportunidad' y explicaciones defensivas." },
  { id: "conversion-copy", purpose: "Reducir fricción en el primer contacto.", instruction: "La primera propuesta debe poder entenderse en 10 segundos. Cierra con una pregunta fácil de responder, preferentemente ofrecer un ejemplo visual por este mismo canal." },
  { id: "evidence-guard", purpose: "Mantener rigor y cumplimiento.", instruction: "Solo usa señales públicas proporcionadas. La falta de web es una observación válida, no una prueba de que el negocio esté perdiendo clientes. No inventes reseñas, precios, clientes, problemas ni métricas." },
]

export function selectProspectSkills(context: ProspectContext): SelectedProspectSkills {
  const offer = context.score?.suggestedOffer ?? (!context.business.website ? "landing" : "rediseno")
  const landingVariant = chooseLandingVariant(context.business.name, offer, context.business.scianLabel)
  const skills = skillLibrary.slice()
  skills.push({ id: "landing-art-direction", purpose: "Crear una landing reconocible y no repetitiva.", instruction: landingVariantSkill(landingVariant) })
  return { skills, landingVariant, instructions: skills.map((skill) => `[${skill.id}] ${skill.instruction}`).join("\n") }
}
