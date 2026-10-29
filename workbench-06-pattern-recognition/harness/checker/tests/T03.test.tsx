import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TEST_BASE_URL } from '@mocks/setup-test-mocking'
import { renderApp } from '@/test/render-app'

const authorsCard = async () =>
  within(await screen.findByRole('region', { name: 'Entities' })).getByRole('link', { name: /Authors/ })

describe('T03: authors card count', () => {
  it('shows the total from the list endpoint', async () => {
    await renderApp('/')
    const card = await authorsCard()
    expect(await within(card).findByText('24 authors')).toBeInTheDocument()
  })

  it('follows creates', async () => {
    await fetch(`${TEST_BASE_URL}/authors`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ authorId: 90, fullName: 'New', email: 'new@example.com' }),
    })
    await renderApp('/')
    expect(await within(await authorsCard()).findByText('25 authors')).toBeInTheDocument()
  })
})
