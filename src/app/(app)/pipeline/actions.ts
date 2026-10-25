"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireUser } from "@/lib/auth"
import type { ActionState } from "@/lib/discovery/model"
import { leadStageSchema } from "@/lib/leads/model"

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
