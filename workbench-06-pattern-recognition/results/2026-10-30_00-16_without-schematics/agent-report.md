The sidebar footer now shows `v1.4.0` next to the mock indicator. The number isn't written anywhere in the source: it's read from `package.json` when the app is built, so changing the version there changes the footer. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (64 tests). I didn't run `pnpm test:e2e` and added no e2e check.

**How it works**
- `vite.config.ts` reads `version` from `package.json` and passes it to the app as a global constant, `__APP_VERSION__`. I declared its type in `src/vite-env.d.ts`.
- `src/app/shell/app-sidebar.tsx` shows `v{__APP_VERSION__}` in the footer, in small muted text to the right of the mock indicator. The version still shows in builds where the mock indicator is hidden.
- Only the version string ends up in the built app, not the rest of `package.json`. I checked the production build and it contains just `1.4.0`.

**Test:** `src/app/shell/app-sidebar.test.tsx` renders the real app and checks that the sidebar shows `v<version>`, both on `/` and on another page. It also reads the expected value from `package.json`, so a version bump won't need a test change. To let the test import that file, I turned on `resolveJsonModule` in `tsconfig.app.json`.

One thing to know: the version is fixed when the dev server starts, so after editing `package.json` you need to restart the dev server or rebuild before the footer updates.
