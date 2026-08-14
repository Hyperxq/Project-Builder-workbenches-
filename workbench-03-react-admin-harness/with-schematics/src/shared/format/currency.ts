/**
 * Currency formatting — shared value formatter (USD).
 *
 * Two entities in this batch render money (Invoice `total`, Payment
 * `amount`) and the formatting is textually identical between them, so it
 * lives here rather than being duplicated per feature: the single place
 * money is formatted, so client-side money rendering can never disagree
 * between modules.
 */

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatUsd(amount: number): string {
  return usdFormatter.format(amount)
}
