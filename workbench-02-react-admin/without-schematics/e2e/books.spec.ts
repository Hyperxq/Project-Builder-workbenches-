import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * E2E — full CRUD cycle through the real app in mock mode.
 * MSW state is per page load, so each test starts from the
 * pristine 24-book fixture.
 */

test('lists books with pagination', async ({ page }) => {
  await page.goto('/books')

  await expect(page.getByRole('heading', { name: 'Books' })).toBeVisible()
  await expect(page.getByText('24 books')).toBeVisible()
  await expect(page.getByRole('link', { name: 'One Hundred Years of Solitude' })).toBeVisible()

  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('link', { name: 'The Left Hand of Darkness' })).toBeVisible()
  await expect(page.getByText('Page 2 of 3')).toBeVisible()
})

test('searches books', async ({ page }) => {
  await page.goto('/books')
  await expect(page.getByText('24 books')).toBeVisible()

  await page.getByRole('searchbox', { name: 'Search books' }).fill('vegetarian')
  await expect(page.getByText('1 books')).toBeVisible()
  await expect(page.getByRole('link', { name: 'The Vegetarian' })).toBeVisible()
})

test('creates a book end to end', async ({ page }) => {
  await page.goto('/books')
  await page.getByRole('link', { name: 'New book' }).click()

  await page.getByLabel('ISBN').fill('978-0-00-000000-1')
  await page.getByLabel('Title').fill('A New Book')
  await page.getByLabel('Pages').fill('250')
  await page.getByRole('button', { name: 'Create book' }).click()

  await expect(page).toHaveURL(/\/books(\?|$)/)
  await expect(page.getByText('Book "A New Book" created')).toBeVisible()
  await expect(page.getByText('25 books')).toBeVisible()
})

test('shows the detail page and edits the book', async ({ page }) => {
  await page.goto('/books')
  await page.getByRole('searchbox', { name: 'Search books' }).fill('Kafka on the Shore')
  await page.getByRole('link', { name: 'Kafka on the Shore' }).click()

  await expect(page.getByRole('heading', { name: 'Kafka on the Shore' })).toBeVisible()
  await expect(page.getByText('978-0-679-77543-9')).toBeVisible()

  await page.getByRole('link', { name: 'Edit' }).click()
  await page.getByLabel('Pages').fill('999')
  await page.getByRole('button', { name: 'Save changes' }).click()

  await expect(page.getByText('Book "Kafka on the Shore" updated')).toBeVisible()
  await expect(page.getByText('999')).toBeVisible()
})

test('deletes a book with confirmation', async ({ page }) => {
  await page.goto('/books')
  await page.getByRole('searchbox', { name: 'Search books' }).fill('Ficciones')

  await page.getByRole('button', { name: 'Actions for Ficciones' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.getByRole('button', { name: 'Delete' }).click()

  await expect(page.getByText('Book "Ficciones" deleted')).toBeVisible()
  await expect(page.getByText('23 books')).toBeVisible()
})

test('rejects duplicate isbns with a visible server error', async ({ page }) => {
  await page.goto('/books/new')

  await page.getByLabel('ISBN').fill('978-0-06-088328-7')
  await page.getByLabel('Title').fill('Impostor')
  await page.getByLabel('Pages').fill('100')
  await page.getByRole('button', { name: 'Create book' }).click()

  await expect(page.getByText('isbn 978-0-06-088328-7 already exists')).toBeVisible()
  await expect(page).toHaveURL(/\/books\/new$/)
})

test('list and form pages have no serious accessibility violations', async ({ page }) => {
  await page.goto('/books')
  await expect(page.getByText('24 books')).toBeVisible()
  const listScan = await new AxeBuilder({ page }).analyze()
  expect(
    listScan.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([])

  await page.goto('/books/new')
  await expect(page.getByRole('heading', { name: 'New book' })).toBeVisible()
  const formScan = await new AxeBuilder({ page }).analyze()
  expect(
    formScan.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([])
})
