I added the Help page at `/help`. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (29 tests in 5 files). I didn't run `pnpm test:e2e`, which AGENTS.md lists as a fourth gate, and I didn't add a Playwright test for the page.

**What changed**
- I created the page with the project's `static-page` schematic.
- **`src/routes/help.tsx`**: the new route. It shows an `h1` reading "Help" and, below it, "Questions about the admin? Write to support@example.com." It uses the same layout and colour styles as the other pages.
- **`src/app/shell/app-sidebar.tsx`**: a `Help` entry linking to `/help` with the `CircleHelp` icon from `lucide-react`, after Overview and Authors.
- **`src/app/help.test.tsx`**: the new test, which loads the real app. It checks two things:
  - Opening `/help` shows the heading and the paragraph.
  - The last sidebar link is `Help`, points to `/help`, and clicking it opens the page.

The router's route list (`routeTree.gen.ts`) is rebuilt automatically when `pnpm typecheck` runs. It's ignored by git, so it doesn't appear in the changes.
