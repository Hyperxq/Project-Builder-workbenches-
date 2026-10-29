The Authors card on the Overview page (`/`) shows how many authors exist, as `<n> authors` (for example `24 authors`), below its description. It reads the total from the authors list endpoint, so it changes when authors are created or deleted. While the count loads, the card shows no number.

Add a test for the count. When you are done, `pnpm typecheck`, `pnpm lint` and `pnpm test:run` pass.
