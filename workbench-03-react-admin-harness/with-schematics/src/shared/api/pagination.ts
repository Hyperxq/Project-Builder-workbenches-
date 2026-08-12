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

const BASE_LIST_KEYS = ['page', 'pageSize', 'q']

/**
 * Serialise list params into a query string ("" when all defaults).
 *
 * `page`/`pageSize`/`q` are the contract every list endpoint shares.
 * Entities that add their own URL-driven filters (Review's `verified`,
 * Coupon's `status`, …) declare a params TYPE ALIAS extending
 * `ListParams` and pass it straight through: any extra defined,
 * non-empty scalar is appended here, so query-string building stays in
 * this one place.
 */
export function toQueryString(params: ListParams): string {
  const search = new URLSearchParams()
  if (params.page && params.page > 1) search.set('page', String(params.page))
  if (params.pageSize) search.set('pageSize', String(params.pageSize))
  if (params.q?.trim()) search.set('q', params.q.trim())

  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (BASE_LIST_KEYS.includes(key)) continue
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }

  const qs = search.toString()
  return qs ? `?${qs}` : ''
}
