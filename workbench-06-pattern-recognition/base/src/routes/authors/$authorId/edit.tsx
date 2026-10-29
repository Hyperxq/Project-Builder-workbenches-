import { createFileRoute } from '@tanstack/react-router'
import { AuthorEditPage } from '@/features/authors/presentation/author-edit-page'

export const Route = createFileRoute('/authors/$authorId/edit')({
  component: RouteComponent,
})

function RouteComponent() {
  const { authorId } = Route.useParams()
  return <AuthorEditPage authorId={Number(authorId)} />
}
