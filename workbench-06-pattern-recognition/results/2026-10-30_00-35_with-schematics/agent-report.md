Authors now have an optional **Birth year** field (`birthYear`). `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (35 tests), and I also ran `pnpm test:e2e`, which passes (7 tests).

I added it with the project's `author-field` schematic, set up as a numeric field, which changed these files:
- **Rule (`author.ts`):** a whole number from 1000 to 2100. Anything else, including decimals, shows `Must be a year from 1000 to 2100` under the input. I moved that message into one constant so it isn't repeated three times.
- **Forms (`author-form.tsx`):** a number input labelled `Birth year (optional)`, like Country. Leaving it empty saves the author without a birth year.
- **Mock API (`authors.mock.ts`):** stores the year as a number on create and on update.
- **Detail page:** shows it under `Birth year`, or `—` when it isn't set.

**Tests added:**
- **Mock API:** saving the year as a number on create and on update, and leaving it out when it isn't sent.
- **Forms and detail page:** the label and input type, rejecting `999`, `2101` and `1950.5`, accepting exactly 1000 and 2100, creating and editing an author with a year, and the `—` when it's not set.
- **End-to-end:** the existing edit test now also sets a birth year.

**Limitation:** once a birth year is saved, emptying the input on the edit form doesn't remove it. An empty input sends nothing, and the mock keeps the old value. Website and Country already work the same way through the form, so I left this as it is.

The mock API also doesn't check the year itself, the same as Website: only the form enforces 1000–2100. A request sent straight to the API could store an out-of-range value.
