import { HttpResponse } from 'msw'

/**
 * Tiny helpers for the error responses a mock handler needs to send.
 *
 * The goal is to keep individual handlers free of `new HttpResponse(...)`
 * boilerplate: the intent of the handler ("not found", "bad request")
 * lines up with a one-call helper.
 */

export function notFound(message = 'Not found') {
  return HttpResponse.json({ error: message }, { status: 404 })
}

export function badRequest(message = 'Bad request') {
  return HttpResponse.json({ error: message }, { status: 400 })
}

export function conflict(message = 'Conflict') {
  return HttpResponse.json({ error: message }, { status: 409 })
}

/**
 * 422 — the request is well-formed, but a workflow rule rejects it.
 *
 * Distinct from `badRequest`, which means the payload itself is invalid:
 * Event's publish guard refuses a perfectly valid payload because of the
 * entity's current state (past start date, no seats).
 */
export function unprocessable(message = 'Unprocessable') {
  return HttpResponse.json({ error: message }, { status: 422 })
}

export function serverError(message = 'Server error') {
  return HttpResponse.json({ error: message }, { status: 500 })
}
