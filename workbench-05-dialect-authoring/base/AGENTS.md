# AGENTS.md — react-admin

React 19 admin application. Vite 8, TypeScript (strict), Tailwind v4 +
shadcn/ui (Radix, nova preset), TanStack Router (file-based) + TanStack Query,
Zustand, react-hook-form + Zod v4. The backend is simulated entirely with MSW
v2 — there is no real API. Package manager: pnpm. Dev server: port 3010.

Read `DESIGN.md` before writing any UI — it is the design language (Linear).
Dark-only: the theme tokens in `src/index.css` map DESIGN.md's palette to
shadcn variables. Never hardcode colors; use the semantic Tailwind tokens
(`bg-background`, `text-muted-foreground`, `border`, `bg-primary`, …).

## Architecture (clean, feature-sliced)

Every entity owns one folder under `src/features/` and crosses the same four
layers. Dependencies point inward only: presentation → application →
infrastructure → domain. Nothing imports from presentation.

```
src/
├── main.tsx                   # composition root: mocking boot, providers, router
├── app/shell/                 # app chrome: sidebar nav, mock indicator
├── components/ui/             # shadcn primitives (generated — do not hand-edit)
├── lib/utils.ts               # cn()
├── shared/
│   ├── api/client.ts          # fetch wrapper + ApiError (ONE place for base URL)
│   ├── api/pagination.ts      # Paginated<T>, ListParams, toQueryString
│   └── stores/mock.store.ts   # MSW runtime toggle (Zustand)
├── routes/                    # TanStack file routes — THIN: URL contract + component
│   ├── __root.tsx             # layout: sidebar + <Outlet /> + <Toaster />
│   └── <plural>/              # index (list), new, $<key>/index, $<key>/edit
└── features/<plural>/
    ├── domain/<singular>.ts             # entity schema (Zod) + types + key helper
    ├── application/use-<plural>.ts      # query keys + TanStack Query hooks
    ├── infrastructure/<plural>.api.ts   # REST calls via shared api client
    └── presentation/                    # pages + feature components
        ├── <plural>-page.tsx            # list: search, table, pagination, delete
        ├── <singular>-form.tsx          # create/edit form (RHF + zodResolver)
        ├── <singular>-create-page.tsx
        ├── <singular>-edit-page.tsx
        ├── <singular>-detail-page.tsx
        └── *.test.tsx                   # section-tier tests
mocks/
├── core/                      # config, init, url/error helpers (do not touch)
├── fixtures/<plural>.fixture.ts
├── domains/<plural>.mock.ts   # handler factory + in-memory store + reset<Plural>()
├── domains/<plural>.mock.spec.ts        # mock-infrastructure tests
└── handlers.ts                # composes every domain factory
```

### Layer responsibilities

1. **Domain** — Zod schemas are the single source of truth for the entity
   shape. Upsert schemas derive from the entity schema. Optional text inputs
   map `'' → undefined` at the form level (`register(..., { setValueAs })`)
   so empty inputs pass validation while the schema stays strict.
2. **Infrastructure** — the only place that knows paths/verbs. One exported
   `<plural>Api` object over `shared/api/client.ts`.
3. **Application** — `<singular>Keys` query-key factory + one hook per use
   case (`use<Plural>List`, `use<Singular>`, `useCreate/Update/Delete<Singular>`).
   Mutations invalidate the relevant keys. No JSX, no fetch.
4. **Presentation** — components consume application hooks only. List state
   (page, q) lives in the URL via the route's `validateSearch`; pages read it
   with `getRouteApi('/<plural>/')`. User feedback via sonner toasts;
   destructive actions confirm with AlertDialog.
5. **Routes** — thin files: search-param schema (Zod) + component wiring.
   Param-to-number conversion happens in the route component wrapper.

## The wire contract (MSW REST)

Every entity exposes the same five routes under `/api`:

| Route key | Method + path | Behaviour |
|---|---|---|
| `LIST_X` | `GET /<plural>?page&pageSize&q` | `Paginated<T>`, q searches the string fields |
| `GET_X` | `GET /<plural>/:key` | 404 when missing |
| `CREATE_X` | `POST /<plural>` | 400 invalid, 409 duplicate key/unique field, 201 + entity |
| `UPDATE_X` | `PATCH /<plural>/:key` | partial merge, revalidates, 404/400/409 |
| `DELETE_X` | `DELETE /<plural>/:key` | 204, 404 when missing |

Adding a mock domain is a four-step drill (see `mocks/handlers.ts`):
route keys in `core/types.ts` → fixture → `domains/<plural>.mock.ts` factory
(+ spec) → import + spread in `handlers.ts`, and reset in
`setup-test-mocking.ts`'s `afterEach`.

## Adding a full entity module (definition of done)

1. Mock domain (drill above) with ≥20 fixture rows so pagination is real.
2. Feature folder with the four layers (files per the tree above).
3. Route files: list (`validateSearch`: `page`, `q`), new, detail, edit.
4. Sidebar entry in `src/app/shell/app-sidebar.tsx` (one line in `NAV`).
5. Overview card in `src/routes/index.tsx`.
6. Tests: mock-infra spec (status codes, pagination, validation, uniqueness)
   + section tests (list renders/search/paginate/delete; form validates,
   creates, surfaces server conflicts) + the entity's e2e spec.
7. All four gates green.

## Testing

Three tiers, all through the REAL app where possible:

- **Mock-infrastructure** (`mocks/domains/*.mock.spec.ts`) — fetch against the
  node MSW server; handlers, not UI.
- **Section** (`src/features/**/*.test.tsx`) — `renderApp(path)` from
  `src/test/render-app.tsx` renders the real router + providers; drive with
  Testing Library user-event. No component mocking.
- **E2E** (`e2e/*.spec.ts`) — Playwright against `pnpm dev:mock` on port 3010,
  including an axe accessibility scan per page.

MSW state reseeds between tests (`afterEach` in `mocks/setup-test-mocking.ts`).

## Gates (definition of done, all four green)

```bash
pnpm typecheck && pnpm lint && pnpm test:run && pnpm test:e2e
```

## Scripts

| Script | What |
|---|---|
| `pnpm dev:mock` | dev server with MSW enabled (the default way to run) |
| `pnpm dev` | dev server, no mocks (requests hit the real network) |
| `pnpm dev:hybrid` | mocks on, keys in `VITE_MSW_OMIT_KEYS` bypass to network |
| `pnpm build` / `build:mock` | production build without/with mocks bundled |

<!-- pbuilder:skill:begin -->
## Project Builder

This project generates code with [Project Builder](https://github.com/Project-Builder-Schematics/project-builder-cli):
`project-builder.json` registers collections, and each collection registers
schematics — repeatable code generators for this codebase's patterns.

Start at the router — `.claude/skills/pbuilder/SKILL.md` — before running or
writing anything: it routes to the three guides covering how to run a
schematic, how to choose one, and when to create one, and it carries hazards
(no dry-run; run `execute` standalone) that apply before any command below.

Once routed, prefer an existing schematic over hand-writing code
(`builder execute <collection>:<schematic> --<input>=<value>`); if none fits
and the code follows a repeatable pattern, create one
(`builder new schematic <name>`) instead of writing the pattern again.

These four files are written by `builder init` and refreshed by
`builder init --force`; they are not a place for hand edits.
<!-- pbuilder:skill:end -->
