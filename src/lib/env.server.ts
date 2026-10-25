import "server-only"

import { z } from "zod"

const adminSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().trim().min(1),
})

const discoverySchema = adminSchema.extend({
  DENUE_TOKEN: z.string().trim().min(1),
  WORKER_SECRET: z.string().min(16),
})

export const adminEnv = () => adminSchema.parse(process.env)
export const discoveryEnv = () => discoverySchema.parse(process.env)
export const isDiscoveryConfigured = () =>
  discoverySchema.safeParse(process.env).success
