"use client"

import { useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function ScanRefresh({ active }: { active: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  useEffect(() => {
    if (!active || pending) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible")
        startTransition(() => router.refresh())
    }, 5000)
    return () => window.clearInterval(timer)
  }, [active, pending, router])

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? "Actualizando…" : "Actualizar"}
    </Button>
  )
}
