The Help page is live at `/help`, and the sidebar now has a **Help** entry with the `CircleHelp` icon after Overview and Authors. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass, including two new tests for the page.

- **Page:** it shows an `h1` reading "Help" with your paragraph below it: "Questions about the admin? Write to support@example.com." The styling matches the Overview page header. The page is in `src/features/help/presentation/help-page.tsx`, and `src/routes/help.tsx` connects it to the `/help` URL.
- **Sidebar:** one new line in the menu list in `src/app/shell/app-sidebar.tsx`.
- **Tests** (`help-page.test.tsx`): one opens `/help` and checks the heading and paragraph. The other starts on `/`, checks that the sidebar's Help link points to `/help`, clicks it, and confirms the Help page appears.

I wrote all of this by hand. TanStack Router's build step added the new route to its route list automatically when `pnpm typecheck` ran. That file is git-ignored, so it won't show in the diff.

I didn't run `pnpm test:e2e` (the browser tests, which AGENTS.md also lists as a required check) and didn't add a browser test or accessibility scan for the new page.
