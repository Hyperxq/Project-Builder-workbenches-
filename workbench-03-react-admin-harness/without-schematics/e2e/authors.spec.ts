import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * E2E — full CRUD cycle through the real app in mock mode.
 * MSW state is per page load, so each test starts from the
 * pristine 24-author fixture.
 */

test('lists authors with pagination', async ({ page }) => {
  await page.goto('/authors')

  await expect(page.getByRole('heading', { name: 'Authors' })).toBeVisible()
  await expect(page.getByText('24 authors')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Gabriel García Márquez' })).toBeVisible()

  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('link', { name: 'Kazuo Ishiguro' })).toBeVisible()
  await expect(page.getByText('Page 2 of 3')).toBeVisible()
})

test('searches authors', async ({ page }) => {
  await page.goto('/authors')
  await expect(page.getByText('24 authors')).toBeVisible()

  await page.getByRole('searchbox', { name: 'Search authors' }).fill('argentina')
  await expect(page.getByText('3 authors')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Julio Cortázar' })).toBeVisible()
})

test('creates an author end to end', async ({ page }) => {
  await page.goto('/authors')
  await page.getByRole('link', { name: 'New author' }).click()

  await page.getByLabel('Author ID').fill('30')
  await page.getByLabel('Full name').fill('Valeria Luiselli')
  await page.getByLabel('Email').fill('valeria@archive.mx')
  await page.getByLabel('Country', { exact: false }).fill('Mexico')
  await page.getByRole('button', { name: 'Create author' }).click()

  await expect(page).toHaveURL(/\/authors(\?|$)/)
  await expect(page.getByText('Author "Valeria Luiselli" created')).toBeVisible()
  await expect(page.getByText('25 authors')).toBeVisible()
})

test('shows the detail page and edits the author', async ({ page }) => {
  await page.goto('/authors')
  await page.getByRole('link', { name: 'Haruki Murakami' }).click()

  await expect(page.getByRole('heading', { name: 'Haruki Murakami' })).toBeVisible()
  await expect(page.getByText('haruki@kafka.jp')).toBeVisible()

  await page.getByRole('link', { name: 'Edit' }).click()
  await page.getByLabel('Country', { exact: false }).fill('日本')
  await page.getByRole('button', { name: 'Save changes' }).click()

  await expect(page.getByText('Author "Haruki Murakami" updated')).toBeVisible()
  await expect(page.getByText('日本')).toBeVisible()
})

test('deletes an author with confirmation', async ({ page }) => {
  await page.goto('/authors')

  await page.getByRole('button', { name: 'Actions for Octavia E. Butler' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.getByRole('button', { name: 'Delete' }).click()

  await expect(page.getByText('Author "Octavia E. Butler" deleted')).toBeVisible()
  await expect(page.getByText('23 authors')).toBeVisible()
})

test('rejects duplicate emails with a visible server error', async ({ page }) => {
  await page.goto('/authors/new')

  await page.getByLabel('Author ID').fill('31')
  await page.getByLabel('Full name').fill('Impostor')
  await page.getByLabel('Email').fill('gabo@macondo.co')
  await page.getByRole('button', { name: 'Create author' }).click()

  await expect(page.getByText('email gabo@macondo.co already exists')).toBeVisible()
  await expect(page).toHaveURL(/\/authors\/new$/)
})

test('list and form pages have no serious accessibility violations', async ({ page }) => {
  await page.goto('/authors')
  await expect(page.getByText('24 authors')).toBeVisible()
  const listScan = await new AxeBuilder({ page }).analyze()
  expect(
    listScan.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([])

  await page.goto('/authors/new')
  await expect(page.getByRole('heading', { name: 'New author' })).toBeVisible()
  const formScan = await new AxeBuilder({ page }).analyze()
  expect(
    formScan.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([])
})
