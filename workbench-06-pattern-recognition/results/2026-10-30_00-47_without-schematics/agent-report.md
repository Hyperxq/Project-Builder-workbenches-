I added the About page at `/about`. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass, with 58 tests in 8 files.

- **Page:** `src/features/about/presentation/about-page.tsx` shows the `About` heading with "This admin manages the authors of the catalogue." below it. It's styled the same way as the existing Help page.
- **Route:** `src/routes/about.tsx` connects `/about` to the page. The route list file (`routeTree.gen.ts`) isn't tracked by git and gets rebuilt during `pnpm typecheck`, so it didn't need editing by hand.
- **Sidebar:** `src/app/shell/app-sidebar.tsx` has a new last entry, `About`, linking to `/about` with the `Info` icon from `lucide-react`.
- **Test:** `about-page.test.tsx` renders the real app. It checks that `/about` shows the heading and paragraph, that `About` is the last sidebar link, and that clicking it opens `/about`.

I didn't run `pnpm test:e2e` (the fourth check AGENTS.md lists) and didn't add a browser test, since you didn't ask for either. The Help page doesn't have one either.
