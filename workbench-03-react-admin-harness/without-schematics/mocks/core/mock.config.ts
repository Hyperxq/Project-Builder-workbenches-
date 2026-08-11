import type { MockRouteKey } from './types'

/**
 * The resolved mock configuration for the current runtime.
 *
 * A plain object, intentionally. Every domain handler receives one
 * and decides what to do based on its fields — no hidden globals,
 * no process.env reads inside a handler.
 */
export interface MockConfig {
  /** Route keys that should BYPASS the mock and hit the real network. */
  omittedKeys: Set<MockRouteKey>
  /** Behaviour for requests that no handler matches. */
  onUnhandled: 'bypass' | 'warn' | 'error'
}

function parseOmittedKeys(raw: string | undefined): Set<MockRouteKey> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean) as MockRouteKey[],
  )
}

/**
 * Reads the env vars (set by the script via cross-env, or by the
 * build pipeline) and produces a fully-typed `MockConfig`.
 *
 * Called:
 *   - Once at app boot from `mocks/core/init.ts`.
 *   - Again from `useMockStore.toggle()` so re-registering handlers
 *     uses the same config that bootstrap did.
 *   - In tests with a hand-built `MockConfig` — see
 *     `mocks/setup-test-mocking.ts`.
 */
export function resolveMockConfig(): MockConfig {
  return {
    omittedKeys: parseOmittedKeys(import.meta.env.VITE_MSW_OMIT_KEYS),
    onUnhandled: import.meta.env.VITE_MSW_ON_UNHANDLED ?? 'bypass',
  }
}

/**
 * Sugar for handlers: "should I actually mock this key, or let it
 * fall through to the real network?"
 */
export function shouldMock(config: MockConfig, key: MockRouteKey): boolean {
  return !config.omittedKeys.has(key)
}
