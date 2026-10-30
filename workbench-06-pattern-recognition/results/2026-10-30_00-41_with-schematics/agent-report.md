The author detail page now has a `Copy email` button next to the email. Clicking it copies the author's email with `navigator.clipboard.writeText` and shows the toast `Email copied`. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (56 tests). I didn't run the e2e suite (`pnpm test:e2e`), which AGENTS.md lists as a fourth check.

- **Page** (`src/features/authors/presentation/author-detail-page.tsx`): the button is small and low-emphasis, with a copy icon, and sits in the Email row.
- **Something I added:** if the browser blocks clipboard access, the page shows an error toast, `Could not copy email`, rather than failing silently. You didn't ask for this; easy to remove or reword.
- **Test** (`author-detail-page.test.tsx`): it opens author 1's real detail page, clicks `Copy email`, and checks that `writeText` received `gabo@macondo.co` and that the `Email copied` toast appears.

None of the project's code generators covered this kind of change, so I wrote it by hand.
