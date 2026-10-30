The three gates pass: `pnpm typecheck`, `pnpm lint`, and `pnpm test:run` (25 tests, 3 files). I didn't run or change the Playwright e2e suite, which AGENTS.md lists as a fourth gate.

**What changed**
- **Domain** (`author.ts`): `website` is an optional field checked with Zod's `z.httpUrl('Must be a valid URL')`. That accepts `http`/`https` URLs with a real domain name, so `javascript:…` or `http://localhost` are rejected.
- **Form** (`author-form.tsx`): a `Website (optional)` input after Country, built the same way. Spaces around the value are trimmed and an empty input counts as not set, so leaving it blank saves the author without a website. An invalid value shows `Must be a valid URL` under the input.
- **Detail page**: a `Website` entry after Country, showing `—` when it's not set. It's plain text, not a link.
- **Mock API** (`authors.mock.ts`): create and update both trim the website and store an empty value as not set. I also made both return 400 for an invalid URL, using the same Zod rule as the form.

**Clearing the website on edit:** updates only change the fields they're sent, and an empty form field gets left out of the request entirely. So clearing the website in the edit form would have quietly kept the old value. To fix this, the edit page sends `website: ''` when the field is empty, and the mock API stores that as not set.

**Tests added**
- **Mock API** (4 tests): the website is trimmed on create; a blank one is stored as not set; an invalid one gets a 400 on create and on update; updates can set it, leave it alone and clear it.
- **Page tests** (5 tests): the input is labelled as optional; an invalid URL shows the error and the form doesn't submit; creating with a website shows it on the detail page; `—` shows when it's not set; setting and then clearing it through the edit form works.

**Not fixed:** Country has the same problem on edit. Clearing it doesn't remove the saved value, for the same reason as above. I left it alone because it's outside this change, but it's the same one-line fix if you want it.
