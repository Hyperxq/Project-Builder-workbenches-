import { api } from '@/shared/api/client'
import { toQueryString } from '@/shared/api/pagination'
import type { ListParams, Paginated } from '@/shared/api/pagination'
import type { Author, AuthorUpsert } from '../domain/author'

/**
 * Infrastructure layer — the ONLY place that knows the REST wire
 * contract for authors. Application hooks depend on this object,
 * never on fetch/URLs directly.
 */
export const authorsApi = {
  list: (params: ListParams = {}) => api<Paginated<Author>>(`/authors${toQueryString(params)}`),

  get: (authorId: number) => api<Author>(`/authors/${authorId}`),

  create: (payload: AuthorUpsert) =>
    api<Author>('/authors', { method: 'POST', body: JSON.stringify(payload) }),

  update: (authorId: number, payload: Partial<AuthorUpsert>) =>
    api<Author>(`/authors/${authorId}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  remove: (authorId: number) => api<void>(`/authors/${authorId}`, { method: 'DELETE' }),
}
