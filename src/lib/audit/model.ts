export type WebsiteFeatures = {
  booking: boolean
  ecommerce: boolean
  whatsapp: boolean
  contactForm: boolean
}

export type WebsiteAudit = {
  url: string
  reachable: boolean
  https: boolean | null
  responsive: boolean | null
  psiScores: null
  tech: {
    cms: string | null
    jqueryVersion: string | null
  }
  copyrightYear: number | null
  features: WebsiteFeatures
  fetchedAt: string
}

export type AuditFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>
