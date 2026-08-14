**Batch 3 is done — all four gates green.**

| Gate | Result |
|---|---|
| `pnpm typecheck` | pass |
| `pnpm lint` | pass |
| `pnpm test:run` | 30 files / 244 tests |
| `pnpm test:e2e` | 80 tests |

Baseline before the batch was 21 files / 156 tests and 53 e2e tests.

**Phase 1 — plan.** `plans/batch-3.md` records the module file lists, the `scout`'s pattern inventory (what already exists vs. what is genuinely new, with file:line evidence), the delegation waves, and the verification plan. `plan-directives/` doesn't exist, so there were no external directives. The scout confirmed three genuinely new shapes: currency formatting (no formatter existed anywhere), a list-row mutation (no list page had ever mutated anything but delete), and a field-to-field `.refine()`.

**Phase 2 — build.** Wave 0 was mine (`src/shared/lib/currency.ts`); waves 1–3 went to `mechanic` serially — Vehicle [T1], Invoice [T2], Payment [T2] — since every module edits the same five shared files. Each delegation carried the exact file list, the reference file to mirror per file, the spec lines, and the design decisions, so no mechanic made a design call.

Quirks implemented and tested: Invoice's supplier combobox (unknown id → field error, never a toast), the inline Paid switch (PATCH + invalidate, proven to keep page/search state from `/invoices?page=2`, with a forced 500 proving the failure toast and revert), USD currency in list and detail; Payment's `processedAt`-required-when-`confirmed` on client *and* server including PATCH-after-merge, the first RHF-bound `Select`, and the 4-way `?method` URL filter.

**Phase 3 — verify.** Two fixes were mine after reviewing the deliveries: an order-dependent "no toast" assertion in `invoice-form.test.tsx`, rewritten to be keyed to its own invoice number; and a React controlled/uncontrolled warning the e2e log surfaced on the new form `Select`, fixed with `value={field.value ?? ''}` and re-verified as gone.

One deviation worth flagging: I specified the `processedAt` label as exactly "Processed at", but the "(optional)" hint sits inside the `<Label>` per the existing Book/Review idiom, so the accessible name is "Processed at (optional)" and the tests query it with `{ exact: false }` — matching `book-form.test.tsx:27` rather than my wording.
