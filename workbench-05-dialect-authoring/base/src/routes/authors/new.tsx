import { createFileRoute } from '@tanstack/react-router'
import { AuthorCreatePage } from '@/features/authors/presentation/author-create-page'

export const Route = createFileRoute('/authors/new')({
  component: AuthorCreatePage,
})
