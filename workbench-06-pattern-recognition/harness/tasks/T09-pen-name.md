Authors get an optional **Pen name** field (`penName`).

- When set, it is a non-empty text.
- The create and edit forms have a `Pen name` input marked optional, like Country. Leaving it empty saves the author without it.
- The mock API stores it on create and on update. Surrounding spaces are trimmed and an empty value is stored as not set.
- The author detail page shows it under the label `Pen name`, with `—` when it is not set.

Keep the existing tests passing and add tests for the new field. When you are done, `pnpm typecheck`, `pnpm lint` and `pnpm test:run` pass.
