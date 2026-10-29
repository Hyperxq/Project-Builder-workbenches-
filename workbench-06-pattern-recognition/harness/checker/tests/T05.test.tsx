import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/render-app'

describe('T05: About page', () => {
  it('renders the heading and the paragraph at /about', async () => {
    await renderApp('/about')
    expect(await screen.findByRole('heading', { level: 1, name: 'About' })).toBeInTheDocument()
    expect(screen.getByText('This admin manages the authors of the catalogue.')).toBeInTheDocument()
  })

  it('has a sidebar entry after Authors', async () => {
    await renderApp('/')
    const nav = await screen.findByRole('navigation', { name: 'Main' })
    const links = within(nav).getAllByRole('link')
    const entry = within(nav).getByRole('link', { name: 'About' })
    expect(entry).toHaveAttribute('href', '/about')
    expect(entry.querySelector('svg')).not.toBeNull()
    expect(links.indexOf(entry)).toBeGreaterThan(links.findIndex((l) => l.textContent === 'Authors'))
  })
})
