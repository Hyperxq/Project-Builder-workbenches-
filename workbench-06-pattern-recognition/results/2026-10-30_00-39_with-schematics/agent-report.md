The Changelog page is live at `/changelog`, with its sidebar entry. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (48 tests). I didn't run the Playwright end-to-end tests (`pnpm test:e2e`), which you didn't ask for.

**What changed**
- **The page** (`src/routes/changelog.tsx`): I generated it with the repo's `static-page` schematic. It shows the `Changelog` heading and the paragraph "Version 1.4.0 adds author profiles.", styled like the Help and About pages.
- **Sidebar** (`src/app/shell/app-sidebar.tsx`): a `Changelog` entry linking to `/changelog`, with the `History` icon, after About.
- **Test** (`src/app/changelog-page.test.tsx`): checks the heading and paragraph at `/changelog`, and that the last sidebar link is Changelog with the right link and icon and goes to the page when clicked.

**Worth knowing**
- **I edited the About test.** It checked that About was the last sidebar link, which stopped being true. It now finds the About link by name instead, the same fix the Help test got when About was added.
- **The icon is an alias.** In the installed version of `lucide-react`, `History` is another name for the `RotateCcwClock` icon. The icon displays correctly, but the test has to look for `lucide-rotate-ccw-clock` rather than `lucide-history`. There's a comment in the test explaining this.
- **The version number is typed into the page text.** An earlier change made the sidebar footer read the version from `package.json` instead. I left the number in the paragraph on purpose: it records what version 1.4.0 added, so it shouldn't change when the version goes up.
