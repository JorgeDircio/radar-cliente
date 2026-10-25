import { Badge } from "@/components/ui/badge"

const labels: Record<string, string> = {
  pending: "En cola",
  running: "Buscando",
  done: "Completada",
  failed: "Requiere atención",
}

export function SearchStatus({ status }: { status: string }) {
  return (
    <Badge
      variant={
        status === "failed"
          ? "destructive"
          : status === "done"
            ? "secondary"
            : "outline"
      }
    >
      {labels[status] ?? status}
    </Badge>
  )
}
