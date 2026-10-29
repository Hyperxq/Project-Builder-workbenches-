You are authoring Project Builder schematics in this repository. The pbuilder skill in `.claude/skills/pbuilder/` explains how: read `SKILL.md` and `create.md` before you start.

Edit existing files from a factory with the `@pbuilder/sdk` dialects. Before each edit to an existing file, look up what you want to do in `.claude/skills/pbuilder/dialects.md` and use the op of the matching row. Use `.modify(ast => …)` or string surgery with `@pbuilder/sdk/commons` only for an edit no row covers.
