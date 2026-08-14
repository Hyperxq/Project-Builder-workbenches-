import { z } from 'zod'

/**
 * ISO date — shared value type (`YYYY-MM-DD`).
 *
 * Dates are transported and stored as `YYYY-MM-DD` strings, bound directly
 * to `<input type="date">` and rendered verbatim in lists, so the schema is
 * a plain string shape check rather than a parsed `Date`.
 */

export const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format')

export type IsoDate = z.infer<typeof isoDateSchema>

/**
 * Optional variant for entities where the date is not required. Empty
 * inputs map to `undefined` at the form level (`register(..., { setValueAs })`),
 * matching how optional text fields work in
 * `src/features/authors/presentation/author-form.tsx`.
 */
export const optionalIsoDateSchema = isoDateSchema.optional()

/**
 * Today's date as `YYYY-MM-DD`, in UTC.
 *
 * One definition shared by the UI and the mock handlers so client and
 * server can never disagree about "today". Callers that care about the
 * boundary (midnight rollover, timezone edge cases) should pass an
 * explicit date instead of calling this.
 */
export function todayIso(): IsoDate {
  return new Date().toISOString().slice(0, 10)
}
