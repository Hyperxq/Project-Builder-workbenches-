I added the `reviews` feature as a full slice, and `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repository root. `npx nx sync:check` reports the project references are up to date. Nothing is committed.

**Setup.** The `default:feature` schematic generated the three projects and the empty gateway controller. It also wired them into the shell, the gateway module, the workspaces and the project references, on ports 3104 (microfrontend) and 4104 (service). Its config files match the `orders` ones apart from the name. I then ran `npm install`.

**What I wrote:**
- **Contract** (`@storefront/reviews-contract`): the review type (author, rating, comment, date), the product-reviews type (reviews plus average rating and count), the request types, the two message patterns (`reviews.list`, `reviews.add`), and the rating and length limits so the service and the form use the same rules.
- **Service**: reviews are held in memory by product id and listed newest first. The average is rounded to one decimal and is `null` when a product has no reviews. Bad input is rejected with a 400 that crosses TCP correctly: a blank or over-long author (80 characters) or comment (2000), or a rating that isn't a whole number from 1 to 5. Author and comment are trimmed.
- **Gateway**: `GET /api/reviews/:productId` and `POST /api/reviews/:productId`. Listing never answers 404; a product with no reviews just returns an empty list. Adding passes on only the author, rating and comment, and the product id always comes from the URL.
- **Microfrontend**: the shopper types a product id and sees the average, the count and each review (author, stars, date, comment). A form adds a review and then reloads the list. Load errors and the service's 400 reasons are shown on screen. It uses the `@storefront/ui` components.
- **README**: new rows in the layout table, a conventions entry for the reviews routes, and the two serve commands.

**Tests:**
- **Service:** 17 tests covering adding, trimming, the average, ordering, keeping products separate, each kind of bad input, and the message patterns.
- **Gateway:** the routes with the client mocked, plus a small HTTP app on a random port that confirms a 400 from the service reaches the shopper as HTTP 400 with its reason.
- **Microfrontend:** 6 tests with the client mocked.

**Choices to review:**
- The service doesn't check that the product id exists in the catalog, so reviews can be stored under any id. Checking would mean the reviews service calling the catalog service.
- `@storefront/ui` has no textarea, so the comment box is a plain `<textarea>` styled like the `Input` component.
- I changed the generated client to send `Content-Type` only on POST, so plain GETs don't trigger a cross-origin preflight check.
- Prettier widened the README layout table to fit the longer contract row, so the diff touches every row of that table.
- Lint reports one warning in the new service: an unused `eslint-disable` in `apps/reviews-service/jest.config.cts`. That file is identical to the orders service's copy, and the existing projects report the same warning, so I left it as is.
