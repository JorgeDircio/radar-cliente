import "server-only"

import { notFound } from "next/navigation"
import { z } from "zod"

import { createAdminClient } from "@/lib/supabase/admin"

export async function getPublicProposal(token: string, trackView = true) {
  const parsed = z.uuid().safeParse(token)
  if (!parsed.success) notFound()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("proposal_pages")
    .select("id, title, summary, rationale, offer, whatsapp_message, cta_url, created_at")
    .eq("token", parsed.data)
    .eq("status", "published")
    .maybeSingle()
  if (error) throw new Error("No se pudo cargar la propuesta.")
  if (!data) notFound()

  if (trackView) await admin.from("proposal_events").insert({ proposal_id: data.id, type: "view", metadata: {} })
  return data
}
