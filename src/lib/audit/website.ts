import { websiteUrl } from "@/lib/businesses/contact"
import type { AuditFetcher, WebsiteAudit, WebsiteFeatures } from "./model"

const MAX_HTML_BYTES = 1_000_000
const REQUEST_TIMEOUT_MS = 10_000

function safeUrl(value: string | null | undefined): URL | null {
  const normalized = websiteUrl(value)
  if (!normalized) return null
  const url = new URL(normalized)
  const hostname = url.hostname.toLowerCase()
  if (
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  ) return null
  return url
}

function textFromHtml(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function detectFeatures(html: string): WebsiteFeatures {
  const lower = html.toLowerCase()
  return {
    booking: /(reserv|cita|agenda|booking|appointment)/i.test(lower),
    ecommerce: /(carrito|checkout|shopify|woocommerce|addtocart)/i.test(lower),
    whatsapp: /(?:wa\.me|api\.whatsapp\.com|whatsapp)/i.test(lower),
    contactForm: /<form\b/i.test(lower),
  }
}

function detectCms(html: string): string | null {
  const generator = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i)?.[1]
  if (generator) return generator.trim().slice(0, 80)
  if (/wp-content|wordpress/i.test(html)) return "WordPress"
  if (/wixstatic|wix\.com/i.test(html)) return "Wix"
  if (/static\.canva|canva\.com/i.test(html)) return "Canva"
  return null
}

function detectCopyrightYear(html: string): number | null {
  const years = [...textFromHtml(html).matchAll(/(?:©|copyright)\s*(20\d{2})/gi)]
    .map((match) => Number(match[1]))
    .filter((year) => Number.isInteger(year))
  return years.length ? Math.max(...years) : null
}

function baseAudit(url: URL, fetchedAt = new Date().toISOString()): WebsiteAudit {
  return {
    url: url.toString(),
    reachable: false,
    https: url.protocol === "https:",
    responsive: null,
    psiScores: null,
    tech: { cms: null, jqueryVersion: null },
    copyrightYear: null,
    features: { booking: false, ecommerce: false, whatsapp: false, contactForm: false },
    fetchedAt,
  }
}

export async function auditWebsite(
  value: string | null | undefined,
  fetcher: AuditFetcher = fetch,
): Promise<WebsiteAudit | null> {
  const url = safeUrl(value)
  if (!url) return null
  const audit = baseAudit(url)
  try {
    const response = await fetcher(url, {
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "RadarClientesBot/1.0 (+contacto)" },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) return audit
    const html = await response.text()
    if (new TextEncoder().encode(html).byteLength > MAX_HTML_BYTES) return audit
    return {
      ...audit,
      reachable: true,
      responsive: /<meta[^>]+name=["']viewport["']/i.test(html),
      tech: {
        cms: detectCms(html),
        jqueryVersion: html.match(/jquery(?:\.min)?\.js[^\d]*(\d+\.\d+(?:\.\d+)?)/i)?.[1] ?? null,
      },
      copyrightYear: detectCopyrightYear(html),
      features: detectFeatures(html),
    }
  } catch {
    return audit
  }
}
