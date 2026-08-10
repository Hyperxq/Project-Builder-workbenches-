const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, statusText: string, body: unknown) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error: unknown }).error)
        : `${status} ${statusText}`
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/**
 * Minimal fetch wrapper. Centralises the base URL, content-type
 * defaults, and error normalisation so call sites stay boring.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(response.status, response.statusText, body)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
