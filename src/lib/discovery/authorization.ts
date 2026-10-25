import { timingSafeEqual } from "node:crypto"

export function isWorkerAuthorized(
  header: string | null,
  secret: string | undefined,
): boolean {
  if (!secret || secret.length < 16 || !header) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const actual = Buffer.from(header)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
