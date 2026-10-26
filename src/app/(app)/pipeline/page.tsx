import { Suspense } from "react"
import Link from "next/link"
import { ArrowUpRight, CheckCircle2, CircleDotDashed, FileText, MessageCircle, Target, Trophy, XCircle } from "lucide-react"
import { z } from "zod"

import { BusinessContact } from "@/components/business-contact"
import { Pagination } from "@/components/pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { LEAD_STAGES, type LeadStage } from "@/lib/leads/model"
import { getLeads } from "@/lib/leads/queries"

type SearchParams = Promise<{ page?: string }>

const stageMeta: Record<LeadStage, { description: string; icon: typeof Target }> = {
  nuevo: { description: "Por revisar", icon: CircleDotDashed },
  calificado: { description: "Con oportunidad", icon: Target },
  contactado: { description: "En conversación", icon: MessageCircle },
  propuesta: { description: "Con propuesta", icon: FileText },
  ganado: { description: "Cerrados", icon: Trophy },
  perdido: { description: "Para aprender", icon: XCircle },
}

export default function PipelinePage({ searchParams }: { searchParams: SearchParams }) {
  return <div className="flex flex-col gap-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">CRM comercial</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Pipeline</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">Una vista clara de quién revisar, contactar y convertir en tu próximo proyecto.</p>
      </div>
      <Button variant="outline" nativeButton={false} render={<Link href="/radar" />}>Buscar prospectos <ArrowUpRight data-icon="inline-end" /></Button>
    </header>
    <Suspense fallback={<Skeleton className="h-[32rem] w-full" />}><Pipeline searchParams={searchParams} /></Suspense>
  </div>
}

async function Pipeline({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const page = z.coerce.number().int().min(1).max(10000).catch(1).parse(params.page ?? 1)
  const { leads, total } = await getLeads(page)
  if (!leads.length && page === 1) return <Empty><EmptyHeader><EmptyTitle>Todavía no tienes prospectos en seguimiento</EmptyTitle><EmptyDescription>Agrega un negocio desde el <Link href="/radar" className="underline underline-offset-4">Radar</Link> para empezar.</EmptyDescription></EmptyHeader></Empty>

  const analyzedOnPage = leads.filter((lead) => Boolean(lead.business.scores)).length
  const contactedOnPage = leads.filter((lead) => lead.contact_status !== "no_contactado").length
  return <div className="flex flex-col gap-4">
    <div className="grid gap-3 sm:grid-cols-3">
      <SummaryCard label="Prospectos" value={total} detail="en todo el pipeline" />
      <SummaryCard label="Analizados" value={analyzedOnPage} detail="en esta página" icon={<CheckCircle2 />} />
      <SummaryCard label="Con seguimiento" value={contactedOnPage} detail="en esta página" icon={<MessageCircle />} />
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">Página {page} · {leads.length} tarjetas visibles · abre una ficha para trabajar el prospecto.</p>
      <Badge variant="secondary">{total} en total</Badge>
    </div>
    <div className="overflow-x-auto pb-3">
      <div className="grid min-w-[1540px] grid-cols-6 gap-4">
        {(Object.entries(LEAD_STAGES) as [LeadStage, string][]).map(([stage, label]) => {
          const items = leads.filter((lead) => lead.stage === stage)
          const Icon = stageMeta[stage].icon
          return <section key={stage} aria-label={label} className="flex max-h-[calc(100vh-18rem)] min-h-80 min-w-0 flex-col rounded-2xl border bg-muted/20 shadow-sm">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-t-2xl border-b bg-background/95 px-4 py-3 backdrop-blur">
              <div className="flex min-w-0 items-center gap-2"><Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><div className="min-w-0"><h2 className="truncate font-semibold">{label}</h2><p className="text-xs text-muted-foreground">{stageMeta[stage].description}</p></div></div>
              <Badge variant={items.length ? "default" : "secondary"}>{items.length}</Badge>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
              {items.length ? items.map((lead) => <PipelineCard key={lead.id} lead={lead} />) : <p className="m-auto px-3 text-center text-sm text-muted-foreground">Sin prospectos aquí todavía.</p>}
            </div>
          </section>
        })}
      </div>
    </div>
    <Pagination page={page} total={total} href="/pipeline" />
  </div>
}

function SummaryCard({ label, value, detail, icon }: { label: string; value: number; detail: string; icon?: React.ReactNode }) {
  return <Card size="sm"><CardContent className="flex items-center justify-between gap-3"><div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p><p className="text-xs text-muted-foreground">{detail}</p></div>{icon ? <div className="rounded-lg bg-muted p-2 text-muted-foreground">{icon}</div> : null}</CardContent></Card>
}

function PipelineCard({ lead }: { lead: Awaited<ReturnType<typeof getLeads>>["leads"][number] }) {
  const score = lead.business.scores?.total
  return <Card size="sm" className="transition-shadow hover:shadow-md">
    <CardHeader className="gap-2 pb-2">
      <div className="flex items-start justify-between gap-2">
        <CardTitle className="min-w-0 text-sm leading-5"><Link href={`/pipeline/${lead.id}`} className="line-clamp-2 hover:underline">{lead.business.name}</Link></CardTitle>
        {score !== undefined && score !== null ? <Badge variant={score >= 70 ? "default" : "secondary"}>{score}/100</Badge> : null}
      </div>
      <CardDescription className="truncate">{lead.business.municipio ?? lead.business.entidad ?? "Ubicación no disponible"}</CardDescription>
    </CardHeader>
    <CardContent className="flex flex-col gap-3 pt-0">
      <BusinessContact website={lead.business.website} phone={lead.business.phone} />
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {lead.business.scores ? <span>Oferta: <span className="font-medium text-foreground">{lead.business.scores.suggested_offer}</span></span> : <span>Sin análisis</span>}
        {lead.do_not_contact ? <Badge variant="destructive">No contactar</Badge> : lead.contact_status !== "no_contactado" ? <Badge variant="secondary">{lead.contact_status}</Badge> : null}
      </div>
    </CardContent>
    <CardFooter className="border-t bg-muted/20 pt-3">
      <Button className="w-full" variant="outline" size="sm" nativeButton={false} render={<Link href={`/pipeline/${lead.id}`} />}>Abrir ficha <ArrowUpRight data-icon="inline-end" /></Button>
    </CardFooter>
  </Card>
}
