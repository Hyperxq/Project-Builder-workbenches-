import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TEST_BASE_URL } from '@mocks/setup-test-mocking'
import { renderApp } from '@/test/render-app'

const url = (path: string) => `${TEST_BASE_URL}${path}`
const post = (body: object) =>
  fetch(url('/authors'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
const stored = async (id: number) => (await (await fetch(url(`/authors/${id}`))).json()) as Record<string, unknown>
const input = () => screen.findByLabelText(/^Website/)

describe('T01: optional website', () => {
  it('stores website on create and on update', async () => {
    const created = await post({ authorId: 90, fullName: 'New', email: 'new@example.com', website: '  https://macondo.co  ' })
    expect(created.status).toBe(201)
    expect((await stored(90)).website).toEqual('https://macondo.co')

    await fetch(url('/authors/1'), { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ website: '  https://macondo.co  ' }) })
    expect((await stored(1)).website).toEqual('https://macondo.co')
  })

  it('stores an empty website as not set', async () => {
    const created = await post({ authorId: 92, fullName: 'Empty', email: 'empty@example.com', website: '' })
    expect(created.status).toBe(201)
    expect(await stored(92)).not.toHaveProperty('website')
  })

  it('creates an author with website from the form', async () => {
    const user = userEvent.setup()
    const { router } = await renderApp('/authors/new')

    await user.type(await screen.findByLabelText('Author ID'), '91')
    await user.type(screen.getByLabelText('Full name'), 'Form Author')
    await user.type(screen.getByLabelText('Email'), 'form@example.com')
    await user.type(await input(), 'https://example.com')
    await user.click(screen.getByRole('button', { name: 'Create author' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/authors'))
    expect((await stored(91)).website).toEqual('https://example.com')
  })

  it('creates an author without website when the input is empty', async () => {
    const user = userEvent.setup()
    const { router } = await renderApp('/authors/new')

    await user.type(await screen.findByLabelText('Author ID'), '93')
    await user.type(screen.getByLabelText('Full name'), 'No Value')
    await user.type(screen.getByLabelText('Email'), 'novalue@example.com')
    await user.click(screen.getByRole('button', { name: 'Create author' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/authors'))
    expect(await stored(93)).not.toHaveProperty('website')
  })

  it('rejects an invalid website', async () => {
    const user = userEvent.setup()
    const { router } = await renderApp('/authors/new')

    await user.type(await screen.findByLabelText('Author ID'), '94')
    await user.type(screen.getByLabelText('Full name'), 'Invalid')
    await user.type(screen.getByLabelText('Email'), 'invalid@example.com')
    await user.click(await input())
    await user.paste('not a url')
    await user.click(screen.getByRole('button', { name: 'Create author' }))

    expect(await screen.findByText('Must be a valid URL')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/authors/new')
  })

  it('has the input on the edit form', async () => {
    await renderApp('/authors/1/edit')
    expect(await input()).toBeInTheDocument()
  })

  it('shows Website on the detail page, with a dash when not set', async () => {
    await renderApp('/authors/2')
    const term = await screen.findByText('Website', { selector: 'dt' })
    expect(term.nextElementSibling).toHaveTextContent('—')
  })
})
