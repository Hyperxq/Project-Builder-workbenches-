import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError } from '@/shared/api/client'
import { useCreateAuthor } from '../application/use-authors'
import { AuthorForm } from './author-form'

export function AuthorCreatePage() {
  const navigate = useNavigate()
  const createAuthor = useCreateAuthor()

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
        <h1 className="text-2xl font-semibold tracking-tight">New author</h1>
      </header>

      <AuthorForm
        submitLabel="Create author"
        isPending={createAuthor.isPending}
        serverError={createAuthor.error instanceof ApiError ? createAuthor.error.message : undefined}
        onSubmit={(values) =>
          createAuthor.mutate(values, {
            onSuccess: (author) => {
              toast.success(`Author "${author.fullName}" created`)
              void navigate({ to: '/authors' })
            },
          })
        }
        onCancel={() => void navigate({ to: '/authors' })}
      />
    </div>
  )
}
