# Plan directive — schematic crystallization

A schematic is EXTRACTED from proven code, never invented ahead of it. Drive
this lifecycle from the plan's pattern inventory:

1. **Established pattern + repetition ahead** — the pattern has a proven,
   gates-green implementation in the tree (the Authors reference module
   counts) and this batch plus the remaining schedule repeat it 3 or more
   times: extract (or extend) a Project Builder schematic FROM that proven
   implementation before building the repeats, then generate them with it.
   The pbuilder skill in `.claude/skills/pbuilder` explains how.
2. **Pattern not yet established** — no proven instance exists: build the
   first instance by hand and get it green. If it is the shape the schedule
   will keep repeating, declare it the rule in the plan; it becomes
   extractable the moment it is proven — later in this batch or at the next
   plan.
3. **Schematic falls short** — an upcoming entity deviates from what an
   existing schematic generates: decide at planning time whether to extend
   it or author a separate one. Never silently patch generated output.

**Granularity**: one schematic per atomic pattern — never a master generator
parameterized for everything. Small schematics are testable in isolation and
cheap to extend; when a shape diverges beyond a few variation points, prefer
a sibling schematic (rule 3) over piling options onto an existing one.

Record every decision in the plan file under `## Schematic decisions`, one
row per pattern: pattern → established? → action (extract | extend | new |
defer | none) → rationale (proven instance, expected repetitions, variation
points the schematic must parameterize).
