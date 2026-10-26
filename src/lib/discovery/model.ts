import { z } from "zod"

export const searchInputSchema = z.object({
  keywords: z.string().trim().min(2, "Escribe al menos 2 caracteres.").max(100),
  entidad: z
    .string()
    .regex(/^(0[1-9]|[12][0-9]|3[0-2])$/, "Selecciona un estado."),
  maxResults: z.coerce.number().int().min(1).max(500),
})

export type SearchInput = z.infer<typeof searchInputSchema>

export type DiscoveredBusiness = {
  denue_id: string
  name: string
  scian_code: string | null
  scian_label: string | null
  address: string | null
  entidad: string | null
  municipio: string | null
  lat: number | null
  lng: number | null
  phone: string | null
  email: string | null
  website: string | null
  estrato: string | null
}

export type DiscoveryJob = {
  id: number
  searchId: string
  type: "discover"
  attempt: number
  maxAttempts: number
  start: number
  lockToken: string
}

// Small ports keep the use case independent from Next.js, HTTP and Supabase.
export interface BusinessSource {
  discover(
    input: SearchInput,
    start: number,
    end: number,
  ): Promise<DiscoveredBusiness[]>
}

export interface DiscoveryRepository {
  claim(searchId?: string): Promise<DiscoveryJob | null>
  getSearch(id: string): Promise<SearchInput>
  complete(
    job: DiscoveryJob,
    businesses: DiscoveredBusiness[],
    nextStart: number | null,
  ): Promise<void>
  fail(
    job: DiscoveryJob,
    failure: { message: string; retryInSeconds: number | null },
  ): Promise<void>
}

export class DiscoveryError extends Error {
  constructor(
    message: string,
    readonly retryable = true,
  ) {
    super(message)
    this.name = "DiscoveryError"
  }
}

export type ActionState = {
  error?: string
  success?: string
  fieldErrors?: Record<string, string[] | undefined>
}
