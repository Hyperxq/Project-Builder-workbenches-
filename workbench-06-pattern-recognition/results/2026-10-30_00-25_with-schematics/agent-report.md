The About page is now at `/about`, with an `h1` reading "About" and the paragraph "This admin manages the authors of the catalogue." below it. The sidebar has a new About entry with the `Info` icon, after Help. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (48 tests). I didn't run the Playwright suite (`pnpm test:e2e`).

- **Page and sidebar:** I generated these with the project's `static-page` schematic, so they match how the Help page was built. The new page is `src/routes/about.tsx`, and the sidebar change is in `src/app/shell/app-sidebar.tsx`.
- **New test:** `src/app/about.test.tsx` checks that the heading and paragraph appear. It also checks that About is the last sidebar entry, links to `/about`, and opens the page when clicked.
- **Help test change:** the existing Help test assumed Help was the last sidebar entry, which stopped being true once About was added. I changed `src/app/help.test.tsx` to find the Help link by its name instead of its position.

There's no Playwright accessibility test for this page. The Help page doesn't have one either, though the project guide asks for one per page.
