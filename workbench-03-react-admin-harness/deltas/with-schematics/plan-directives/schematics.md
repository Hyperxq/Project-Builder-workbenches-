# Plan directive — schematic crystallization

During PLAN, decide what deserves a schematic before anything is built:

- Count expected repetitions of each pattern across THIS batch plus the
  remaining schedule in `entities-benchmark.txt`.
- A pattern that will repeat **3 or more times**: author (or extend) a
  Project Builder schematic for it BEFORE implementing — the pbuilder skill
  in `.claude/skills/pbuilder` explains how — then generate those modules
  with it instead of writing them by hand.
- Below the threshold, or one-off shapes: implement directly. Do NOT
  schematize them.

Record every decision in the plan file under `## Schematic decisions`, one
row per pattern: pattern → schematic yes/no → rationale (expected
repetitions, variation points the schematic must parameterize).
