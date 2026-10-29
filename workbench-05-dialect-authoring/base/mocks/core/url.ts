/**
 * URL helpers used by the mock layer.
 *
 * These exist for two reasons:
 *   1. Keep base-URL handling in ONE place so handler files aren't
 *      each guarding against trailing slashes or missing leading
 *      slashes.
 *   2. Make URL composition explicit and testable (rather than
 *      relying on template literals scattered everywhere).
 */

/** Ensure a relative path starts with exactly one leading slash. */
export function normalizePath(path: string): string {
  if (!path) return '/'
  return '/' + path.replace(/^\/+/, '').replace(/\/{2,}/g, '/')
}

/** Strip trailing slashes from a base URL. Throws if empty. */
export function normalizeBaseUrl(baseUrl: string): string {
  if (!baseUrl) {
    throw new Error('[MSW] baseUrl is empty — check VITE_API_BASE.')
  }
  return baseUrl.replace(/\/+$/, '')
}

/** Safely join a base URL and a relative path. */
export function joinUrl(baseUrl: string, path: string): string {
  return `${normalizeBaseUrl(baseUrl)}${normalizePath(path)}`
}
