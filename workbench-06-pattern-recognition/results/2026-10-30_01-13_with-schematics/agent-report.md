The Changelog page is live at `/changelog`. It has an `h1` reading "Changelog" and the paragraph "Version 1.4.0 adds author profiles." below it. The sidebar now ends with a Changelog entry linking to `/changelog`, using the `History` icon from `lucide-react`. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (49 tests). I didn't run `pnpm test:e2e`, which AGENTS.md also lists as a gate.

- **How it was built:** I used the project's `static-page` schematic, which does exactly this. It created `src/routes/changelog.tsx` and added one line to the sidebar list in `src/app/shell/app-sidebar.tsx`.
- **Test:** `src/app/changelog.test.tsx` checks that the heading and paragraph render. It also checks that the last sidebar link is Changelog and that clicking it opens `/changelog`.
- **About test changed:** the existing About test assumed About was the last sidebar entry, so I changed it to find its link by name. This is the same fix made to the Help test when About was added.

The version number "1.4.0" is written into the page as plain text, as you specified. The sidebar footer reads its version from `package.json`, but this paragraph won't change when the version does. That seemed right for a changelog entry about a past release.
