import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TEST_BASE_URL } from '@mocks/setup-test-mocking'
import { renderApp } from '@/test/render-app'

const url = (path: string) => `${TEST_BASE_URL}${path}`
const post = (body: object) =>
  fetch(url('/authors'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
const stored = async (id: number) => (await (await fetch(url(`/authors/${id}`))).json()) as Record<string, unknown>
const input = () => screen.findByLabelText(/^Pen\sname/)

describe('T09: optional penName', () => {
  it('stores penName on create and on update', async () => {
    const created = await post({ authorId: 90, fullName: 'New', email: 'new@example.com', penName: '  Gabo  ' })
    expect(created.status).toBe(201)
    expect((await stored(90)).penName).toEqual('Gabo')

    await fetch(url('/authors/1'), { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ penName: '  Gabo  ' }) })
    expect((await stored(1)).penName).toEqual('Gabo')
  })

  it('stores an empty penName as not set', async () => {
    const created = await post({ authorId: 92, fullName: 'Empty', email: 'empty@example.com', penName: '' })
    expect(created.status).toBe(201)
    expect(await stored(92)).not.toHaveProperty('penName')
  })

  it('creates an author with penName from the form', async () => {
    const user = userEvent.setup()
    const { router } = await renderApp('/authors/new')

    await user.type(await screen.findByLabelText('Author ID'), '91')
    await user.type(screen.getByLabelText('Full name'), 'Form Author')
    await user.type(screen.getByLabelText('Email'), 'form@example.com')
    await user.type(await input(), 'Gabo')
    await user.click(screen.getByRole('button', { name: 'Create author' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/authors'))
    expect((await stored(91)).penName).toEqual('Gabo')
  })

  it('creates an author without penName when the input is empty', async () => {
    const user = userEvent.setup()
    const { router } = await renderApp('/authors/new')

    await user.type(await screen.findByLabelText('Author ID'), '93')
    await user.type(screen.getByLabelText('Full name'), 'No Value')
    await user.type(screen.getByLabelText('Email'), 'novalue@example.com')
    await user.click(screen.getByRole('button', { name: 'Create author' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/authors'))
    expect(await stored(93)).not.toHaveProperty('penName')
  })


  it('has the input on the edit form', async () => {
    await renderApp('/authors/1/edit')
    expect(await input()).toBeInTheDocument()
  })

  it('shows Pen name on the detail page, with a dash when not set', async () => {
    await renderApp('/authors/2')
    const term = await screen.findByText('Pen name', { selector: 'dt' })
    expect(term.nextElementSibling).toHaveTextContent('—')
  })
})
