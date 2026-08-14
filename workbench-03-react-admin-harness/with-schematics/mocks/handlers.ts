import type { HttpHandler } from 'msw'
import { BACKEND_BASE_URL } from './core/backend'
import type { MockConfig } from './core/mock.config'
import { normalizeBaseUrl } from './core/url'
import { authorHandlers } from './domains/authors.mock'
import { bookHandlers } from './domains/books.mock'
import { categoryHandlers } from './domains/categories.mock'
import { reviewHandlers } from './domains/reviews.mock'
import { supplierHandlers } from './domains/suppliers.mock'
import { couponHandlers } from './domains/coupons.mock'
import { warehouseHandlers } from './domains/warehouses.mock'
import { vehicleHandlers } from './domains/vehicles.mock'
import { invoiceHandlers } from './domains/invoices.mock'
import { paymentHandlers } from './domains/payments.mock'
import { shipmentHandlers } from './domains/shipments.mock'
import { ticketHandlers } from './domains/tickets.mock'
import { eventHandlers } from './domains/events.mock'
import { subscriptionHandlers } from './domains/subscriptions.mock'
import { employeeHandlers } from './domains/employees.mock'

/**
 * Composes every domain's handlers into a single array.
 *
 * Adding a new domain is a three-step drill:
 *   1. Add its route keys to `MockRouteKey` (core/types.ts).
 *   2. Create `mocks/domains/<name>.mock.ts` exporting
 *      `<name>Handlers(config, baseUrl)` (+ fixture + spec).
 *   3. Add one import + one spread below.
 *
 * `baseUrl` defaults to the real backend but tests override it with
 * a throwaway value so handlers are exercised in isolation.
 */
export function createHandlers(
  config: MockConfig,
  baseUrl: string = BACKEND_BASE_URL,
): HttpHandler[] {
  const base = normalizeBaseUrl(baseUrl)

  return [
    ...authorHandlers(config, base),
    ...bookHandlers(config, base),
    ...categoryHandlers(config, base),
    ...reviewHandlers(config, base),
    ...supplierHandlers(config, base),
    ...couponHandlers(config, base),
    ...warehouseHandlers(config, base),
    ...vehicleHandlers(config, base),
    ...invoiceHandlers(config, base),
    ...paymentHandlers(config, base),
    ...shipmentHandlers(config, base),
    ...ticketHandlers(config, base),
    ...eventHandlers(config, base),
    ...subscriptionHandlers(config, base),
    ...employeeHandlers(config, base),
  ]
}
