Authors get an optional **Bio** field (`bio`).

- When set, it is at most 500 characters; a longer one shows `Must be at most 500 characters` under the input.
- The create and edit forms have a `Bio` input marked optional, like Country. Leaving it empty saves the author without it.
- The mock API stores it on create and on update. Surrounding spaces are trimmed and an empty value is stored as not set.
- The author detail page shows it under the label `Bio`, with `—` when it is not set.

Keep the existing tests passing and add tests for the new field. When you are done, `pnpm typecheck`, `pnpm lint` and `pnpm test:run` pass.
