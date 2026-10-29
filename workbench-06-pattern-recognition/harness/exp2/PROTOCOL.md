# Experiment 2 — does the agent automate a pattern on its own?

**Registered before any run.** Observational: one condition and no arms, so it stays out of `workbench.json` `experiments`, whose schema is A/B. The definitions below were fixed before the first sequence and `analyze.py` implements them as written.

## Question

When an agent has the option to author schematics but no rule telling it when to, does it notice that a change repeats and automate it? If it does, at which repetition, and does it use what it built?

## Condition

- Base: `base/`, the workbench 03 React admin with one entity (Authors) and the Project Builder toolchain. The pbuilder skill `builder init` writes for CLI 0.9.11 is present unchanged, and no schematic is registered. Its `create.md` carries the tool's own "Should you?" guidance (create a schematic when a shape already repeats, not for one-off work); that is part of the product being observed, and nothing in this experiment adds to it.
- Session context: `context.md`, which says the project has Project Builder installed and where its skill is. It does not say when to author a schematic, and the task prompts never mention schematics.
- Sequence: the ten prompts in `harness/tasks/sequence.json`, always in that order. P1 (an optional Author field) appears four times (T01, T04, T06, T09), P2 (a static page with a sidebar entry) three times (T02, T05, T08), and three one-off changes sit between them (T03, T07, T10).
- One headless session per task (`claude -p --bare`, `claude-opus-5-5`, `--max-budget-usd 10`) in one container per sequence. Sessions share no conversation. Each one finds the repository as the previous one left it, committed with the task's first line as the message.
- N = 10 sequences, run one at a time (`batch.sh`, which runs `harness/bin/run-sequence.sh exp2`), never in parallel.

## Measures, per sequence

| Measure | Definition |
|---|---|
| Schematic created in a task | A directory under `schematics/` that exists after the task's session and did not exist before it. |
| What a schematic automates | From the text of its non-test files and their paths. **P1** when it names at least two of `domain/author.ts`, `author-form.tsx`, `authors.mock.ts`, `author-detail-page.tsx`. **P2** when it names `app-sidebar` and `routes`. **Other** otherwise. |
| Automated | At least one schematic of that pattern was created in the sequence. |
| Created at occurrence | The occurrence of the pattern (1st, 2nd, …) in whose session the first such schematic appeared. A schematic created during a one-off task has no occurrence. |
| Used after creation | A later occurrence of the pattern whose session ran `builder execute` on that schematic. |
| False positive | A schematic classified as other, or created during a one-off task. |
| Correct | `harness/checker/check-task.sh`: typecheck, lint and the agent's tests pass, and so do the task's hidden tests. Earlier tasks' hidden tests that fail are recorded as regressions. |
| Cost and time | `total_cost_usd`, tokens, turns and wall seconds of each session. |

## Reported across the N sequences

Per pattern: the automation rate, the distribution of the occurrence at which it was automated, the rate of later occurrences that used the schematic, and the median cost and time of each occurrence. Also the total false positives and the share of correct tasks.

There is no directional hypothesis and no threshold. Whether automating pays off is experiment 3's question; this one reports what the agent does.

## Run it

```bash
harness/exp2/batch.sh                       # N=10 by default; logs under ~/pb-experiment/wb06/exp2
python3 -I harness/exp2/analyze.py          # writes results-recognition/
```

Forecast: about 100 sessions at roughly $1 each, so about $100 to $150 and several hours of wall time.
