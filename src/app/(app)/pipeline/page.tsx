import { Suspense } from "react"
import Link from "next/link"
import { z } from "zod"
import { BusinessContact } from "@/components/business-contact"
import { Pagination } from "@/components/pagination"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { LEAD_STAGES } from "@/lib/leads/model"
import { getLeads } from "@/lib/leads/queries"
import { AuditLeadForm, LeadStageForm } from "./lead-forms"

type SearchParams = Promise<{ page?: string }>

export default function PipelinePage({ searchParams }: { searchParams: SearchParams }) {
  return <div className="flex flex-col gap-6"><header><h1 className="text-2xl font-semibold">Pipeline</h1><p className="text-muted-foreground">Da seguimiento a los negocios que elegiste contactar.</p></header><Suspense fallback={<Skeleton className="h-64 w-full" />}><Pipeline searchParams={searchParams} /></Suspense></div>
}

async function Pipeline({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const page = z.coerce.number().int().min(1).max(10000).catch(1).parse(params.page ?? 1)
  const { leads, total } = await getLeads(page)
  if (!leads.length && page === 1) return <Empty><EmptyHeader><EmptyTitle>Todavía no tienes prospectos en seguimiento</EmptyTitle><EmptyDescription>Agrega un negocio desde el <Link href="/radar">Radar</Link> para empezar.</EmptyDescription></EmptyHeader></Empty>
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{total} prospectos en total. Las columnas muestran los de esta página.</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(LEAD_STAGES).map(([stage, label]) => {
          const items = leads.filter((lead) => lead.stage === stage)
          return <section key={stage} aria-label={label} className="flex min-w-0 flex-col gap-3 rounded-xl border bg-muted/30 p-3">
            <h2 className="flex items-center gap-2 font-semibold">{label}<Badge variant="secondary">{items.length}</Badge></h2>
            {items.length ? items.map((lead) => <Card key={lead.id}>
              <CardHeader><CardTitle>{lead.business.name}</CardTitle><CardDescription>{lead.business.municipio ?? lead.business.entidad ?? "Ubicación no disponible"}</CardDescription></CardHeader>
              <CardContent>
                <BusinessContact website={lead.business.website} phone={lead.business.phone} />
                {lead.business.scores ? <p className="mt-3 text-sm text-muted-foreground">Score: <span className="font-medium text-foreground">{lead.business.scores.total}/100</span> · Oferta: {lead.business.scores.suggested_offer}</p> : <p className="mt-3 text-sm text-muted-foreground">Sin análisis todavía.</p>}
              </CardContent>
              <CardFooter><AuditLeadForm leadId={lead.id} /></CardFooter>
              <CardFooter><LeadStageForm leadId={lead.id} stage={lead.stage} /></CardFooter>
            </Card>) : <p className="text-sm text-muted-foreground">Sin prospectos en esta página.</p>}
          </section>
        })}
      </div>
      <Pagination page={page} total={total} href="/pipeline" />
    </div>
  )
}
