import { create } from 'zustand'

export const roles = ['admin', 'viewer'] as const
export type Role = (typeof roles)[number]
export const ROLE_LABELS: Record<Role, string> = { admin: 'Admin', viewer: 'Viewer' }

type RoleStore = {
  role: Role
  setRole: (role: Role) => void
}

/**
 * Global role switch (`shared/stores/mock.store.ts`'s shape: `create<T>()`
 * with state + one action, no middleware, no `persist` — the spec says
 * no persistence, so the app always boots back into Admin).
 *
 * Lives in `shared/stores/` and not inside the employees feature
 * because the *switch* is global chrome — the spec puts it in the
 * sidebar footer, and the shell may not import a feature's
 * presentation layer (dependencies point inward only, per
 * `AGENTS.md`). The *gate* itself stays inside `src/features/employees/**`
 * exclusively: nothing outside that feature (and this store) reads
 * `useRoleStore`, so other modules are unaffected by construction, not
 * by convention.
 *
 * `useRoleStore.getState()` (rather than the hook) is how the two
 * employees route files (`src/routes/employees/new.tsx` and
 * `src/routes/employees/$employeeId/edit.tsx`) read the role from
 * `beforeLoad` — `beforeLoad` runs outside React's render cycle, so
 * hooks are not callable there.
 */
export const useRoleStore = create<RoleStore>((set) => ({
  role: 'admin',
  setRole: (role) => set({ role }),
}))
