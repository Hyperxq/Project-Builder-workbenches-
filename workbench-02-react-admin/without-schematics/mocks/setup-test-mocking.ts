import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'
import type { MockConfig } from './core/mock.config'
import { resetAuthors } from './domains/authors.mock'
import { resetBooks } from './domains/books.mock'
import { resetCategories } from './domains/categories.mock'
import { resetReviews } from './domains/reviews.mock'
import { createHandlers } from './handlers'

/**
 * Node-side MSW server used by Vitest.
 *
 * Wired via `setupFiles` in `vite.config.ts`, so every test file
 * has the server listening automatically — no per-file `beforeAll`
 * boilerplate.
 *
 * Tests that need to override a handler for a single case import
 * `server` from this file and call `server.use(...)`; the
 * `afterEach` below resets those overrides back to the default
 * handler list AND reseeds every domain's in-memory state.
 */

export const TEST_BASE_URL = 'http://localhost/api'

const testConfig: MockConfig = {
  omittedKeys: new Set(),
  onUnhandled: 'error',
}

export const server = setupServer(...createHandlers(testConfig, TEST_BASE_URL))

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
  resetAuthors()
  resetBooks()
  resetCategories()
  resetReviews()
})

afterAll(() => {
  server.close()
})
