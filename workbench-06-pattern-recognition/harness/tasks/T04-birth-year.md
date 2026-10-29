Authors get an optional **Birth year** field (`birthYear`).

- When set, it must be a whole number from 1000 to 2100; any other value shows `Must be a year from 1000 to 2100` under the input. The input is a number input.
- The create and edit forms have a `Birth year` input marked optional, like Country. Leaving it empty saves the author without it.
- The mock API stores it on create and on update. It is stored as a number.
- The author detail page shows it under the label `Birth year`, with `—` when it is not set.

Keep the existing tests passing and add tests for the new field. When you are done, `pnpm typecheck`, `pnpm lint` and `pnpm test:run` pass.
