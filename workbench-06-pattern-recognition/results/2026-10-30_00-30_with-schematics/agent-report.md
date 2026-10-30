The author detail page now has a `Copy email` button next to the email. Clicking it copies the email with `navigator.clipboard.writeText` and shows the `Email copied` toast. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (77 tests). I didn't run `pnpm test:e2e`, the fourth check AGENTS.md lists.

- **Change:** in `src/features/authors/presentation/author-detail-page.tsx`, the button is a small ghost button with a copy icon, on the same line as the email.
- **Addition you didn't ask for:** if the browser refuses the copy (for example, clipboard permission denied), it shows an error toast, `Could not copy email`. Without this, a failed copy would do nothing silently.
- **Tests:** `author-copy-email.test.tsx` renders the real app on an author's page and clicks the button.
  - One test checks that `writeText` received the right email, that the clipboard now holds it, and that `Email copied` appears.
  - The other makes the clipboard refuse and checks that the error toast appears.

The second test can't check that `Email copied` is absent: toasts persist from one test to the next, so the first test's toast is still on screen. I removed that check rather than add code to clear toasts between tests.

None of the project's schematics covered a button like this, so I wrote it by hand.
