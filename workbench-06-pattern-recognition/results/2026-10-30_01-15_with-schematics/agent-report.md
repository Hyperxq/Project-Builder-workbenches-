The author detail page now has a `Copy email` button next to the email. Clicking it calls `navigator.clipboard.writeText` with the author's email and shows the `Email copied` toast. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (57 tests, including the new one). I didn't run the e2e suite (`pnpm test:e2e`), which AGENTS.md lists as a fourth gate.

- **The button** (`author-detail-page.tsx`): it's a small ghost button with a copy icon, matching the page's existing buttons. One addition you didn't ask for: if the browser refuses clipboard access, it shows the error toast `Could not copy email` instead of failing silently.
- **The test** (new file `author-detail-page.test.tsx`): it opens `/authors/1`, clicks `Copy email`, and checks three things: `writeText` was called with `gabo@macondo.co`, the `Email copied` toast appears, and the clipboard now holds that email. The clipboard here is the test library's stand-in, not a real browser clipboard.

None of the project's code generators covered this kind of change, so I wrote it by hand.
