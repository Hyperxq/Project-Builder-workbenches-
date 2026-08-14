/**
 * Date helpers shared by the app, the mocks and the tests.
 *
 * Dates are stored and transported as `YYYY-MM-DD` strings (the idiom locked
 * in batch 1), so "today" is a string too and comparisons are plain string
 * comparisons — lexicographic order matches chronological order for that
 * format.
 *
 * UTC is deliberate: the client (derived status badges, create-time
 * validation) and the mock backend (list filters, POST validation) must agree
 * on the same day boundary, and UTC is the only reference both sides share.
 */

/** Today as `YYYY-MM-DD` (UTC). */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Today shifted by `days` as `YYYY-MM-DD` (UTC); negative shifts into the past.
 *
 * Fixtures and tests that depend on "expired" vs "still valid" use this
 * instead of literal dates, so they keep meaning the same thing as the
 * calendar advances.
 */
export function isoDateOffset(days: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
