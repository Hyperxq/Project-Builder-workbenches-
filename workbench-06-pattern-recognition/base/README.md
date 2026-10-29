# react-admin

React 19 admin app for Project Builder Workbench 06. The backend is fully
simulated with MSW v2 (architecture from
[mock-mode-workshop](https://github.com/Hyperxq/mock-mode-workshop)); the
design language is Linear (`DESIGN.md`); conventions and architecture live in
`AGENTS.md` — read both before touching code.

## Run

```bash
pnpm install
pnpm dev:mock     # http://localhost:3010 — MSW intercepts everything
```

## Gates

```bash
pnpm typecheck && pnpm lint && pnpm test:run && pnpm test:e2e
```

## Task

Small product changes, one per session. Each session's prompt describes
one change.
