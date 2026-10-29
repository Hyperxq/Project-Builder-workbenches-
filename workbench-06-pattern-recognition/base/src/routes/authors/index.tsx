import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { AuthorsPage } from '@/features/authors/presentation/authors-page'

/**
 * Route files stay thin: URL contract (search params) + component.
 * All behaviour lives in the feature's presentation layer.
 */
const authorsSearchSchema = z.object({
  page: z.number().int().min(1).default(1).catch(1),
  q: z.string().default('').catch(''),
})

export const Route = createFileRoute('/authors/')({
  validateSearch: authorsSearchSchema,
  component: AuthorsPage,
})
