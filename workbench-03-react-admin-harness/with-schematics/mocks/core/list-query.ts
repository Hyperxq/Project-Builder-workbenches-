import type { Paginated } from '@/shared/api/pagination'

/**
 * Shared LIST-handler sub-shape.
 *
 * Every mock domain's LIST handler does the same two things before it
 * touches anything entity-specific: parse `page`/`pageSize`/`q` off the
 * query string, then slice the (possibly filtered) collection into a
 * `Paginated<T>` page. This is that one byte-identical sub-shape,
 * lifted out so the 11 remaining entities don't copy-paste it again.
 *
 * Entity-specific filters (`?verified`, `?status`, …) are read by the
 * domain on top of `parseListQuery` — never inside it, since they
 * differ per entity and must be applied (by the domain) before
 * `paginate` so `total` reflects the filtered set.
 */

export function parseListQuery(url: URL): { page: number; pageSize: number; q: string } {
  return {
    page: Math.max(1, Number(url.searchParams.get('page') ?? '1')),
    pageSize: Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') ?? '10'))),
    q: (url.searchParams.get('q') ?? '').trim().toLowerCase(),
  }
}

export function paginate<T>(items: T[], page: number, pageSize: number): Paginated<T> {
  const start = (page - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  }
}
