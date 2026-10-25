import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { z } from "zod"

import { BusinessContact } from "@/components/business-contact"
import { Pagination } from "@/components/pagination"
import { ScanRefresh } from "@/components/scan-refresh"
import { SearchStatus } from "@/components/search-status"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getRadarResults, getSearches } from "@/lib/discovery/queries"
import { stateName } from "@/lib/discovery/states"
import { isDiscoveryConfigured } from "@/lib/env.server"
import { AddLeadForm } from "../pipeline/lead-forms"
import { RetrySearchForm, SearchForm } from "./search-form"

export const maxDuration = 60
type SearchParams = Promise<{ search?: string; page?: string }>

export default function RadarPage({ searchParams }: { searchParams: SearchParams }) {
  const configured = isDiscoveryConfigured()
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Radar</h1>
        <p className="text-muted-foreground">Encuentra negocios y convierte una búsqueda en tu próxima conversación de venta.</p>
      </header>
      {!configured ? <Alert><AlertTitle>El escaneo requiere configuración</AlertTitle><AlertDescription>Consulta <Link href="/ajustes">Ajustes</Link> para conocer qué falta.</AlertDescription></Alert> : null}
      <Card>
        <CardHeader><CardTitle>Nueva búsqueda</CardTitle><CardDescription>Explora el directorio de negocios de INEGI por giro y estado. Los resultados se guardan conforme avanza la búsqueda.</CardDescription></CardHeader>
        <CardContent><SearchForm configured={configured} /></CardContent>
      </Card>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}><RadarResults searchParams={searchParams} /></Suspense>
    </div>
  )
}

async function RadarResults({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const page = z.coerce.number().int().min(1).max(10000).catch(1).parse(params.page ?? 1)
  const recent = params.search ? null : await getSearches()
  const searchId = params.search ?? recent?.searches[0]?.id
  if (!searchId) return <Empty><EmptyHeader><EmptyTitle>Tu radar está listo para empezar</EmptyTitle><EmptyDescription>Elige un giro y un estado para descubrir tus primeros negocios.</EmptyDescription></EmptyHeader></Empty>
  if (!z.uuid().safeParse(searchId).success) notFound()
  const { search, businesses, total, leadIds, job } = await getRadarResults(searchId, page)
  const active = search.status === "pending" || search.status === "running"
  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label="Resultados de búsqueda">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1"><h2 className="text-xl font-semibold">{search.keywords} · {stateName(search.entidad)}</h2><p className="text-sm text-muted-foreground">{total} negocios guardados · límite de {search.max_results}</p></div>
        <div className="flex items-center gap-3"><SearchStatus status={search.status} /><ScanRefresh active={active} /></div>
      </div>
      {active ? <p role="status" className="text-sm text-muted-foreground">La búsqueda continúa en segundo plano. Puedes revisar los primeros resultados o volver más tarde.</p> : null}
      {job?.last_error ? <Alert variant={search.status === "failed" ? "destructive" : "default"}><AlertTitle>{search.status === "failed" ? "No se pudo completar la búsqueda" : "Se reintentará automáticamente"}</AlertTitle><AlertDescription>{job.last_error}</AlertDescription></Alert> : null}
      {search.status === "failed" ? <RetrySearchForm searchId={search.id} /> : null}
      {businesses.length ? (
        <Table>
          <TableCaption>Datos de DENUE, INEGI. La ausencia de una web registrada todavía no confirma que el negocio no tenga sitio.</TableCaption>
          <TableHeader><TableRow><TableHead>Negocio</TableHead><TableHead>Ubicación</TableHead><TableHead>Contacto</TableHead><TableHead>Seguimiento</TableHead></TableRow></TableHeader>
          <TableBody>{businesses.map((business) => (
            <TableRow key={business.id}>
              <TableCell><div className="flex max-w-64 flex-col gap-1"><span className="truncate font-medium" title={business.name}>{business.name}</span><span className="truncate text-xs text-muted-foreground" title={business.scian_label ?? ""}>{business.scian_label ?? "Sin giro registrado"}</span><span className="text-xs text-muted-foreground">{business.estrato ?? "Tamaño no disponible"}</span></div></TableCell>
              <TableCell><div className="max-w-56 truncate" title={business.address ?? ""}>{business.municipio ?? business.address ?? "Sin ubicación"}</div></TableCell>
              <TableCell><BusinessContact website={business.website} phone={business.phone} /></TableCell>
              <TableCell>{leadIds.has(business.id) ? <Badge variant="secondary">En pipeline</Badge> : <AddLeadForm businessId={business.id} searchId={search.id} />}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      ) : <Empty><EmptyHeader><EmptyTitle>{active ? "Esperando los primeros negocios" : search.status === "failed" ? "Aún no hay resultados" : "No hay negocios en esta página"}</EmptyTitle><EmptyDescription>{active ? "Los resultados aparecerán automáticamente." : "Prueba otro giro o consulta otra búsqueda."}</EmptyDescription></EmptyHeader></Empty>}
      <Pagination page={page} total={total} href={`/radar?search=${search.id}`} />
      <Link href="/busquedas" className="self-start text-sm underline underline-offset-4">Ver todas mis búsquedas</Link>
    </section>
  )
}
