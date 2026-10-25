import Link from "next/link"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"

export default function NotFound() {
  return <Empty><EmptyHeader><EmptyTitle>No encontramos esta búsqueda</EmptyTitle><EmptyDescription>Consulta <Link href="/busquedas">tus búsquedas guardadas</Link> o inicia una nueva desde el Radar.</EmptyDescription></EmptyHeader></Empty>
}
