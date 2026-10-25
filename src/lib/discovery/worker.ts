import {
  DiscoveryError,
  type BusinessSource,
  type DiscoveryRepository,
} from "./model"

export function retryDelay(
  attempt: number,
  maxAttempts: number,
  retryable: boolean,
): number | null {
  if (!retryable || attempt >= maxAttempts) return null
  return Math.min(2 ** attempt * 60, 30 * 60)
}

export async function processDiscoveryJob(
  dependencies: { repository: DiscoveryRepository; source: BusinessSource },
  searchId?: string,
): Promise<"idle" | "done" | "retry" | "failed"> {
  const { repository, source } = dependencies
  const job = await repository.claim(searchId)
  if (!job) return "idle"

  try {
    const search = await repository.getSearch(job.searchId)
    if (
      !Number.isInteger(job.start) ||
      job.start < 1 ||
      job.start > search.maxResults
    ) {
      throw new DiscoveryError("El rango de la búsqueda no es válido.", false)
    }
    const end = Math.min(job.start + 49, search.maxResults)
    const businesses = await source.discover(search, job.start, end)
    const nextStart =
      businesses.length === end - job.start + 1 && end < search.maxResults
        ? end + 1
        : null
    await repository.complete(job, businesses, nextStart)
    return "done"
  } catch (error) {
    // Never persist raw SDK/fetch errors: DENUE puts its token in the URL.
    const known = error instanceof DiscoveryError
    const message = known
      ? error.message
      : "No se pudo procesar este lote. Inténtalo de nuevo."
    const retryInSeconds = retryDelay(
      job.attempt,
      job.maxAttempts,
      known ? error.retryable : true,
    )
    await repository.fail(job, { message, retryInSeconds })
    return retryInSeconds === null ? "failed" : "retry"
  }
}
