import { setupWorker } from 'msw/browser'

/**
 * The service-worker-powered MSW instance used at runtime in the
 * browser. It starts with NO handlers — `initMocking()` registers
 * the real ones via `worker.use(...)` once it knows the resolved
 * `MockConfig`, and `useMockStore.toggle()` swaps them in and out
 * at runtime without ever calling `worker.stop()`.
 *
 * Why no handlers at construction? So the test suite and the
 * browser both treat `createHandlers(config, baseUrl)` as the
 * ONE function that produces the handler list — same inputs,
 * same outputs, two runtimes.
 */
export const worker = setupWorker()
