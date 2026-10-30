I added the About page at `/about`. It has an `About` h1 with "This admin manages the authors of the catalogue." below it, built the same way as the existing Help page. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (44 tests). I didn't run the e2e gate (`pnpm test:e2e`) or write a Playwright spec, since you didn't ask for one.

**Changes:**
- **`src/features/about/presentation/about-page.tsx`**: the page itself.
- **`src/routes/about.tsx`**: the route for `/about`.
- **`src/app/shell/app-sidebar.tsx`**: a new `About` sidebar entry with the `Info` icon from `lucide-react`, after Overview, Authors and Help.
- **`src/features/about/presentation/about-page.test.tsx`**: two tests. One checks the heading and paragraph show up. The other checks the sidebar link points to `/about`, comes last in the order Overview, Authors, Help, About, and opens the page when clicked.

**I also had to change the Help test.** It checked that Help was the last sidebar link, which stopped being true once About was added. It now just checks that the Help link is in the sidebar and points to `/help`. The new About test covers the sidebar order.
