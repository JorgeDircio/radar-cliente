import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_PATHS = ["/login", "/signup", "/auth", "/p", "/api/proposals"]

export async function updateSession(request: NextRequest) {
  // The worker verifies its Bearer secret, independently from browser sessions.
  if (request.nextUrl.pathname === "/api/worker") return NextResponse.next({ request })
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  // Optimistic check only; pages and actions still verify the user against RLS.
  const { data } = await supabase.auth.getClaims()
  const isPublic = PUBLIC_PATHS.some((p) => request.nextUrl.pathname === p || request.nextUrl.pathname.startsWith(`${p}/`))

  if (!data?.claims && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  return response
}
