import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/shared/api/client'
import { useAuthor, useUpdateAuthor } from '../application/use-authors'
import { AuthorForm } from './author-form'

export function AuthorEditPage({ authorId }: { authorId: number }) {
  const navigate = useNavigate()
  const { data: author, isPending, isError } = useAuthor(authorId)
  const updateAuthor = useUpdateAuthor(authorId)

  return (
    <div className="mx-auto max-w-5xl p-8">
      <header className="mb-6">
        <Link
          to="/authors"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Authors
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {author ? `Edit ${author.fullName}` : 'Edit author'}
        </h1>
      </header>

      {isError ? (
        <p className="text-sm text-muted-foreground">Author {authorId} was not found.</p>
      ) : isPending ? (
        <div className="max-w-lg space-y-4" aria-label="Loading author">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      ) : (
        <AuthorForm
          author={author}
          submitLabel="Save changes"
          isPending={updateAuthor.isPending}
          serverError={updateAuthor.error instanceof ApiError ? updateAuthor.error.message : undefined}
          onSubmit={(values) =>
            updateAuthor.mutate(values, {
              onSuccess: (updated) => {
                toast.success(`Author "${updated.fullName}" updated`)
                void navigate({ to: '/authors/$authorId', params: { authorId: String(authorId) } })
              },
            })
          }
          onCancel={() =>
            void navigate({ to: '/authors/$authorId', params: { authorId: String(authorId) } })
          }
        />
      )}
    </div>
  )
}
