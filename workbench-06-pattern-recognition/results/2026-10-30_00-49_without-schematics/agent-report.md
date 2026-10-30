The sidebar footer now shows `v1.4.0` to the right of the mock indicator. The number comes from `package.json` and isn't written anywhere in the source, so the footer will follow any version bump. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (72 tests). I didn't run `pnpm test:e2e`, the fourth gate in AGENTS.md.

**Changes:**
- **`src/app/shell/app-version.tsx`** (new): a small component that imports just `version` from `package.json` and renders `v{version}` in small muted text. I checked the production build: it contains the version string but not the rest of `package.json`, such as the dependency list.
- **`src/app/shell/app-sidebar.tsx`**: the footer is now a row with the mock indicator taking the available width and the version on the right. In builds where the mock indicator doesn't appear, the version still shows on its own.
- **`tsconfig.app.json`**: added `resolveJsonModule: true` so TypeScript allows the import from `package.json`.
- **`src/app/shell/app-sidebar.test.tsx`** (new): renders the real app at `/` and checks the sidebar shows `v<version>`. The test reads the expected value from `package.json` itself, so it won't break when the version changes.
