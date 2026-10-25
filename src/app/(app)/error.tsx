"use client"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function AppError({ reset }: { reset: () => void }) {
  return <div className="flex flex-col items-start gap-4"><Alert variant="destructive"><AlertTitle>No se pudo cargar esta página</AlertTitle><AlertDescription>Comprueba la conexión e inténtalo de nuevo. Tus datos guardados se conservan.</AlertDescription></Alert><Button onClick={reset} variant="outline">Reintentar</Button></div>
}
