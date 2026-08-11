import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * E2E — full CRUD cycle through the real app in mock mode, plus the
 * [T2] quirks: the async book combobox (RELATION), star ratings,
 * and the URL-driven "Verified only" toggle.
 */

test('lists reviews with pagination and star ratings', async ({ page }) => {
  await page.goto('/reviews')

  await expect(page.getByRole('heading', { name: 'Reviews' })).toBeVisible()
  await expect(page.getByText('24 reviews')).toBeVisible()
  await expect(page.getByRole('link', { name: '978-0-06-088328-7' })).toBeVisible()
  await expect(page.getByLabel('5 of 5').first()).toBeVisible()

  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('link', { name: '978-0-571-28389-1' })).toBeVisible()
  await expect(page.getByText('Page 2 of 3')).toBeVisible()
})

test('searches reviews', async ({ page }) => {
  await page.goto('/reviews')
  await expect(page.getByText('24 reviews')).toBeVisible()

  await page.getByRole('searchbox', { name: 'Search reviews' }).fill('devastating')
  await expect(page.getByText('1 reviews')).toBeVisible()
  await expect(page.getByRole('link', { name: '978-1-4000-3341-6' })).toBeVisible()
})

test('filters to verified only via the URL-driven toggle', async ({ page }) => {
  await page.goto('/reviews')
  await expect(page.getByText('24 reviews')).toBeVisible()

  await page.getByRole('switch', { name: 'Verified only' }).click()

  await expect(page).toHaveURL(/verified=true/)
  await expect(page.getByText('9 reviews')).toBeVisible()
})

test('creates a review by selecting a book from the combobox', async ({ page }) => {
  await page.goto('/reviews')
  await page.getByRole('link', { name: 'New review' }).click()

  await page.getByLabel('Review ID').fill('30')
  await page.getByLabel('Book').fill('Kafka on the Shore')
  await page.getByRole('option', { name: /Kafka on the Shore/ }).click()
  await page.getByLabel('Rating (1–5)').fill('5')
  await page.getByLabel('Reviewed on').fill('2024-06-01')
  await page.getByRole('button', { name: 'Create review' }).click()

  await expect(page).toHaveURL(/\/reviews(\?|$)/)
  await expect(page.getByText('Review #30 created')).toBeVisible()
  await expect(page.getByText('25 reviews')).toBeVisible()
})

test('rejects a free-typed isbn that does not reference a real book', async ({ page }) => {
  await page.goto('/reviews/new')

  await page.getByLabel('Review ID').fill('31')
  await page.getByLabel('Book').fill('000-0-00-000000-0')
  await page.getByLabel('Rating (1–5)').fill('3')
  await page.getByLabel('Reviewed on').fill('2024-06-01')
  await page.getByRole('button', { name: 'Create review' }).click()

  await expect(page.getByText('No book found for this ISBN')).toBeVisible()
  await expect(page).toHaveURL(/\/reviews\/new$/)
})

test('shows the detail page and edits the review', async ({ page }) => {
  await page.goto('/reviews')
  await page.getByRole('link', { name: '978-0-06-088328-7' }).click()

  await expect(page.getByRole('heading', { name: 'Review #1' })).toBeVisible()
  await expect(page.getByText('One Hundred Years of Solitude (978-0-06-088328-7)')).toBeVisible()

  await page.getByRole('link', { name: 'Edit' }).click()
  await page.getByLabel('Rating (1–5)').fill('3')
  await page.getByRole('button', { name: 'Save changes' }).click()

  await expect(page.getByText('Review #1 updated')).toBeVisible()
  await expect(page.getByLabel('3 of 5')).toBeVisible()
})

test('deletes a review with confirmation', async ({ page }) => {
  await page.goto('/reviews')

  await page.getByRole('button', { name: 'Actions for review 1', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.getByRole('button', { name: 'Delete' }).click()

  await expect(page.getByText('Review #1 deleted')).toBeVisible()
  await expect(page.getByText('23 reviews')).toBeVisible()
})

test('list and form pages have no serious accessibility violations', async ({ page }) => {
  await page.goto('/reviews')
  await expect(page.getByText('24 reviews')).toBeVisible()
  const listScan = await new AxeBuilder({ page }).analyze()
  expect(
    listScan.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([])

  await page.goto('/reviews/new')
  await expect(page.getByRole('heading', { name: 'New review' })).toBeVisible()
  const formScan = await new AxeBuilder({ page }).analyze()
  expect(
    formScan.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([])
})
