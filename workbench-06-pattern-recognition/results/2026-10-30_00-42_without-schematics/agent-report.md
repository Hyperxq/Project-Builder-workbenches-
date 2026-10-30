I added the optional Website field to authors. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (27 tests, 11 of them new). I didn't run `pnpm test:e2e` and didn't add an e2e check for Website.

**What changed**
- **Rule:** `website` is optional, and when set it must be an `http(s)` URL; otherwise the message is `Must be a valid URL`. I limited it to `http`/`https` since it's meant to be a website, so something like `mailto:` is rejected too.
- **Forms:** the create and edit forms have a `Website (optional)` input after Country. Spaces around the value are trimmed, and an empty input saves the author without a website.
- **Mock API:** create and update store the trimmed value, and an empty or blank value is stored as not set. It also rejects an invalid URL with a 400 error, which you didn't ask for but matches how the mock checks other fields.
- **Detail page:** shows `Website`, or `—` when it isn't set.
- **Sample data:** Gabriel García Márquez now has `https://macondo.co`, so the detail page has an example with a website.

**One change outside the field itself:** updates only change the fields that are sent, and an empty input becomes "no value", which never gets sent. So clearing the website on the edit form would have quietly kept the old one. The edit page now sends an empty value for a cleared website so the mock removes it. **Country has the same bug:** clearing it on the edit form doesn't remove it. I left that alone since it's outside this change.

**Tests**
- **Mock API** (`mocks/domains/authors.mock.spec.ts`): trimming on create, a blank value stored as not set, the 400 for an invalid URL, and setting then clearing the website on update.
- **Screens** (new `author-website.test.tsx`): the input is marked optional, the invalid-URL message blocks submit, creating an author with and without a website, the detail page showing the website or `—`, and setting and clearing it from the edit form.
