import { useRoleStore } from '@/shared/stores/role.store'
import type { Role } from '@/shared/stores/role.store'
import { cn } from '@/lib/utils'

const ROLES: Role[] = ['admin', 'viewer']

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  viewer: 'Viewer',
}

/**
 * Global Admin | Viewer switch (Employee heavy a), sitting in the sidebar
 * footer above the mock-mode pill.
 *
 * A segmented pair of `aria-pressed` buttons rather than a `Select`: both
 * states stay visible, it mirrors `MockIndicator`'s toggle idiom, and it
 * needs no portal to be driven under jsdom. The accessible names are
 * exactly "Admin" and "Viewer" — note the sidebar header also renders the
 * word "Admin", so tests must reach these by role, not by text.
 */
export function RoleSwitch() {
  const role = useRoleStore((state) => state.role)
  const setRole = useRoleStore((state) => state.setRole)

  return (
    <div role="group" aria-label="Role" className="mb-2 flex gap-1 rounded-md border p-0.5">
      {ROLES.map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={role === value}
          onClick={() => setRole(value)}
          className={cn(
            'flex-1 rounded-sm px-2 py-1 text-xs transition-colors',
            role === value
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {ROLE_LABELS[value]}
        </button>
      ))}
    </div>
  )
}
