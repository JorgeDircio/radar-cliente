import { z } from "zod"

export const leadStageSchema = z.enum([
  "nuevo",
  "calificado",
  "contactado",
  "propuesta",
  "ganado",
  "perdido",
])
export type LeadStage = z.infer<typeof leadStageSchema>
export const LEAD_STAGES: Record<LeadStage, string> = {
  nuevo: "Nuevo",
  calificado: "Calificado",
  contactado: "Contactado",
  propuesta: "Propuesta",
  ganado: "Ganado",
  perdido: "Perdido",
}
