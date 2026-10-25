import "server-only"

import { createClient } from "@supabase/supabase-js"

import { adminEnv } from "@/lib/env.server"
import type { Database } from "./database.types"

/** Bypasses RLS. Only for the job worker and other trusted server code. */
export function createAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY } = adminEnv()
  return createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
