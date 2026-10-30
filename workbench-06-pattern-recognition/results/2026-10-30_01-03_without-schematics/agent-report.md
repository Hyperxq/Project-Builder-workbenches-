The Changelog page is live at `/changelog`. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (57 tests). I didn't run the e2e suite (`pnpm test:e2e`) or add an e2e test for the page.

- **Page:** it shows the `Changelog` heading with "Version 1.4.0 adds author profiles." below it. The layout matches the About page.
- **Sidebar:** a `Changelog` entry with the `History` icon now comes last, after About.
- **Test:** the new test checks the heading and paragraph. It also clicks the sidebar entry, checks it ends up on `/changelog`, and checks it is the last of the five sidebar links.

**About test changed:** the existing About test required About to be the last sidebar link, which is no longer true. I changed it to check only that the link is in the sidebar and points to `/about`, as was done for the Help test when About was added.

The version number in the paragraph is written into the page, not read from `package.json` like the sidebar footer. It describes what version 1.4.0 changed, so it shouldn't move when the version is bumped.
