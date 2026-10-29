import { createFileRoute } from '@tanstack/react-router'
import { AuthorDetailPage } from '@/features/authors/presentation/author-detail-page'

export const Route = createFileRoute('/authors/$authorId/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { authorId } = Route.useParams()
  return <AuthorDetailPage authorId={Number(authorId)} />
}
