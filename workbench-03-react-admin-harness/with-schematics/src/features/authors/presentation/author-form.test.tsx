import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/render-app'

describe('author create form', () => {
  it('shows validation errors on empty submit and does not navigate', async () => {
    const user = userEvent.setup()
    const { router } = await renderApp('/authors/new')

    await user.click(await screen.findByRole('button', { name: 'Create author' }))

    const alerts = await screen.findAllByRole('alert')
    expect(alerts.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Full name is required')).toBeInTheDocument()
    expect(screen.getByText('Must be a valid email')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/authors/new')
  })

  it('creates an author and returns to the list', async () => {
    const user = userEvent.setup()
    const { router } = await renderApp('/authors/new')

    await user.type(await screen.findByLabelText('Author ID'), '25')
    await user.type(screen.getByLabelText('Full name'), 'Samanta Schweblin')
    await user.type(screen.getByLabelText('Email'), 'samanta@fever.ar')
    await user.click(screen.getByRole('button', { name: 'Create author' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/authors'))
    expect(await screen.findByText('25 authors')).toBeInTheDocument()
  })

  it('surfaces the server conflict when the email is taken', async () => {
    const user = userEvent.setup()
    const { router } = await renderApp('/authors/new')

    await user.type(await screen.findByLabelText('Author ID'), '25')
    await user.type(screen.getByLabelText('Full name'), 'Impostor')
    await user.type(screen.getByLabelText('Email'), 'gabo@macondo.co')
    await user.click(screen.getByRole('button', { name: 'Create author' }))

    expect(await screen.findByText('email gabo@macondo.co already exists')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/authors/new')
  })
})
