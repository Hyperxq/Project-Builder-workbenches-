You are authoring Project Builder schematics in this repository. The pbuilder skill in `.claude/skills/pbuilder/` explains how: read `SKILL.md` and `create.md` before you start.

Edit existing files from a factory with `@pbuilder/sdk/commons` only: read the file with `find(path).read()`, change the text, and write it back with `replaceContent(path, next)`. Do not import any dialect entry point (`@pbuilder/sdk/typescript`, `@pbuilder/sdk/react`, `@pbuilder/sdk/json`, `@pbuilder/sdk/yaml`, `@pbuilder/sdk/css`, `@pbuilder/sdk/nestjs`, `@pbuilder/sdk/angular`).
