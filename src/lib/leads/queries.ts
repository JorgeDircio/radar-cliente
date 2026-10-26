import "server-only"

import { requireUser } from "@/lib/auth"
import { BUSINESS_FIELDS, RESULTS_PER_PAGE } from "@/lib/discovery/queries"

export async function getLeads(page: number) {
  const { supabase, userId } = await requireUser()
  const { data, count, error } = await supabase
    .from("leads")
    .select(`id, stage, business:businesses!inner(${BUSINESS_FIELDS}, scores(opportunity, viability, total, suggested_offer, computed_at))`, {
      count: "exact",
    })
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * RESULTS_PER_PAGE, page * RESULTS_PER_PAGE - 1)
  if (error) throw new Error("No se pudo cargar el pipeline.")
  return { leads: data, total: count ?? 0 }
}
