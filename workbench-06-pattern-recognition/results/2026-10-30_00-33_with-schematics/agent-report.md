I added the Help page at `/help`. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass: 4 test files, 24 tests. I didn't run `pnpm test:e2e`, which AGENTS.md lists as a fourth gate, and I didn't add an e2e spec for the page.

The repo already had a reviewed schematic for this kind of page (`default:static-page`), so I generated the page with it rather than writing it by hand:

- **`src/routes/help.tsx`** (new): the `/help` route, showing the `Help` heading with "Questions about the admin? Write to support@example.com." below it.
- **`src/app/shell/app-sidebar.tsx`**: a `Help` entry after Overview and Authors, linking to `/help` with the `CircleHelp` icon from `lucide-react`.

I added one test file, **`src/app/help-page.test.tsx`**, which runs the real app through `renderApp` like the existing tests:
1. Opening `/help` shows the heading and the support paragraph.
2. The last link in the sidebar is `Help` pointing to `/help`, and clicking it opens the page.

The test sits in `src/app/` because this page has no feature folder of its own, and AGENTS.md only defines a test location for feature folders.
