import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthor, useDeleteAuthor } from '../application/use-authors'
import { ActiveBadge } from './active-badge'

export function AuthorDetailPage({ authorId }: { authorId: number }) {
  const navigate = useNavigate()
  const { data: author, isPending, isError } = useAuthor(authorId)
  const deleteAuthor = useDeleteAuthor()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  function handleDelete() {
    deleteAuthor.mutate(authorId, {
      onSuccess: () => {
        toast.success('Author deleted')
        void navigate({ to: '/authors' })
      },
      onError: (error) => toast.error(error.message),
      onSettled: () => setConfirmingDelete(false),
    })
  }

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

        {isError ? (
          <h1 className="text-2xl font-semibold tracking-tight">Author not found</h1>
        ) : isPending ? (
          <Skeleton className="h-8 w-64" />
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{author.fullName}</h1>
              <ActiveBadge active={author.active} />
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/authors/$authorId/edit" params={{ authorId: String(authorId) }}>
                  <Pencil aria-hidden />
                  Edit
                </Link>
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setConfirmingDelete(true)}>
                <Trash2 aria-hidden />
                Delete
              </Button>
            </div>
          </div>
        )}
      </header>

      {isError ? (
        <p className="text-sm text-muted-foreground">
          Author {authorId} does not exist or was removed.
        </p>
      ) : isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <Card>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Author ID</dt>
                <dd className="mt-0.5 text-sm">{author.authorId}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd className="mt-0.5 text-sm">{author.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Country</dt>
                <dd className="mt-0.5 text-sm">{author.country ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd className="mt-0.5 text-sm">{author.active ? 'Active' : 'Inactive'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete author?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes “{author?.fullName}” from the catalogue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteAuthor.isPending}
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
