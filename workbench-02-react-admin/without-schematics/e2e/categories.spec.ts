import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * E2E — full CRUD cycle through the real app in mock mode.
 * MSW state is per page load, so each test starts from the
 * pristine 24-category fixture.
 */

test('lists categories with pagination', async ({ page }) => {
  await page.goto('/categories')

  await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible()
  await expect(page.getByText('24 categories')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Art' })).toBeVisible()

  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('link', { name: 'Historical Fiction' })).toBeVisible()
  await expect(page.getByText('Page 2 of 3')).toBeVisible()
})

test('searches categories', async ({ page }) => {
  await page.goto('/categories')
  await expect(page.getByText('24 categories')).toBeVisible()

  await page.getByRole('searchbox', { name: 'Search categories' }).fill('horror')
  await expect(page.getByText('1 categories')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Horror' })).toBeVisible()
})

test('creates a category end to end', async ({ page }) => {
  await page.goto('/categories')
  await page.getByRole('link', { name: 'New category' }).click()

  await page.getByLabel('Code').fill('NEW')
  await page.getByLabel('Name').fill('New Category')
  await page.getByRole('button', { name: 'Create category' }).click()

  await expect(page).toHaveURL(/\/categories(\?|$)/)
  await expect(page.getByText('Category "New Category" created')).toBeVisible()
  await expect(page.getByText('25 categories')).toBeVisible()
})

test('shows the detail page and edits the category', async ({ page }) => {
  await page.goto('/categories')
  await page.getByRole('searchbox', { name: 'Search categories' }).fill('Mystery')
  await page.getByRole('link', { name: 'Mystery' }).click()

  await expect(page.getByRole('heading', { name: 'Mystery' })).toBeVisible()

  await page.getByRole('link', { name: 'Edit' }).click()
  await page.getByLabel('Description', { exact: false }).fill('Whodunits, updated')
  await page.getByRole('button', { name: 'Save changes' }).click()

  await expect(page.getByText('Category "Mystery" updated')).toBeVisible()
  await expect(page.getByText('Whodunits, updated')).toBeVisible()
})

test('deletes a category with confirmation', async ({ page }) => {
  await page.goto('/categories')
  await page.getByRole('searchbox', { name: 'Search categories' }).fill('Romance')

  await page.getByRole('button', { name: 'Actions for Romance' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.getByRole('button', { name: 'Delete' }).click()

  await expect(page.getByText('Category "Romance" deleted')).toBeVisible()
  await expect(page.getByText('23 categories')).toBeVisible()
})

test('rejects duplicate codes with a visible server error', async ({ page }) => {
  await page.goto('/categories/new')

  await page.getByLabel('Code').fill('FIC')
  await page.getByLabel('Name').fill('Impostor')
  await page.getByRole('button', { name: 'Create category' }).click()

  await expect(page.getByText('code FIC already exists')).toBeVisible()
  await expect(page).toHaveURL(/\/categories\/new$/)
})

test('list and form pages have no serious accessibility violations', async ({ page }) => {
  await page.goto('/categories')
  await expect(page.getByText('24 categories')).toBeVisible()
  const listScan = await new AxeBuilder({ page }).analyze()
  expect(
    listScan.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([])

  await page.goto('/categories/new')
  await expect(page.getByRole('heading', { name: 'New category' })).toBeVisible()
  const formScan = await new AxeBuilder({ page }).analyze()
  expect(
    formScan.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([])
})
