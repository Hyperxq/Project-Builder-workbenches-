import { BACKEND_BASE_URL } from './backend'
import { resolveMockConfig } from './mock.config'

/**
 * Initializes the MSW browser worker when mock mode is enabled.
 *
 * CRITICAL DETAIL — the dynamic imports below:
 *
 *   await import('../browser');
 *   await import('../handlers');
 *
 * When `VITE_ENABLE_MOCKING` is not "true" at build time, Vite
 * inlines the env var as the literal string `"false"` (or
 * `undefined`). The early `return` becomes the only reachable
 * branch, Rollup DCE-s every `await import(...)` below it, and the
 * `msw/*`, `mocks/browser`, `mocks/handlers` chunks are never
 * emitted into the production bundle.
 */
export async function initMocking(): Promise<void> {
  if (import.meta.env.VITE_ENABLE_MOCKING !== 'true') {
    return
  }

  const { worker } = await import('../browser')
  const { createHandlers } = await import('../handlers')

  const config = resolveMockConfig()

  await worker.start({
    onUnhandledRequest: config.onUnhandled,
    // Honour Vite's base path so the Service Worker is served from
    // the same origin it's scoped to.
    serviceWorker: {
      url: `${import.meta.env.BASE_URL}mockServiceWorker.js`,
    },
  })

  worker.use(...createHandlers(config, BACKEND_BASE_URL))

  console.info('[MSW] Mock mode ENABLED — worker is intercepting requests', {
    omitted: [...config.omittedKeys],
    onUnhandled: config.onUnhandled,
  })
}
