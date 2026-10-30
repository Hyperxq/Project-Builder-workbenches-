The sidebar footer now shows `v1.4.0` next to the mock indicator, and the number comes from `package.json` at build time, so it isn't written anywhere in the source. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (63 tests). I didn't run the e2e suite (`pnpm test:e2e`).

**How it works**
- **`vite.config.ts`** reads `version` from `package.json` and passes it into the app as a global constant, `__APP_VERSION__`. The constant is declared in `src/vite-env.d.ts` so TypeScript knows about it. A production build contains `1.4.0`.
- **`src/app/shell/app-sidebar.tsx`**: the footer is now a row with the mock indicator on the left and a small muted `v{__APP_VERSION__}` label on the right. In builds without mocks the indicator doesn't render, but the version still shows.

**Test** (`src/app/shell/app-version.test.tsx`)
1. It loads the real app and checks that the footer label equals `v` followed by the version it reads from `package.json`. The test doesn't contain the number either, so bumping the version won't break it.
2. The mock indicator doesn't appear in tests by default, so the second case switches it on and checks that the version and the indicator are in the same footer row.

None of the project's schematics covered this, so I wrote it by hand.
