import { NextResponse } from "next/server"
import { z } from "zod"

import { createAdminClient } from "@/lib/supabase/admin"

type Context = { params: Promise<{ token: string }> }

export async function GET(_request: Request, { params }: Context) {
  const { token } = await params
  const parsed = z.uuid().safeParse(token)
  if (!parsed.success) return new NextResponse("Propuesta no encontrada", { status: 404 })

  const admin = createAdminClient()
  const { data: proposal, error } = await admin
    .from("proposal_pages")
    .select("id, lead_id, owner_id, cta_url")
    .eq("token", parsed.data)
    .eq("status", "published")
    .maybeSingle()
  if (error || !proposal?.cta_url) return new NextResponse("Propuesta no encontrada", { status: 404 })

  let target: URL
  try {
    target = new URL(proposal.cta_url)
  } catch {
    return new NextResponse("Destino no válido", { status: 400 })
  }
  if (!(["http:", "https:", "mailto:"].includes(target.protocol))) return new NextResponse("Destino no válido", { status: 400 })

  await admin.from("proposal_events").insert({ proposal_id: proposal.id, type: "cta_clicked", metadata: {} })
  await admin.from("leads").update({ stage: "propuesta", contact_status: "interesado", next_action_at: new Date().toISOString() }).eq("id", proposal.lead_id).eq("owner_id", proposal.owner_id)
  await admin.from("activities").insert({ owner_id: proposal.owner_id, lead_id: proposal.lead_id, type: "propuesta", content: "Interés detectado: el prospecto abrió el CTA de la propuesta visual." })

  return NextResponse.redirect(target)
}
