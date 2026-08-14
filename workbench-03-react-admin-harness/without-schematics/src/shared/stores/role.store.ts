import { create } from 'zustand'

export type Role = 'admin' | 'viewer'

type RoleStore = {
  /** Who the app thinks you are. */
  role: Role
  setRole: (role: Role) => void
}

/**
 * Global role switch (Employee heavy a).
 *
 * Deliberately NOT persisted — the spec asks for it, and it has two
 * useful consequences: a reload returns to Admin, and every Playwright
 * test starts from a pristine role because each test gets a fresh
 * browser context. Vitest is the exception: module-level Zustand state
 * outlives a single test, so `src/test/setup.ts` resets this store in a
 * global `afterEach`.
 *
 * Only the Employees module reads it (heavy c) — no shared layout or
 * other feature branches on the role.
 */
export const useRoleStore = create<RoleStore>((set) => ({
  role: 'admin',
  setRole: (role) => set({ role }),
}))
