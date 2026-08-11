import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, BookOpen, Star, Tag, Users } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/')({
  component: OverviewPage,
})

function OverviewPage() {
  return (
    <div className="mx-auto max-w-5xl p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reference admin for the Project Builder workbench. Each entity below is a full CRUD
          module.
        </p>
      </header>

      <section aria-label="Entities" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/authors" className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Card className="h-full transition-colors group-hover:bg-popover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Users className="size-4 text-muted-foreground" aria-hidden />
                <ArrowRight
                  className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </div>
              <CardTitle className="text-base">Authors</CardTitle>
              <CardDescription>Reference module — list, create, edit and remove authors.</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/books" className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Card className="h-full transition-colors group-hover:bg-popover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <BookOpen className="size-4 text-muted-foreground" aria-hidden />
                <ArrowRight
                  className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </div>
              <CardTitle className="text-base">Books</CardTitle>
              <CardDescription>List, create, edit and remove books in the catalogue.</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link
          to="/categories"
          className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card className="h-full transition-colors group-hover:bg-popover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Tag className="size-4 text-muted-foreground" aria-hidden />
                <ArrowRight
                  className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </div>
              <CardTitle className="text-base">Categories</CardTitle>
              <CardDescription>Organise books into browsable categories.</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/reviews" className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Card className="h-full transition-colors group-hover:bg-popover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Star className="size-4 text-muted-foreground" aria-hidden />
                <ArrowRight
                  className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </div>
              <CardTitle className="text-base">Reviews</CardTitle>
              <CardDescription>Reader reviews linked to books, with moderation status.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </section>
    </div>
  )
}
