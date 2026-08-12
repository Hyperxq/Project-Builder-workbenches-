import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, BookOpen, Star, Tags, TicketPercent, Truck, Users, Warehouse } from 'lucide-react'
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
              <CardDescription>Catalogue module — list, create, edit and remove books.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/categories" className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Card className="h-full transition-colors group-hover:bg-popover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Tags className="size-4 text-muted-foreground" aria-hidden />
                <ArrowRight
                  className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </div>
              <CardTitle className="text-base">Categories</CardTitle>
              <CardDescription>Taxonomy module — list, create, edit and remove categories.</CardDescription>
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
              <CardDescription>Reader feedback — rate books, verify reviews, moderate the queue.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/suppliers" className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Card className="h-full transition-colors group-hover:bg-popover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Truck className="size-4 text-muted-foreground" aria-hidden />
                <ArrowRight
                  className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </div>
              <CardTitle className="text-base">Suppliers</CardTitle>
              <CardDescription>Procurement module — list, create, edit and remove suppliers.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/coupons" className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Card className="h-full transition-colors group-hover:bg-popover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <TicketPercent className="size-4 text-muted-foreground" aria-hidden />
                <ArrowRight
                  className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </div>
              <CardTitle className="text-base">Coupons</CardTitle>
              <CardDescription>Promotions module — discounts, expiry dates and activation.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/warehouses" className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Card className="h-full transition-colors group-hover:bg-popover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Warehouse className="size-4 text-muted-foreground" aria-hidden />
                <ArrowRight
                  className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </div>
              <CardTitle className="text-base">Warehouses</CardTitle>
              <CardDescription>Logistics module — capacity and location of each site.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </section>
    </div>
  )
}
