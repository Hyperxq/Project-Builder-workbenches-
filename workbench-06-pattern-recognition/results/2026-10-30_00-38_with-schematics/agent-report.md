The sidebar footer now shows `v1.4.0` beside the mock indicator. The number comes from `package.json` at build time and isn't written anywhere in the source, so when `package.json` changes, the footer follows. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (46 tests). I didn't run `pnpm test:e2e`, which AGENTS.md also lists as a gate.

**What changed**
- **`vite.config.ts`**: reads `version` from `package.json` and passes it into the app through Vite's `define` setting as `__APP_VERSION__`. This puts only the version string into the bundle, not the whole `package.json`. I checked the production build and it contains `1.4.0`.
- **`src/vite-env.d.ts`**: declares `__APP_VERSION__` as a string so TypeScript accepts it.
- **`src/app/shell/app-sidebar.tsx`**: the footer is now one row, with the mock indicator on the left and `v{__APP_VERSION__}` on the right in muted grey. The version shows even in builds without mocks, where the indicator itself doesn't render.
- **`src/app/shell/app-sidebar.test.tsx`** (new): renders the real app at `/` and checks that the sidebar contains `v<version>`. The test reads the expected version directly from `package.json` rather than from `__APP_VERSION__`, so it checks the whole chain from the file to the screen and won't need editing when the version changes.

None of the existing schematics fit this change, so I wrote it by hand.
