/** Wire shape every list endpoint returns. */
export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export type ListParams = {
  page?: number
  pageSize?: number
  q?: string
}

/**
 * List params plus any entity-specific filter a module drives from the URL
 * (`?verified=true`, and later `?status=`, `?method=`, `?from=`…). Extras are
 * serialised verbatim, so the list ENDPOINT — never the client — decides what
 * they mean.
 */
export type QueryParams = ListParams & Record<string, string | number | boolean | undefined>

/** Serialise list params into a query string ("" when all defaults). */
export function toQueryString(params: QueryParams): string {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue

    if (key === 'page') {
      if (Number(value) > 1) search.set('page', String(value))
      continue
    }
    if (key === 'q') {
      const trimmed = String(value).trim()
      if (trimmed) search.set('q', trimmed)
      continue
    }

    search.set(key, String(value))
  }

  const qs = search.toString()
  return qs ? `?${qs}` : ''
}
