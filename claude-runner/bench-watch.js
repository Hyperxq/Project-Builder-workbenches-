// Live progress for measured runs: pretty-prints the agent's stream-json
// events (stdin) so you can watch what it is doing without reading raw JSONL.
const rl = require('readline').createInterface({ input: process.stdin });

rl.on('line', (line) => {
  let e;
  try { e = JSON.parse(line); } catch { return; }

  if (e.type === 'assistant') {
    for (const c of e.message?.content ?? []) {
      if (c.type === 'tool_use') {
        const i = c.input ?? {};
        const detail = i.file_path ?? i.command ?? i.description ?? i.pattern ?? '';
        console.log(`  [${c.name}] ${String(detail).slice(0, 120)}`);
      } else if (c.type === 'text' && c.text?.trim()) {
        console.log(`» ${c.text.trim().slice(0, 200).replace(/\n/g, ' ')}`);
      }
    }
  } else if (e.type === 'result') {
    const wall = Math.round((e.duration_ms ?? 0) / 1000);
    console.log(`\n[agent done] turns=${e.num_turns} wall=${wall}s cost=$${e.total_cost_usd ?? '?'}`);
  }
});
