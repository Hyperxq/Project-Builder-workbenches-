/**
 * Unique identifier for every mocked HTTP route in the application.
 *
 * Why have keys at all? Because we want to:
 *   1. Enable HYBRID MODE — at runtime a specific route can opt out
 *      of mocking and pass through to the real backend. That is
 *      driven by `VITE_MSW_OMIT_KEYS` (see `mock.config.ts`).
 *   2. Give each handler a stable, discoverable name so tests can
 *      reference them individually instead of indexing into an array.
 *
 * Extend this union when you add a new domain: five keys per entity,
 * `LIST_X | GET_X | CREATE_X | UPDATE_X | DELETE_X`.
 */
export type MockRouteKey =
  | 'LIST_AUTHORS'
  | 'GET_AUTHOR'
  | 'CREATE_AUTHOR'
  | 'UPDATE_AUTHOR'
  | 'DELETE_AUTHOR'
  | 'LIST_BOOKS'
  | 'GET_BOOK'
  | 'CREATE_BOOK'
  | 'UPDATE_BOOK'
  | 'DELETE_BOOK'
  | 'LIST_CATEGORIES'
  | 'GET_CATEGORY'
  | 'CREATE_CATEGORY'
  | 'UPDATE_CATEGORY'
  | 'DELETE_CATEGORY'
  | 'LIST_REVIEWS'
  | 'GET_REVIEW'
  | 'CREATE_REVIEW'
  | 'UPDATE_REVIEW'
  | 'DELETE_REVIEW'

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'
