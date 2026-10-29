The sidebar footer shows the app version, read from `package.json`, as `v<version>` (today `v1.4.0`), next to the mock indicator. Do not copy the number into the source: when `package.json` changes, the footer follows.

Add a test for it. When you are done, `pnpm typecheck`, `pnpm lint` and `pnpm test:run` pass.
