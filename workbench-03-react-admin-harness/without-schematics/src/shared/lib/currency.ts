/**
 * Money formatting shared by the app and the tests.
 *
 * Entities store money as a plain `number` (Invoice's `total`, Payment's
 * `amount`); currency is a PRESENTATION concern, so the mocks never format
 * and no feature reaches for `toFixed` locally. One formatter, built once,
 * keeps list cells and detail pages byte-identical — which is exactly what
 * the section and e2e specs assert.
 *
 * `en-US`/USD with a fixed two decimals: 1250.5 -> "$1,250.50", 99.99 -> "$99.99".
 */

const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** USD with exactly two decimals, e.g. `1250.5` -> `"$1,250.50"`. */
export function formatUsd(amount: number): string {
  return USD.format(amount)
}
