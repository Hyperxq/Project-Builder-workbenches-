#!/bin/bash
# Standardized measured run: one entity, one arm, full metrics.
# Invoked via compose: ARM=... docker compose run --rm runner bench.sh <entity>
set -uo pipefail

# A measured run against pre-existing work measures nothing — the agent finds
# it done, every gate passes on old code, and the numbers lie. The target
# collections come from the benchmark file itself (authors is the reference).
while read -r collection; do
  if [ -d "src/${collection}" ]; then
    echo "ERROR: src/${collection} already exists — the arm is dirty." >&2
    echo "Clean it from the repo root first:" >&2
    echo "  git checkout -- <workbench>/${ARM} && git clean -fd <workbench>/${ARM}" >&2
    exit 1
  fi
done < <(grep -oP '(?<=collection: )[a-z]+' entities-benchmark.txt | grep -vx 'authors')

STAMP=$(date +%Y-%m-%d_%H-%M)
RUN_DIR="/results/${STAMP}_${ARM}"
mkdir -p "$RUN_DIR"

# The one canonical prompt — verbatim from the workbench README, zero hints.
PROMPT="Follow the instruction listed on entities-benchmark.txt"

count_files() { find src test bruno -type f 2>/dev/null | wc -l; }
count_loc() { find src test bruno -type f -print0 2>/dev/null | xargs -0 cat 2>/dev/null | wc -l; }

files_before=$(count_files)
loc_before=$(count_loc)

start=$(date +%s)
# stream-json + --verbose emits every event live; tee keeps the full stream as
# evidence while bench-watch pretty-prints progress to the terminal.
claude -p "$PROMPT" \
  --strict-mcp-config --dangerously-skip-permissions \
  --output-format stream-json --verbose \
  2> "$RUN_DIR/claude-stderr.log" \
  | tee "$RUN_DIR/claude-stream.jsonl" \
  | node /usr/local/bin/bench-watch.js
agent_exit=${PIPESTATUS[0]}
wall_s=$(( $(date +%s) - start ))

files_after=$(count_files)
loc_after=$(count_loc)

gate() {
  local name=$1; shift
  echo "[gate] ${name}…" >&2
  local t0=$(date +%s)
  local pass=false
  "$@" > "$RUN_DIR/gate-${name}.log" 2>&1 && pass=true
  echo "[gate] ${name}: $($pass && echo pass || echo FAIL)" >&2
  echo "{\"gate\":\"${name}\",\"pass\":${pass},\"seconds\":$(( $(date +%s) - t0 ))}"
}

{
  gate tsc pnpm exec tsc --noEmit
  gate lint pnpm lint
  gate test pnpm test
  gate e2e pnpm test:e2e
} > "$RUN_DIR/gates.jsonl"

RUN_DIR="$RUN_DIR" ARM="$ARM" AGENT_EXIT="$agent_exit" WALL_S="$wall_s" \
FILES_BEFORE="$files_before" FILES_AFTER="$files_after" LOC_BEFORE="$loc_before" LOC_AFTER="$loc_after" \
node <<'EOF'
const fs = require('fs');
const dir = process.env.RUN_DIR;

// The final telemetry is the stream's last `result` event.
let agent = {};
try {
  const lines = fs.readFileSync(`${dir}/claude-stream.jsonl`, 'utf8').trim().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const e = JSON.parse(lines[i]);
      if (e.type === 'result') { agent = e; break; }
    } catch { /* skip partial line */ }
  }
} catch { /* agent crashed before emitting anything — bench.json still records the run */ }

const gates = fs.readFileSync(`${dir}/gates.jsonl`, 'utf8')
  .trim().split('\n').filter(Boolean).map(l => JSON.parse(l));

const bench = {
  date: new Date().toISOString(),
  arm: process.env.ARM,
  task: 'entities-benchmark full sweep',
  agent: {
    exit_code: Number(process.env.AGENT_EXIT),
    wall_seconds: Number(process.env.WALL_S),
    api_seconds: agent.duration_api_ms != null ? Math.round(agent.duration_api_ms / 1000) : null,
    num_turns: agent.num_turns ?? null,
    tokens: agent.usage ?? null,
    cost_usd: agent.total_cost_usd ?? null,
    session_id: agent.session_id ?? null,
  },
  definition_of_done: {
    first_attempt_pass: gates.every(g => g.pass),
    gates,
  },
  output: {
    files_created: Number(process.env.FILES_AFTER) - Number(process.env.FILES_BEFORE),
    loc_delta: Number(process.env.LOC_AFTER) - Number(process.env.LOC_BEFORE),
  },
};

fs.writeFileSync(`${dir}/bench.json`, JSON.stringify(bench, null, 2) + '\n');

const t = bench.agent.tokens || {};
console.log(`\n=== ${bench.arm} — full sweep ===`);
console.log(`wall: ${bench.agent.wall_seconds}s  turns: ${bench.agent.num_turns}  cost: $${bench.agent.cost_usd ?? '?'}`);
console.log(`tokens in/out: ${t.input_tokens ?? '?'}/${t.output_tokens ?? '?'}  cache read: ${t.cache_read_input_tokens ?? '?'}`);
console.log(`DoD first attempt: ${bench.definition_of_done.first_attempt_pass ? 'PASS' : 'FAIL'} (${gates.map(g => `${g.gate}:${g.pass ? 'ok' : 'FAIL'}`).join(' ')})`);
console.log(`results: ${dir}/bench.json`);
EOF
