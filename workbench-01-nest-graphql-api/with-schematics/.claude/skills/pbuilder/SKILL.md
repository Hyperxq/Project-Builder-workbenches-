---
name: pbuilder
description: Project Builder — the `builder` CLI and @pbuilder/sdk. Routes to how to run a schematic, how to pick one for a task, and when to author a new one. Load before generating code in this workspace, before hand-writing anything that looks like a repeated pattern, and whenever a `builder` command fails.
---
# Project Builder — agent router

**Mindset**: where a pattern repeats, code is GENERATED. `project-builder.json`
registers collections of schematics — prefer running one over hand-writing.

## Load ONE file, act on it, then come back

| If you are about to… | Load | Not for |
|---|---|---|
| write code, unsure a generator exists | [choose.md](choose.md) | running one |
| run a schematic you picked, or recover a failed `execute` | [use.md](use.md) | picking one |
| author a schematic, or nothing fitted a repeated pattern | [create.md](create.md) | one-off code |

If no row matches, you do not need this skill.

## Guardrails — read before running anything

Four commands work today: `builder init`, `builder new schematic <name>`,
`builder new collection <name>`, `builder execute <collection>:<schematic>
--<input>=<value>`. Everything else in `--help` (`add`, `info`, `sync`,
`validate`, `remove`, `skill update`) is a stub that exits not-implemented.

Run `builder execute` STANDALONE, one per shell call — never in a for-loop,
pipe or `&&` chain, or the native engine dies with a system fault. There is no
working dry-run: every `builder execute` writes for real.

These four files are written by `builder init` — do not hand-edit them; put
project-specific guidance in AGENTS.md instead. `builder init --force`
re-applies them and upgrades `project-builder.json` in place, preserving
registered collections, dependencies and settings.
