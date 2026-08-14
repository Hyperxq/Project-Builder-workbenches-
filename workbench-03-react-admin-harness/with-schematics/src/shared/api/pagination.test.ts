import { describe, expect, it } from 'vitest'
import { toQueryString } from './pagination'

describe('toQueryString', () => {
  it('returns "" when all defaults', () => {
    expect(toQueryString({})).toBe('')
  })

  it('omits page 1', () => {
    expect(toQueryString({ page: 1 })).toBe('')
  })

  it('emits page 2', () => {
    expect(toQueryString({ page: 2 })).toBe('?page=2')
  })

  it('emits pageSize', () => {
    expect(toQueryString({ pageSize: 20 })).toBe('?pageSize=20')
  })

  it('trims q', () => {
    expect(toQueryString({ q: '  gabo  ' })).toBe('?q=gabo')
  })

  it('appends filters with boolean, number and string values', () => {
    expect(
      toQueryString({ filters: { verified: true, rating: 5, status: 'active' } }),
    ).toBe('?verified=true&rating=5&status=active')
  })

  it('skips undefined and empty-string filter values', () => {
    expect(toQueryString({ filters: { verified: undefined, q: '' } })).toBe('')
  })

  it('orders page, pageSize, q first, then filters', () => {
    expect(
      toQueryString({
        page: 2,
        pageSize: 20,
        q: 'gabo',
        filters: { verified: true },
      }),
    ).toBe('?page=2&pageSize=20&q=gabo&verified=true')
  })
})
