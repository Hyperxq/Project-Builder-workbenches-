The sidebar footer now shows `v1.4.0` to the right of the mock indicator. The number comes from `package.json`, so when the version there changes, the footer changes with it. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (47 tests). I didn't run `pnpm test:e2e`, the fourth check listed in AGENTS.md.

**Changes:**
- **`src/app/shell/app-sidebar.tsx`**: imports `version` from `package.json` and puts `v{version}` in the footer, in muted text, beside the mock indicator.
- **`tsconfig.app.json`**: added `resolveJsonModule: true` so TypeScript accepts the JSON import.
- **`src/app/version.test.tsx`** (new): renders the real app and checks that the footer shows exactly `v` followed by the version in `package.json`. The test reads the version from the file too, so it won't break when the number changes.

**Checks:** `1.4.0` appears nowhere in `src`. The production build contains the version string but not the rest of `package.json`; I confirmed `devDependencies` is absent from the bundle.

I wrote this by hand because none of the Project Builder schematics covers a change to the sidebar footer.
