import { Link } from '@tanstack/react-router'
import { BookOpen, LayoutDashboard, Star, Tag, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { MockIndicator } from './mock-indicator'

interface NavEntry {
  to: string
  label: string
  icon: LucideIcon
}

/** One entry per feature module — new entities add exactly one line. */
const NAV: NavEntry[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/authors', label: 'Authors', icon: Users },
  { to: '/books', label: 'Books', icon: BookOpen },
  { to: '/categories', label: 'Categories', icon: Tag },
  { to: '/reviews', label: 'Reviews', icon: Star },
]

export function AppSidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-card">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <span className="flex size-6 items-center justify-center rounded-sm bg-primary text-xs font-semibold text-primary-foreground">
          A
        </span>
        <span className="text-sm font-medium">Admin</span>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-0.5 p-2">
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === '/' }}
            className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-foreground"
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t p-3">
        <MockIndicator />
      </div>
    </aside>
  )
}
