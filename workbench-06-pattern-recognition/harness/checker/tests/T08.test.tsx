import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/render-app'

describe('T08: Changelog page', () => {
  it('renders the heading and the paragraph at /changelog', async () => {
    await renderApp('/changelog')
    expect(await screen.findByRole('heading', { level: 1, name: 'Changelog' })).toBeInTheDocument()
    expect(screen.getByText('Version 1.4.0 adds author profiles.')).toBeInTheDocument()
  })

  it('has a sidebar entry after Authors', async () => {
    await renderApp('/')
    const nav = await screen.findByRole('navigation', { name: 'Main' })
    const links = within(nav).getAllByRole('link')
    const entry = within(nav).getByRole('link', { name: 'Changelog' })
    expect(entry).toHaveAttribute('href', '/changelog')
    expect(entry.querySelector('svg')).not.toBeNull()
    expect(links.indexOf(entry)).toBeGreaterThan(links.findIndex((l) => l.textContent === 'Authors'))
  })
})
