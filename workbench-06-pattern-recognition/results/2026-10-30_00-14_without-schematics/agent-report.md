The About page is live at `/about`. It shows an `About` heading with "This admin manages the authors of the catalogue." below it. The sidebar has a new `About` entry with the `Info` icon, placed after Overview, Authors and Help. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (48 tests across 6 files). I didn't run the e2e suite (`pnpm test:e2e`), and there's no Playwright spec for the new page.

- **Page:** it's built the same way as the Help page, with a thin route file `src/routes/about.tsx` and the page in `src/features/about/presentation/about-page.tsx`.
- **Test:** `about-page.test.tsx` checks that the heading and paragraph render at `/about`. It also checks that the last sidebar link is `About`, points to `/about`, and goes to the page when clicked.
- **Changed an existing test:** the Help test assumed Help was the last sidebar link, which is no longer true. It now finds the link by its name, `Help`, instead.
