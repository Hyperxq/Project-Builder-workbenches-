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

/** Serialise list params into a query string ("" when all defaults). */
export function toQueryString(params: ListParams): string {
  const search = new URLSearchParams()
  if (params.page && params.page > 1) search.set('page', String(params.page))
  if (params.pageSize) search.set('pageSize', String(params.pageSize))
  if (params.q?.trim()) search.set('q', params.q.trim())
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}
