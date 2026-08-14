**Batch 5 is delivered — all four gates green.**

| Gate | Result |
|---|---|
| `pnpm typecheck` | pass |
| `pnpm lint` | pass |
| `pnpm test:run` | 48 files / 402 tests passed (baseline 40 / 348) |
| `pnpm test:e2e` | 129 tests passed (baseline 110) |

**Phase 1 — plan.** `plans/batch-5.md`: modules + file lists, the `scout`'s pattern inventory (what already existed vs. what was genuinely new, with file:line evidence and every batch-5 prediction the earlier plans made), the delegation waves, and the verification plan. No `plan-directives/` exists.

**Phase 2 — build**, three serialised waves:

- **Wave 0 (mine, since it's cross-cutting):** `src/shared/stores/role.store.ts`, `src/app/shell/role-switch.tsx`, the sidebar footer, and a global role-store reset in `src/test/setup.ts`. The switch renders inside every section test and axe scan, so I re-ran the gates right after — still 348 tests — before delegating anything.
- **Wave 1 (`mechanic`) — Subscription [T3]:** the 3-step create wizard (one `useForm`, one `<form>`, one `type="submit"`, step state in `useState` so the URL stays `/subscriptions/new`), hand-rolled `role="radiogroup"` plan cards (no radio-group primitive exists in the tree), an edit-only plain form with `plan` locked, and the row-menu Renew that PATCHes an increment and toasts the server's new count.
- **Wave 2 (`mechanic`) — Employee [T3]:** full CRUD with two unique fields, plus the role gate. The write-surface guard lives in the page components, not `beforeLoad` — TanStack Router doesn't re-run `beforeLoad` when a Zustand store changes, so a role flip on a mounted `/employees/new` would otherwise not redirect. `useRoleStore` is imported by nothing outside the four Employee pages, which is what makes "other modules unaffected" structural rather than conventional.

**Phase 3 — verify.** One real failure surfaced: the e2e mid-session-flip test asserted `toHaveURL(/\/employees$/)`, but the list route's `validateSearch` defaults put `?page=1&q=` in the URL, so the redirect landed on `/employees?page=1&q=`. The guard was correct, the assertion was too strict — fixed to the tree's existing `(\?|$)` matcher and recorded as a trap in the plan's execution record.
