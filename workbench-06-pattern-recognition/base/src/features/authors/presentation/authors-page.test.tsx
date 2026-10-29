import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/render-app'

/**
 * SECTION TIER — drives the real app (routes + providers) against
 * the MSW node server. No component mocking: what the user sees is
 * what gets asserted.
 */

describe('authors list page', () => {
  it('renders the first page of authors from the API', async () => {
    await renderApp('/authors')

    expect(await screen.findByText('Gabriel García Márquez')).toBeInTheDocument()
    expect(screen.getByText('24 authors')).toBeInTheDocument()
    // Page 1 holds exactly 10 rows: rows 1-10.
    expect(screen.getByText('Toni Morrison')).toBeInTheDocument()
    expect(screen.queryByText('Kazuo Ishiguro')).not.toBeInTheDocument()
  })

  it('filters the list from the search box', async () => {
    const user = userEvent.setup()
    await renderApp('/authors')
    await screen.findByText('Gabriel García Márquez')

    await user.type(screen.getByRole('searchbox', { name: 'Search authors' }), 'borges')

    expect(await screen.findByText('Jorge Luis Borges')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByText('Gabriel García Márquez')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('1 authors')).toBeInTheDocument()
  })

  it('walks to the next page', async () => {
    const user = userEvent.setup()
    await renderApp('/authors')
    await screen.findByText('Gabriel García Márquez')

    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByText('Kazuo Ishiguro')).toBeInTheDocument()
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
  })

  it('deletes an author through the row menu with confirmation', async () => {
    const user = userEvent.setup()
    await renderApp('/authors')
    await screen.findByText('Gabriel García Márquez')

    await user.click(screen.getByRole('button', { name: 'Actions for Gabriel García Márquez' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    await waitFor(() =>
      expect(screen.queryByText('Gabriel García Márquez')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('23 authors')).toBeInTheDocument()
  })
})
