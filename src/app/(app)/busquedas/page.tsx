import { Suspense } from "react"
import Link from "next/link"
import { z } from "zod"
import { Pagination } from "@/components/pagination"
import { ScanRefresh } from "@/components/scan-refresh"
import { SearchStatus } from "@/components/search-status"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getSearches } from "@/lib/discovery/queries"
import { stateName } from "@/lib/discovery/states"

type SearchParams = Promise<{ page?: string }>

export default function BusquedasPage({ searchParams }: { searchParams: SearchParams }) {
  return <div className="flex flex-col gap-6"><header><h1 className="text-2xl font-semibold">Mis búsquedas</h1><p className="text-muted-foreground">Retoma los resultados de tus exploraciones anteriores.</p></header><Suspense fallback={<Skeleton className="h-48 w-full" />}><SearchHistory searchParams={searchParams} /></Suspense></div>
}

async function SearchHistory({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const page = z.coerce.number().int().min(1).max(10000).catch(1).parse(params.page ?? 1)
  const { searches, total } = await getSearches(page)
  return <div className="flex flex-col gap-4">
    <div className="self-start"><ScanRefresh active={searches.some((search) => ["pending", "running"].includes(search.status))} /></div>
    {searches.length ? <Table><TableHeader><TableRow><TableHead>Búsqueda</TableHead><TableHead>Estado</TableHead><TableHead>Avance</TableHead><TableHead>Fecha</TableHead></TableRow></TableHeader><TableBody>
      {searches.map((search) => <TableRow key={search.id}><TableCell><Link href={`/radar?search=${search.id}`} className="underline underline-offset-4">{search.keywords}</Link></TableCell><TableCell>{stateName(search.entidad)}</TableCell><TableCell><SearchStatus status={search.status} /></TableCell><TableCell>{new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeZone: "America/Mexico_City" }).format(new Date(search.created_at))}</TableCell></TableRow>)}
    </TableBody></Table> : <Empty><EmptyHeader><EmptyTitle>No hay búsquedas en esta página</EmptyTitle><EmptyDescription>Inicia una desde el <Link href="/radar">Radar</Link>.</EmptyDescription></EmptyHeader></Empty>}
    <Pagination page={page} total={total} href="/busquedas" />
  </div>
}
