import { describe, expect, it } from 'vitest'
import type { Author } from '@/features/authors/domain/author'
import type { Paginated } from '@/shared/api/pagination'
import { TEST_BASE_URL } from '../setup-test-mocking'

/**
 * MOCK-INFRASTRUCTURE TIER — exercises the handlers themselves,
 * not the UI. If these fail, every feature test above them is
 * unreliable, so they stay small and behavioural: status codes,
 * pagination math, validation, uniqueness.
 */

const url = (path: string) => `${TEST_BASE_URL}${path}`

async function listAuthors(query = ''): Promise<Paginated<Author>> {
  const response = await fetch(url(`/authors${query}`))
  expect(response.status).toBe(200)
  return response.json()
}

describe('authors mock domain', () => {
  it('lists the first page with default page size 10', async () => {
    const body = await listAuthors()
    expect(body.items).toHaveLength(10)
    expect(body.total).toBe(24)
    expect(body.page).toBe(1)
    expect(body.items[0].authorId).toBe(1)
  })

  it('paginates: page 3 holds the remaining 4 rows', async () => {
    const body = await listAuthors('?page=3')
    expect(body.items).toHaveLength(4)
    expect(body.items[0].authorId).toBe(21)
  })

  it('filters by q across fullName, email and country', async () => {
    const byName = await listAuthors('?q=borges')
    expect(byName.total).toBe(1)
    expect(byName.items[0].fullName).toBe('Jorge Luis Borges')

    const byCountry = await listAuthors('?q=argentina')
    expect(byCountry.total).toBe(3)
  })

  it('gets one author by authorId and 404s on unknown ids', async () => {
    const found = await fetch(url('/authors/5'))
    expect(found.status).toBe(200)
    expect(((await found.json()) as Author).fullName).toBe('Haruki Murakami')

    const missing = await fetch(url('/authors/999'))
    expect(missing.status).toBe(404)
  })

  it('creates an author, defaulting active to true', async () => {
    const response = await fetch(url('/authors'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ authorId: 25, fullName: 'Samanta Schweblin', email: 'samanta@fever.ar' }),
    })
    expect(response.status).toBe(201)
    const created = (await response.json()) as Author
    expect(created.active).toBe(true)

    const body = await listAuthors()
    expect(body.total).toBe(25)
  })

  it('rejects invalid payloads with 400 and duplicates with 409', async () => {
    const invalid = await fetch(url('/authors'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fullName: '', email: 'not-an-email' }),
    })
    expect(invalid.status).toBe(400)

    const duplicateId = await fetch(url('/authors'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ authorId: 1, fullName: 'Clone', email: 'clone@x.io' }),
    })
    expect(duplicateId.status).toBe(409)

    const duplicateEmail = await fetch(url('/authors'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ authorId: 26, fullName: 'Clone', email: 'gabo@macondo.co' }),
    })
    expect(duplicateEmail.status).toBe(409)
  })

  it('patches only the provided fields', async () => {
    const response = await fetch(url('/authors/2'), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ active: true }),
    })
    expect(response.status).toBe(200)
    const updated = (await response.json()) as Author
    expect(updated.active).toBe(true)
    expect(updated.fullName).toBe('Ursula K. Le Guin')
  })

  it('deletes an author and then 404s on lookup', async () => {
    const removed = await fetch(url('/authors/24'), { method: 'DELETE' })
    expect(removed.status).toBe(204)

    const lookup = await fetch(url('/authors/24'))
    expect(lookup.status).toBe(404)
  })

  it('reseeds state between tests (create from earlier test is gone)', async () => {
    const body = await listAuthors()
    expect(body.total).toBe(24)
  })
})
