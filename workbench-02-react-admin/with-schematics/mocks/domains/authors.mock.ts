import { HttpResponse, http, passthrough } from 'msw'
import type { HttpHandler } from 'msw'
import type { Author, AuthorUpsert } from '@/features/authors/domain/author'
import type { Paginated } from '@/shared/api/pagination'
import { badRequest, conflict, notFound } from '../core/errors'
import { shouldMock, type MockConfig } from '../core/mock.config'
import { joinUrl } from '../core/url'
import { AUTHORS_FIXTURE } from '../fixtures/authors.fixture'

/**
 * AUTHORS DOMAIN — the reference factory.
 *
 * Every mock domain is exported as a *function* that takes the
 * shared `MockConfig` and the base URL, and returns an array of
 * MSW `HttpHandler`s. Two benefits fall out of that shape:
 *
 *   1. Testing is trivial — `mocks/setup-test-mocking.ts` builds
 *      its own config and plugs it in, no env reads at import time.
 *   2. Hybrid mode works at handler granularity: a handler whose
 *      key is in `config.omittedKeys` returns `passthrough()`, so
 *      only THAT handler lets the request escape to the real API.
 *
 * Handlers only carry PATHS. The base URL is joined at composition
 * time via `joinUrl`, which keeps the domain file independent from
 * whatever env the app is running under.
 *
 * State is an in-memory Map seeded from the fixture. It survives
 * for the browser session; tests call `resetAuthors()` between
 * cases to get a pristine collection.
 */

let authors = new Map<number, Author>()
resetAuthors()

export function resetAuthors(): void {
  authors = new Map(AUTHORS_FIXTURE.map((a) => [a.authorId, { ...a }]))
}

function parsePage(url: URL): { page: number; pageSize: number; q: string } {
  return {
    page: Math.max(1, Number(url.searchParams.get('page') ?? '1')),
    pageSize: Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') ?? '10'))),
    q: (url.searchParams.get('q') ?? '').trim().toLowerCase(),
  }
}

function validateUpsert(body: Partial<AuthorUpsert>): string | null {
  if (typeof body.authorId !== 'number' || !Number.isInteger(body.authorId)) {
    return 'authorId is required and must be an integer'
  }
  if (!body.fullName?.trim()) return 'fullName is required'
  if (!body.email?.trim() || !body.email.includes('@')) return 'email is required and must be valid'
  return null
}

function emailTaken(email: string, exceptId?: number): boolean {
  return [...authors.values()].some(
    (a) => a.email.toLowerCase() === email.toLowerCase() && a.authorId !== exceptId,
  )
}

export function authorHandlers(config: MockConfig, base: string): HttpHandler[] {
  return [
    http.get(joinUrl(base, '/authors'), ({ request }) => {
      if (!shouldMock(config, 'LIST_AUTHORS')) return passthrough()

      const { page, pageSize, q } = parsePage(new URL(request.url))
      const all = [...authors.values()].sort((a, b) => a.authorId - b.authorId)
      const filtered = q
        ? all.filter(
            (a) =>
              a.fullName.toLowerCase().includes(q) ||
              a.email.toLowerCase().includes(q) ||
              (a.country ?? '').toLowerCase().includes(q),
          )
        : all

      const start = (page - 1) * pageSize
      const body: Paginated<Author> = {
        items: filtered.slice(start, start + pageSize),
        total: filtered.length,
        page,
        pageSize,
      }
      return HttpResponse.json(body)
    }),

    http.get(joinUrl(base, '/authors/:authorId'), ({ params }) => {
      if (!shouldMock(config, 'GET_AUTHOR')) return passthrough()

      const author = authors.get(Number(params.authorId))
      if (!author) return notFound(`Author ${String(params.authorId)} not found`)
      return HttpResponse.json(author)
    }),

    http.post(joinUrl(base, '/authors'), async ({ request }) => {
      if (!shouldMock(config, 'CREATE_AUTHOR')) return passthrough()

      const body = (await request.json()) as Partial<AuthorUpsert>
      const error = validateUpsert(body)
      if (error) return badRequest(error)
      if (authors.has(body.authorId!)) return conflict(`authorId ${body.authorId} already exists`)
      if (emailTaken(body.email!)) return conflict(`email ${body.email} already exists`)

      const author: Author = {
        authorId: body.authorId!,
        fullName: body.fullName!.trim(),
        email: body.email!.trim(),
        country: body.country?.trim() || undefined,
        active: body.active ?? true,
      }
      authors.set(author.authorId, author)
      return HttpResponse.json(author, { status: 201 })
    }),

    http.patch(joinUrl(base, '/authors/:authorId'), async ({ params, request }) => {
      if (!shouldMock(config, 'UPDATE_AUTHOR')) return passthrough()

      const id = Number(params.authorId)
      const existing = authors.get(id)
      if (!existing) return notFound(`Author ${String(params.authorId)} not found`)

      const body = (await request.json()) as Partial<AuthorUpsert>
      const merged: AuthorUpsert = { ...existing, ...body, authorId: id }
      const error = validateUpsert(merged)
      if (error) return badRequest(error)
      if (emailTaken(merged.email, id)) return conflict(`email ${merged.email} already exists`)

      const author: Author = {
        authorId: id,
        fullName: merged.fullName.trim(),
        email: merged.email.trim(),
        country: merged.country?.trim() || undefined,
        active: merged.active ?? existing.active,
      }
      authors.set(id, author)
      return HttpResponse.json(author)
    }),

    http.delete(joinUrl(base, '/authors/:authorId'), ({ params }) => {
      if (!shouldMock(config, 'DELETE_AUTHOR')) return passthrough()

      const id = Number(params.authorId)
      if (!authors.has(id)) return notFound(`Author ${String(params.authorId)} not found`)
      authors.delete(id)
      return new HttpResponse(null, { status: 204 })
    }),
  ]
}
