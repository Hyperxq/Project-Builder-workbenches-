import { describe, expect, it } from 'vitest'
import { isoDateSchema, optionalIsoDateSchema } from './iso-date'

describe('isoDateSchema', () => {
  it('parses a valid YYYY-MM-DD date', () => {
    expect(isoDateSchema.parse('2024-05-01')).toBe('2024-05-01')
  })

  it('rejects a non-padded date', () => {
    const result = isoDateSchema.safeParse('2024-5-1')
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Use the YYYY-MM-DD format')
  })

  it('rejects a differently ordered date', () => {
    const result = isoDateSchema.safeParse('01/05/2024')
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Use the YYYY-MM-DD format')
  })

  it('rejects an empty string', () => {
    const result = isoDateSchema.safeParse('')
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Use the YYYY-MM-DD format')
  })
})

describe('optionalIsoDateSchema', () => {
  it('accepts undefined', () => {
    expect(optionalIsoDateSchema.parse(undefined)).toBeUndefined()
  })
})
