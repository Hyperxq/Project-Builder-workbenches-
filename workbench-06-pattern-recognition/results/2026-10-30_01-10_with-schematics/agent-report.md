The About page is live at `/about`, with an `h1` reading "About" and the paragraph "This admin manages the authors of the catalogue." below it. The sidebar has a new About entry with the `Info` icon, placed after Help. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (38 tests). I didn't run the e2e suite.

- **How it was made:** I used the repo's `static-page` schematic, which created `src/routes/about.tsx` and added the sidebar line in `src/app/shell/app-sidebar.tsx`. I checked both files after it ran.
- **New test:** `src/app/about.test.tsx` checks that the heading and paragraph render, and that the last sidebar link is About, points to `/about`, and opens the page when clicked.
- **Change to an existing test:** `src/app/help.test.tsx` assumed Help was the last sidebar link, which stopped being true once About was added. It now finds the Help link by its name, so it won't break the next time an entry is added.
