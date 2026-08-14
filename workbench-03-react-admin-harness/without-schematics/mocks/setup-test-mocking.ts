import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'
import type { MockConfig } from './core/mock.config'
import { resetAuthors } from './domains/authors.mock'
import { resetBooks } from './domains/books.mock'
import { resetCategories } from './domains/categories.mock'
import { resetCoupons } from './domains/coupons.mock'
import { resetEmployees } from './domains/employees.mock'
import { resetEvents } from './domains/events.mock'
import { resetInvoices } from './domains/invoices.mock'
import { resetPayments } from './domains/payments.mock'
import { resetReviews } from './domains/reviews.mock'
import { resetShipments } from './domains/shipments.mock'
import { resetSubscriptions } from './domains/subscriptions.mock'
import { resetSuppliers } from './domains/suppliers.mock'
import { resetTickets } from './domains/tickets.mock'
import { resetVehicles } from './domains/vehicles.mock'
import { resetWarehouses } from './domains/warehouses.mock'
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
  resetSuppliers()
  resetCoupons()
  resetWarehouses()
  resetVehicles()
  resetInvoices()
  resetPayments()
  resetShipments()
  resetTickets()
  resetEvents()
  resetSubscriptions()
  resetEmployees()
})

afterAll(() => {
  server.close()
})
