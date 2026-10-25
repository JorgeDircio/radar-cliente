import { isWorkerAuthorized } from "@/lib/discovery/authorization"
import { runDiscoveryWorker } from "@/lib/discovery/run"
import { isDiscoveryConfigured } from "@/lib/env.server"

export const maxDuration = 60

export async function POST(request: Request) {
  if (
    !isWorkerAuthorized(
      request.headers.get("authorization"),
      process.env.WORKER_SECRET,
    )
  ) {
    return Response.json({ error: "No autorizado" }, { status: 401 })
  }
  if (!isDiscoveryConfigured())
    return Response.json({ error: "Escaneo sin configurar" }, { status: 503 })
  try {
    const outcomes = await runDiscoveryWorker()
    return Response.json({ outcomes })
  } catch {
    console.error("No se pudo ejecutar el worker de descubrimiento.")
    return Response.json(
      { error: "No se pudo procesar el escaneo" },
      { status: 503 },
    )
  }
}
