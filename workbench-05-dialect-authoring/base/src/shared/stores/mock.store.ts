import { create } from 'zustand'

type MockStore = {
  /** Whether handlers are currently registered with the worker. */
  isEnabled: boolean
  /** Whether mocking was bootstrapped for this session. */
  isAvailable: boolean
  /** Swap handlers in or out of the running worker. */
  toggle: () => Promise<void>
}

const enabledAtBoot = import.meta.env.VITE_ENABLE_MOCKING === 'true'

/**
 * Runtime toggle for MSW.
 *
 * The worker is started exactly ONCE at app boot (see
 * `mocks/core/init.ts`). Toggling does NOT call `worker.stop()` /
 * `worker.start()` — restarting a service worker mid-session is
 * unreliable and can let in-flight requests slip through un-mocked.
 *
 * Instead we mutate the live worker's handler list:
 *   - Toggle OFF → `worker.resetHandlers()` wipes all handlers.
 *                  With zero handlers registered everything falls
 *                  through to `onUnhandledRequest: 'bypass'` and
 *                  hits the real network.
 *   - Toggle ON  → `worker.use(...createHandlers(config, base))`
 *                  re-registers them.
 *
 * TREE-SHAKING:
 * The env-flag check below is written as
 *   `import.meta.env.VITE_ENABLE_MOCKING !== 'true'`
 * on purpose. Vite inlines the env var at build time, so when
 * mocking is off the condition folds to compile-time `true`,
 * every `await import('@mocks/...')` becomes unreachable,
 * and Rollup DCE-s the MSW chunks out of the production bundle.
 */
export const useMockStore = create<MockStore>((set, get) => ({
  isEnabled: enabledAtBoot,
  isAvailable: enabledAtBoot,

  toggle: async () => {
    // Compile-time guard — everything below is dead code in the
    // default production build.
    if (import.meta.env.VITE_ENABLE_MOCKING !== 'true') return

    const { worker } = await import('@mocks/browser')
    const { createHandlers } = await import('@mocks/handlers')
    const { resolveMockConfig } = await import('@mocks/core/mock.config')
    const { BACKEND_BASE_URL } = await import('@mocks/core/backend')

    if (get().isEnabled) {
      worker.resetHandlers()
      set({ isEnabled: false })
      console.info('[MSW] Handlers cleared — requests pass through to network')
      return
    }

    worker.use(...createHandlers(resolveMockConfig(), BACKEND_BASE_URL))
    set({ isEnabled: true })
    console.info('[MSW] Handlers re-registered — mocking again')
  },
}))
