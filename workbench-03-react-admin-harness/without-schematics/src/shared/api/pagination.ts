/** Wire shape every list endpoint returns. */
export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface ListParams {
  page?: number
  pageSize?: number
  q?: string
}

/**
 * Serialise list params into a query string ("" when all defaults).
 *
 * `extra` carries the per-entity list filters that go beyond the shared
 * page/pageSize/q contract (Review's `verified`, Coupon's `status`, …).
 * Entries that are `undefined` or empty are skipped, so a call site can
 * pass a filter unconditionally and let it fall out of the URL when unset.
 */
export function toQueryString(
  params: ListParams,
  extra: Record<string, string | undefined> = {},
): string {
  const search = new URLSearchParams()
  if (params.page && params.page > 1) search.set('page', String(params.page))
  if (params.pageSize) search.set('pageSize', String(params.pageSize))
  if (params.q?.trim()) search.set('q', params.q.trim())
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined && value !== '') search.set(key, value)
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}
