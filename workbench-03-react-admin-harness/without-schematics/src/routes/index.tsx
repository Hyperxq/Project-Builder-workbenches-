import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArrowRight,
  BadgePercent,
  BookOpen,
  CalendarDays,
  Car,
  CreditCard,
  FileText,
  IdCard,
  Package,
  Repeat,
  Star,
  Tags,
  Ticket,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react'
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
              <CardDescription>Catalogue of books — list, create, edit and remove titles.</CardDescription>
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
              <CardDescription>
                Taxonomy for the catalogue — list, create, edit and remove categories.
              </CardDescription>
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
              <CardDescription>
                Reader reviews — list, create, edit and remove ratings.
              </CardDescription>
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
              <CardDescription>
                Vendor catalogue — list, create, edit and remove suppliers.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/coupons" className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Card className="h-full transition-colors group-hover:bg-popover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <BadgePercent className="size-4 text-muted-foreground" aria-hidden />
                <ArrowRight
                  className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </div>
              <CardTitle className="text-base">Coupons</CardTitle>
              <CardDescription>
                Discount coupons — list, create, edit and remove coupons.
              </CardDescription>
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
              <CardDescription>
                Warehouse network — list, create, edit and remove warehouses.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/vehicles" className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Card className="h-full transition-colors group-hover:bg-popover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Car className="size-4 text-muted-foreground" aria-hidden />
                <ArrowRight
                  className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </div>
              <CardTitle className="text-base">Vehicles</CardTitle>
              <CardDescription>
                Vehicle fleet — list, create, edit and remove vehicles.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/invoices" className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Card className="h-full transition-colors group-hover:bg-popover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <FileText className="size-4 text-muted-foreground" aria-hidden />
                <ArrowRight
                  className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </div>
              <CardTitle className="text-base">Invoices</CardTitle>
              <CardDescription>
                Supplier invoices — list, create, edit and remove invoices.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/payments" className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Card className="h-full transition-colors group-hover:bg-popover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CreditCard className="size-4 text-muted-foreground" aria-hidden />
                <ArrowRight
                  className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </div>
              <CardTitle className="text-base">Payments</CardTitle>
              <CardDescription>
                Payment ledger — list, create, edit and remove payments.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/shipments" className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Card className="h-full transition-colors group-hover:bg-popover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Package className="size-4 text-muted-foreground" aria-hidden />
                <ArrowRight
                  className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </div>
              <CardTitle className="text-base">Shipments</CardTitle>
              <CardDescription>
                Shipment tracking — list, create, edit and remove shipments.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/tickets" className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Card className="h-full transition-colors group-hover:bg-popover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Ticket className="size-4 text-muted-foreground" aria-hidden />
                <ArrowRight
                  className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </div>
              <CardTitle className="text-base">Tickets</CardTitle>
              <CardDescription>
                Support tickets — list, create, edit and remove tickets.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/events" className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Card className="h-full transition-colors group-hover:bg-popover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
                <ArrowRight
                  className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </div>
              <CardTitle className="text-base">Events</CardTitle>
              <CardDescription>
                Event calendar — list, create, edit and publish events.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/subscriptions" className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Card className="h-full transition-colors group-hover:bg-popover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Repeat className="size-4 text-muted-foreground" aria-hidden />
                <ArrowRight
                  className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </div>
              <CardTitle className="text-base">Subscriptions</CardTitle>
              <CardDescription>
                Customer subscriptions — list, create with the wizard, renew and remove.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/employees" className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Card className="h-full transition-colors group-hover:bg-popover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <IdCard className="size-4 text-muted-foreground" aria-hidden />
                <ArrowRight
                  className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </div>
              <CardTitle className="text-base">Employees</CardTitle>
              <CardDescription>
                Staff directory — read-only for viewers, full CRUD for admins.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </section>
    </div>
  )
}
