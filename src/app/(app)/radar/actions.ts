"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { requireUser } from "@/lib/auth"
import { searchInputSchema, type ActionState } from "@/lib/discovery/model"
import { runDiscoveryWorker } from "@/lib/discovery/run"
import { isDiscoveryConfigured } from "@/lib/env.server"

function startWorker(searchId: string) {
  after(async () => {
    try {
      await runDiscoveryWorker(searchId)
    } catch {
      // The durable job remains available for the next cron tick.
      console.error("El escaneo inmediato no terminó; el trabajo permanece en la cola.")
    }
  })
}

export async function createSearch(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser()
  const parsed = searchInputSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "Revisa los campos de la búsqueda.", fieldErrors: z.flattenError(parsed.error).fieldErrors }
  if (!isDiscoveryConfigured()) return { error: "El escaneo no está configurado. Revisa Ajustes antes de continuar." }
  const { data, error } = await supabase.rpc("create_discovery_search", {
    p_keywords: parsed.data.keywords, p_entidad: parsed.data.entidad, p_max_results: parsed.data.maxResults,
  })
  if (error) return { error: error.code === "P0001" ? "Ya tienes tres búsquedas activas. Espera a que termine alguna." : "No se pudo crear la búsqueda. Inténtalo de nuevo." }
  startWorker(data)
  revalidatePath("/busquedas")
  redirect(`/radar?search=${data}`)
}

export async function retrySearch(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser()
  const id = z.uuid().safeParse(formData.get("searchId"))
  if (!id.success) return { error: "La búsqueda no es válida." }
  if (!isDiscoveryConfigured()) return { error: "Revisa la configuración en Ajustes antes de reintentar." }
  const { error } = await supabase.rpc("retry_discovery_search", { p_search_id: id.data })
  if (error) return { error: error.code === "P0001" ? "Ya tienes tres búsquedas activas." : "No se pudo reintentar esta búsqueda." }
  startWorker(id.data)
  revalidatePath("/radar")
  revalidatePath("/busquedas")
  return { success: "Búsqueda en cola de nuevo." }
}
