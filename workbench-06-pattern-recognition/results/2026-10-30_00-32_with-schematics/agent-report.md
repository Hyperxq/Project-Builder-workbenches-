Authors now have an optional **Website** field, and `pnpm typecheck`, `pnpm lint`, `pnpm test:run` and `pnpm test:e2e` all pass (22 unit and section tests, 7 e2e).

I added the field with the repo's `default:author-field` schematic, using the validation rule `z.url('Must be a valid URL')`. That changed four files:
- **`author.ts`**: `website` is optional, but when it's set it must be a valid URL.
- **`author-form.tsx`**: the create and edit forms have a `Website (optional)` input after Country. An empty input is saved without a website, and an invalid one shows `Must be a valid URL` under the input.
- **`authors.mock.ts`**: create and update trim surrounding spaces and store an empty value as not set.
- **`author-detail-page.tsx`**: a `Website` row shows the value, or `—` when it isn't set.

New tests:
- **Mock API** (`authors.mock.spec.ts`): trimming on create and update, a blank value stored as not set on create, and an empty value clearing the website on update.
- **Forms and detail page** (`author-form.test.tsx`): the optional label, the invalid-URL error that stops the form submitting, creating an author with a website and seeing it on the detail page, the `—` when it isn't set, and editing an existing author's website.
- **E2E** (`authors.spec.ts`): the existing edit test now also fills in Website and checks it appears.

One limitation, which Country has too: on the edit form, clearing a website that's already set doesn't remove it. The form leaves an empty field out of the request instead of sending an empty value, so the mock keeps the old one. Fixing it would mean changing how the form sends empty optional fields, which I didn't do here.
