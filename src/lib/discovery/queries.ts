import "server-only"

import { notFound } from "next/navigation"
import { requireUser } from "@/lib/auth"

export const BUSINESS_FIELDS =
  "id, name, scian_label, address, municipio, entidad, phone, email, website, estrato" as const
export const RESULTS_PER_PAGE = 25

export async function getSearches(page = 1) {
  const { supabase, userId } = await requireUser()
  const { data, count, error } = await supabase
    .from("searches")
    .select("id, keywords, entidad, status, max_results, created_at", {
      count: "exact",
    })
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * RESULTS_PER_PAGE, page * RESULTS_PER_PAGE - 1)
  if (error) throw new Error("No se pudieron cargar las búsquedas.")
  return { searches: data, total: count ?? 0 }
}

export async function getRadarResults(searchId: string, page: number) {
  const { supabase, userId } = await requireUser()
  const { data: search, error: searchError } = await supabase
    .from("searches")
    .select("id, keywords, entidad, status, max_results")
    .eq("id", searchId)
    .eq("owner_id", userId)
    .maybeSingle()
  if (searchError) throw new Error("No se pudo cargar la búsqueda.")
  if (!search) notFound()

  const [results, jobs] = await Promise.all([
    supabase
      .from("search_results")
      .select(`business:businesses!inner(${BUSINESS_FIELDS})`, {
        count: "exact",
      })
      .eq("search_id", searchId)
      .order("business_id")
      .range((page - 1) * RESULTS_PER_PAGE, page * RESULTS_PER_PAGE - 1),
    supabase
      .from("scan_jobs")
      .select("last_error, run_after, attempts")
      .eq("search_id", searchId)
      .eq("owner_id", userId)
      .neq("status", "done")
      .order("id", { ascending: false })
      .limit(1),
  ])
  if (results.error || jobs.error)
    throw new Error("No se pudieron cargar los resultados.")
  const businesses = results.data.map((row) => row.business)
  const ids = businesses.map((business) => business.id)
  const leads = ids.length
    ? await supabase
        .from("leads")
        .select("business_id")
        .eq("owner_id", userId)
        .in("business_id", ids)
    : { data: [], error: null }
  if (leads.error) throw new Error("No se pudo consultar el seguimiento.")
  return {
    search,
    businesses,
    total: results.count ?? 0,
    leadIds: new Set(leads.data?.map((lead) => lead.business_id)),
    job: jobs.data[0],
  }
}
