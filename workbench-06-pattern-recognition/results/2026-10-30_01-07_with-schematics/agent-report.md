The Help page is live at `/help`, and the sidebar now ends with a `Help` entry linking to it with the `CircleHelp` icon. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (4 test files, 24 tests).

I used the project's existing `static-page` generator, which matched the request exactly. It made two changes:
- **New page, `src/routes/help.tsx`:** the `Help` heading with "Questions about the admin? Write to support@example.com." below it, styled like the other pages.
- **Sidebar, `src/app/shell/app-sidebar.tsx`:** the new entry after Overview and Authors.

**Test, `src/app/help.test.tsx`:** it renders the real app and checks two things:
- `/help` shows the heading and the paragraph.
- The last sidebar link is `Help`, points to `/help`, and clicking it opens the page.

I put the test in `src/app/` rather than `src/routes/`, because the router treats files in `src/routes/` as pages. `src/routeTree.gen.ts` updated itself during the build, but it isn't tracked by git, so it won't show up in the changes.

I didn't add a browser (Playwright) test, and I didn't run `pnpm test:e2e`, the fourth check AGENTS.md lists, since you only asked for the other three.
