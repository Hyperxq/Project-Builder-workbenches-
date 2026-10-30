The author detail page now has a `Copy email` button next to the email. Clicking it copies the author's email with `navigator.clipboard.writeText` and shows the `Email copied` toast. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (87 tests). I didn't run `pnpm test:e2e`, which AGENTS.md also lists as a gate.

- **Page:** the change is in `author-detail-page.tsx`. The button is small and low-key, with a copy icon, and sits in the same row as the email address.
- **Something I added that you didn't ask for:** if the browser refuses the copy (for example, permission denied), the page shows an error toast, `Could not copy email`, instead of failing silently.
- **Tests:** the new file `author-copy-email.test.tsx` has two tests. The first opens author 1, clicks the button, and checks that `gabo@macondo.co` was passed to `writeText`, ended up on the clipboard, and that `Email copied` appears. The second makes the copy fail and checks for the error toast.
- **Test setup:** toasts were carrying over from one test to the next, so a leftover `Email copied` broke the second test on the first run. The test file now clears all toasts after each test.
