import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ROLE_LABELS, roles, useRoleStore } from '@/shared/stores/role.store'
import type { Role } from '@/shared/stores/role.store'

/**
 * Sidebar-footer control for the global role switch (§1.2a). A
 * shadcn `Select`, mirroring the proven toolbar-filter wiring
 * (`payments-page.tsx:116-134`) — a `Select` rather than
 * `MockIndicator`'s toggle button because both role names must be
 * visible and selectable.
 *
 * `role` always comes straight from the store (never undefined), so
 * the Select is controlled from its very first render — no
 * uncontrolled→controlled warning is possible.
 *
 * Hazard: the sidebar header already renders the literal text "Admin"
 * (`app-sidebar.tsx`). The trigger below carries `aria-label="Role"`
 * so every locator can go through `getByRole('combobox', { name: 'Role' })`
 * instead of colliding on visible text.
 */
export function RoleSwitch() {
  const role = useRoleStore((state) => state.role)
  const setRole = useRoleStore((state) => state.setRole)

  return (
    <Select value={role} onValueChange={(value) => setRole(value as Role)}>
      <SelectTrigger aria-label="Role" size="sm" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {roles.map((r) => (
          <SelectItem key={r} value={r}>
            {ROLE_LABELS[r]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
