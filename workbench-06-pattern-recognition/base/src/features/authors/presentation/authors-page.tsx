import { Link, getRouteApi } from '@tanstack/react-router'
import { MoreHorizontal, Plus, Search } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Author } from '../domain/author'
import { useAuthorsList, useDeleteAuthor } from '../application/use-authors'
import { ActiveBadge } from './active-badge'

const routeApi = getRouteApi('/authors/')

const PAGE_SIZE = 10

export function AuthorsPage() {
  const { page, q } = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const { data, isPending, isError, refetch } = useAuthorsList({ page, q, pageSize: PAGE_SIZE })
  const deleteAuthor = useDeleteAuthor()
  const [deleteTarget, setDeleteTarget] = useState<Author | null>(null)

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  function handleDelete() {
    if (!deleteTarget) return
    deleteAuthor.mutate(deleteTarget.authorId, {
      onSuccess: () => toast.success(`Author "${deleteTarget.fullName}" deleted`),
      onError: (error) => toast.error(error.message),
      onSettled: () => setDeleteTarget(null),
    })
  }

  return (
    <div className="mx-auto max-w-5xl p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Authors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.total} authors` : 'Manage the author catalogue.'}
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/authors/new">
            <Plus aria-hidden />
            New author
          </Link>
        </Button>
      </header>

      <div className="mb-4 relative max-w-xs">
        <Search
          aria-hidden
          className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          placeholder="Search authors…"
          aria-label="Search authors"
          className="pl-8"
          value={q}
          onChange={(event) =>
            void navigate({
              search: { q: event.target.value, page: 1 },
              replace: true,
            })
          }
        />
      </div>

      {isError ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">Something went wrong loading authors.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : isPending ? (
        <div className="space-y-2" aria-label="Loading authors">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-sm font-medium">{q ? 'No authors match your search' : 'No authors yet'}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {q ? 'Try a different query.' : 'Create the first author to get started.'}
          </p>
          {!q && (
            <Button asChild size="sm" className="mt-4">
              <Link to="/authors/new">
                <Plus aria-hidden />
                New author
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((author) => (
                  <TableRow key={author.authorId}>
                    <TableCell className="text-muted-foreground">{author.authorId}</TableCell>
                    <TableCell>
                      <Link
                        to="/authors/$authorId"
                        params={{ authorId: String(author.authorId) }}
                        className="font-medium hover:underline"
                      >
                        {author.fullName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{author.email}</TableCell>
                    <TableCell className="text-muted-foreground">{author.country ?? '—'}</TableCell>
                    <TableCell>
                      <ActiveBadge active={author.active} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${author.fullName}`}
                          >
                            <MoreHorizontal aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link
                              to="/authors/$authorId/edit"
                              params={{ authorId: String(author.authorId) }}
                            >
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeleteTarget(author)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <footer className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => void navigate({ search: { q, page: page - 1 } })}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => void navigate({ search: { q, page: page + 1 } })}
              >
                Next
              </Button>
            </div>
          </footer>
        </>
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete author?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes “{deleteTarget?.fullName}” from the catalogue.
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
