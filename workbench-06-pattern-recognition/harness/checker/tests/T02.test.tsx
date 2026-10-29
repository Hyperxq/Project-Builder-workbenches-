import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/render-app'

describe('T02: Help page', () => {
  it('renders the heading and the paragraph at /help', async () => {
    await renderApp('/help')
    expect(await screen.findByRole('heading', { level: 1, name: 'Help' })).toBeInTheDocument()
    expect(screen.getByText('Questions about the admin? Write to support@example.com.')).toBeInTheDocument()
  })

  it('has a sidebar entry after Authors', async () => {
    await renderApp('/')
    const nav = await screen.findByRole('navigation', { name: 'Main' })
    const links = within(nav).getAllByRole('link')
    const entry = within(nav).getByRole('link', { name: 'Help' })
    expect(entry).toHaveAttribute('href', '/help')
    expect(entry.querySelector('svg')).not.toBeNull()
    expect(links.indexOf(entry)).toBeGreaterThan(links.findIndex((l) => l.textContent === 'Authors'))
  })
})
