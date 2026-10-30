The Changelog page is live at `/changelog`. It shows the `Changelog` heading with "Version 1.4.0 adds author profiles." below it, and the sidebar has a new last entry, `Changelog`, with the `History` icon. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (66 tests). I didn't run the e2e tests (`pnpm test:e2e`) and didn't add an e2e spec for the page.

**What I added**
- `src/routes/changelog.tsx`: the route, which only connects the URL to the page.
- `src/features/changelog/presentation/changelog-page.tsx`: the page itself, laid out like the About page.
- `src/app/shell/app-sidebar.tsx`: one line adding the sidebar entry after About.
- `src/features/changelog/presentation/changelog-page.test.tsx`: tests that the heading and paragraph render, and that clicking the last sidebar entry opens `/changelog`.

**One change to an existing test:** the About page test assumed About was the last sidebar entry, which is no longer true. It now finds the link by its name instead of its position, the same fix made to the Help test when About was added.

The "1.4.0" in the paragraph is typed into the page as you specified, so it won't change when the version in `package.json` does. The sidebar footer version, by contrast, is read from `package.json` and updates automatically.
