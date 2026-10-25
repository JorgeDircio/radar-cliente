import Link from "next/link"
import { connection } from "next/server"
import { Suspense } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { requireUser } from "@/lib/auth"

import { logout } from "../login/actions"

const NAV = [
  { href: "/radar", label: "Radar" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/busquedas", label: "Búsquedas" },
  { href: "/ajustes", label: "Ajustes" },
] as const

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <Suspense fallback={<Skeleton className="m-6 h-64" />}><AuthenticatedApp>{children}</AuthenticatedApp></Suspense>
}

async function AuthenticatedApp({ children }: { children: React.ReactNode }) {
  // Session validation is request-specific and must not run during prerendering.
  await connection()
  await requireUser()

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="flex items-center gap-1 border-b p-3 md:w-56 md:flex-col md:items-stretch md:border-r md:border-b-0">
        <span className="px-2 font-semibold md:mb-4">Radar de Clientes</span>
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-md px-2 py-1.5 text-sm hover:bg-muted">
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="ml-auto md:mt-auto md:ml-0">
          <Button type="submit" variant="ghost" size="sm">
            Salir
          </Button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
    </div>
  )
}
