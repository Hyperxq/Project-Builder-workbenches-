The Help page is live at `/help`, and the sidebar now ends with a `Help` entry that uses the `CircleHelp` icon and links to it. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (25 tests in 4 files). I didn't run the Playwright end-to-end tests (`pnpm test:e2e`), which you didn't ask for, and there is no browser test for this page.

**What changed:**
- **`src/features/help/presentation/help-page.tsx`**: the page itself, with the `Help` heading and the paragraph "Questions about the admin? Write to support@example.com." It uses the same layout as the Overview page.
- **`src/routes/help.tsx`**: a short route file that connects `/help` to the page.
- **`src/app/shell/app-sidebar.tsx`**: one new line adding `{ to: '/help', label: 'Help', icon: CircleHelp }` after Authors.
- **`src/features/help/presentation/help-page.test.tsx`**: two tests that run the real app. The first checks that the heading and paragraph appear at `/help`. The second checks that the sidebar's last link is `Help`, points to `/help`, and opens the page when clicked.

The email address is plain text, not a clickable `mailto:` link, because the request gave the paragraph as plain text. I also didn't add a card for Help on the Overview page; the project's guide only asks for those for data sections like Authors.
