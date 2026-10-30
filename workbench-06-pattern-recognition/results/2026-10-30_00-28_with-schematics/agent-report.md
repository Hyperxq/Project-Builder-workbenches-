The Changelog page is live at `/changelog`. It shows the `Changelog` heading and the paragraph "Version 1.4.0 adds author profiles." The sidebar now has a last entry, `Changelog`, with the `History` icon, linking to the page. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (65 tests). I didn't run the e2e tests.

- **Page and sidebar entry:** generated with the project's `static-page` schematic. That produced `src/routes/changelog.tsx` and added the line to `src/app/shell/app-sidebar.tsx`.
- **New test:** `src/app/changelog.test.tsx` checks that the heading and paragraph render. It also checks that the last sidebar link goes to `/changelog` and opens the page when clicked.
- **Changed test:** the About page test assumed About was the last sidebar entry, which is no longer true. It now finds the About link by name instead. The Help test was changed the same way when About was added.

The version number is written into the page text as you gave it. That differs from the sidebar footer, which reads the version from `package.json`, so the paragraph won't change when the version does. That seems right for a changelog entry, which describes one past release.

The project's e2e suite only covers Authors; earlier pages like Help and About have no e2e spec either, so I didn't add one.
