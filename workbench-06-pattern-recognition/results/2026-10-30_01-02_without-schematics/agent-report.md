The sidebar footer now shows `v1.4.0` next to the mock indicator. The number is read from `package.json` when the app is built, so it isn't written anywhere in the source. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass, with 55 tests. I didn't run `pnpm test:e2e`, which AGENTS.md also lists as a required check, and I didn't look at the footer in a browser.

**How it works**
- **`vite.config.ts`** reads `version` from `package.json` and passes it into the app under the name `__APP_VERSION__`. Tests use the same config, so they get the same value.
- **`src/vite-env.d.ts`** declares `__APP_VERSION__` so TypeScript knows about it.
- **`src/app/shell/app-sidebar.tsx`**: the footer is now one row. The mock indicator fills the space and the version sits at the right in small grey text. When mock mode isn't running, the indicator disappears but the version still shows.

I checked the built bundle: it contains `1.4.0`, and no `__APP_VERSION__` placeholder is left. Because the value is set at build time, a change to `package.json` shows up on the next build or dev-server restart.

**Test** (`src/app/shell/app-sidebar.test.tsx`)
- The test also gets the expected version from `package.json`, so it won't need updating when the version changes. To allow that import, I turned on `resolveJsonModule` in `tsconfig.app.json`.
- The mock indicator doesn't normally appear in tests. The first case switches it on through the mock store and checks that `v<version>` appears in the same footer row as the "Mock mode on" button. The store is reset after each test.
- The second case checks that the version still shows when the indicator is hidden.
