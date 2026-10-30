The Changelog page is at `/changelog`, and the sidebar has a new last entry, `Changelog`, with the `History` icon. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass. I didn't run the end-to-end tests (`pnpm test:e2e`) or add one for this page, since you only asked for the three checks above.

**What changed**
- **The page** (`src/features/changelog/presentation/changelog-page.tsx`) shows the `Changelog` heading and "Version 1.4.0 adds author profiles." It's built like the About and Help pages.
- **The route** (`src/routes/changelog.tsx`) is a thin file like the existing ones. The router's route list regenerates on its own and isn't tracked in git.
- **The sidebar** (`src/app/shell/app-sidebar.tsx`) gets the one new line for the entry.
- **The test** (`changelog-page.test.tsx`) checks the heading and paragraph, and that the sidebar entries run Overview, Authors, Help, About, Changelog. It also checks that clicking `Changelog` opens `/changelog`.

**I changed an existing test.** The About test required About to be the last sidebar entry, so it would have failed once Changelog was added. I removed that check; it still confirms the About link exists and works. The new Changelog test now checks the full order.

**The version number is typed into the page as text.** A recent change made the sidebar footer read the version from `package.json` so it can't go stale. I didn't do that here: a changelog line describes one past release, so "1.4.0" shouldn't change when the app's version does.
