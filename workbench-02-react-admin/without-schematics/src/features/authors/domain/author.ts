import { z } from 'zod'

/**
 * Author — reference entity (mirrors workbench-01's Author spec).
 *
 * The domain layer owns the entity shape and its validation rules.
 * Everything else (forms, API payloads, mock handlers) derives from
 * these schemas instead of redefining the shape.
 */

export const authorSchema = z.object({
  authorId: z.number().int().positive(),
  fullName: z.string().trim().min(1, 'Full name is required'),
  email: z.email('Must be a valid email'),
  country: z.string().trim().min(1).optional(),
  active: z.boolean(),
})

export type Author = z.infer<typeof authorSchema>

/** Payload for create/update. `active` is optional — defaults to true on create. */
export const authorUpsertSchema = authorSchema.extend({
  active: z.boolean().optional(),
})

export type AuthorUpsert = z.infer<typeof authorUpsertSchema>

/** The unique lookup key used by get/update/remove routes. */
export function authorKey(author: Pick<Author, 'authorId'>): number {
  return author.authorId
}
