Authors get an optional **Website** field (`website`).

- When set, it must be a valid URL; an invalid one shows `Must be a valid URL` under the input.
- The create and edit forms have a `Website` input marked optional, like Country. Leaving it empty saves the author without it.
- The mock API stores it on create and on update. Surrounding spaces are trimmed and an empty value is stored as not set.
- The author detail page shows it under the label `Website`, with `—` when it is not set.

Keep the existing tests passing and add tests for the new field. When you are done, `pnpm typecheck`, `pnpm lint` and `pnpm test:run` pass.
