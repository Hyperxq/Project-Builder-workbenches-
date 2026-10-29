import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderApp } from '@/test/render-app'

describe('T10: copy email', () => {
  it('copies the email and confirms with a toast', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    await renderApp('/authors/1')

    await user.click(await screen.findByRole('button', { name: 'Copy email' }))

    expect(writeText).toHaveBeenCalledWith('gabo@macondo.co')
    expect(await screen.findByText('Email copied')).toBeInTheDocument()
  })
})
