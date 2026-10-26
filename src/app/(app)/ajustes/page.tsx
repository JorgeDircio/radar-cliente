import { Suspense } from "react"
import { isAiConfigured } from "@/lib/env.server"
import { requireUser } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function AjustesPage() {
  return <div className="flex flex-col gap-6"><h1 className="text-2xl font-semibold">Ajustes</h1><Suspense fallback={<Skeleton className="h-40 w-full" />}><Configuration /></Suspense></div>
}

async function Configuration() {
  await requireUser()
  const checks = [
    ["Acceso al directorio DENUE", Boolean(process.env.DENUE_TOKEN?.trim())],
    ["Permiso para guardar los negocios", Boolean(process.env.SUPABASE_SECRET_KEY?.trim())],
    ["Acceso del procesador de búsquedas", (process.env.WORKER_SECRET?.length ?? 0) >= 16],
    ["Agente de propuestas IA", isAiConfigured()],
  ] as const
  return <Card><CardHeader><CardTitle>Disponibilidad del escaneo</CardTitle><CardDescription>Las credenciales se administran en la configuración del servidor. Aquí puedes comprobar su presencia; la conexión se verifica al ejecutar una búsqueda.</CardDescription></CardHeader><CardContent>
    <ul className="flex flex-col gap-3">{checks.map(([label, ready]) => <li key={label} className="flex flex-wrap items-center justify-between gap-3"><span>{label}</span><Badge variant={ready ? "secondary" : "outline"}>{ready ? "Configurado" : "Pendiente"}</Badge></li>)}</ul>
  </CardContent></Card>
}
