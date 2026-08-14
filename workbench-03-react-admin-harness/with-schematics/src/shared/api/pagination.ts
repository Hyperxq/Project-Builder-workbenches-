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
  /**
   * Entity-specific list filters applied by the list endpoint
   * (e.g. `?verified=true`). Undefined and empty-string values are omitted.
   */
  filters?: Record<string, string | number | boolean | undefined>
}

/** Serialise list params into a query string ("" when all defaults). */
export function toQueryString(params: ListParams): string {
  const search = new URLSearchParams()
  if (params.page && params.page > 1) search.set('page', String(params.page))
  if (params.pageSize) search.set('pageSize', String(params.pageSize))
  if (params.q?.trim()) search.set('q', params.q.trim())
  for (const [key, value] of Object.entries(params.filters ?? {})) {
    if (value === undefined || value === '') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}
