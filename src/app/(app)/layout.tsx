import Link from "next/link"
import { connection } from "next/server"

import { Button } from "@/components/ui/button"
import { requireUser } from "@/lib/auth"

import { logout } from "../login/actions"

const NAV = [
  { href: "/radar", label: "Radar" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/busquedas", label: "Búsquedas" },
  { href: "/ajustes", label: "Ajustes" },
] as const

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // The private app depends on the incoming Supabase session. Establish the
  // request boundary before creating the client so Cache Components never
  // attempts to prerender auth state (or its timestamps).
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
