import { readFileSync } from 'node:fs'
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/render-app'

// The checker runs this a second time after changing package.json's version.
const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }

describe('T07: app version in the sidebar', () => {
  it('shows v<version> from package.json', async () => {
    await renderApp('/')
    const sidebar = await screen.findByRole('complementary')
    expect(within(sidebar).getByText(`v${version}`)).toBeInTheDocument()
  })
})
