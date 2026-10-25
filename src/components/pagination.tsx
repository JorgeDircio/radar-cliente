import Link from "next/link"
import { Button } from "@/components/ui/button"
import { RESULTS_PER_PAGE } from "@/lib/discovery/queries"

export function Pagination({
  page,
  total,
  href,
}: {
  page: number
  total: number
  href: string
}) {
  const pages = Math.max(1, Math.ceil(total / RESULTS_PER_PAGE))
  if (pages <= 1 && page === 1) return null
  const separator = href.includes("?") ? "&" : "?"
  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center gap-3">
      {page > 1 ? (
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`${href}${separator}page=${page - 1}`} />}
        >
          Anterior
        </Button>
      ) : null}
      <span className="text-sm text-muted-foreground">
        Página {page} de {pages} · {total} registros
      </span>
      {page < pages ? (
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`${href}${separator}page=${page + 1}`} />}
        >
          Siguiente
        </Button>
      ) : null}
    </nav>
  )
}
