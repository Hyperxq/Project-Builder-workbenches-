#!/bin/bash
# Standardized measured run: one arm, full metrics.
#   Nest workbench (01):  ARM=... docker compose run --rm runner bench.sh
#   Web workbench (02+):  ARM=... docker compose run --rm runner-web bench.sh <batch>
set -uo pipefail

# The mounted arm tells us which flavour of workbench this is.
if [ -f vite.config.ts ]; then KIND=web; else KIND=nest; fi

if [ "$KIND" = web ]; then
  # Web workbenches run batch by batch: earlier batches MUST stay in the
  # tree (the amortization thesis lives there); only THIS batch must be
  # absent. The schedule at the bottom of entities-benchmark.txt is the
  # source of truth: "Batch 1: Book [T1], Category [T1], Review [T2]".
  BATCH="${1:?usage: bench.sh <batch-number> — web workbenches run batch by batch}"
  names=$(grep -oP "^\s*Batch ${BATCH}: \K.*" entities-benchmark.txt | grep -oP '\b[A-Z]\w+(?= \[T\d\])' || true)
  if [ -z "$names" ]; then
    echo "ERROR: batch ${BATCH} not found in entities-benchmark.txt" >&2
    exit 1
  fi

  while read -r name; do
    plural=$(grep -oP "\d+\. \[T\d\] ${name} \(\K[a-z]+" entities-benchmark.txt)
    if [ -d "src/features/${plural}" ] || [ -e "mocks/domains/${plural}.mock.ts" ]; then
      echo "ERROR: ${name} (${plural}) already exists — batch ${BATCH} already ran in this arm." >&2
      echo "For a fresh experiment, clean the arm from the repo root:" >&2
      echo "  git checkout -- <workbench>/${ARM} && git clean -fdx <workbench>/${ARM}" >&2
      exit 1
    fi
  done <<< "$names"

  TASK="batch ${BATCH}"
  RUN_SUFFIX="_batch${BATCH}"
  # Minimal prompt — the spec file carries the task, AGENTS.md the rules.
  # The strategy sentence is the experiment's ONLY variable between arms.
  PROMPT="Implement Batch ${BATCH} as specified in entities-benchmark.txt."
  if [ "${ARM}" = with-schematics ]; then
    PROMPT+=" Use Project Builder schematics: if no suitable schematic exists in schematics/ yet, author it first (the pbuilder skill in .claude/skills/pbuilder explains how), then generate every entity with it."
  fi
  COUNT_PATHS=(src mocks e2e schematics)
else
  # Nest workbench: single full-sweep run; any benchmark entity present
  # means the arm is dirty and the numbers would lie.
  while read -r collection; do
    if [ -d "src/${collection}" ]; then
      echo "ERROR: src/${collection} already exists — the arm is dirty." >&2
      echo "Clean it from the repo root first:" >&2
      echo "  git checkout -- <workbench>/${ARM} && git clean -fd <workbench>/${ARM}" >&2
      exit 1
    fi
  done < <(grep -oP '(?<=collection: )[a-z]+' entities-benchmark.txt | grep -vx 'authors')

  TASK="entities-benchmark full sweep"
  RUN_SUFFIX=""
  PROMPT="Follow the instruction listed on entities-benchmark.txt"
  COUNT_PATHS=(src test bruno)
fi

STAMP=$(date +%Y-%m-%d_%H-%M)
RUN_DIR="/results/${STAMP}_${ARM}${RUN_SUFFIX}"
mkdir -p "$RUN_DIR"

count_files() { find "${COUNT_PATHS[@]}" -type f 2>/dev/null | wc -l; }
count_loc() { find "${COUNT_PATHS[@]}" -type f -print0 2>/dev/null | xargs -0 cat 2>/dev/null | wc -l; }

files_before=$(count_files)
loc_before=$(count_loc)

start=$(date +%s)
# stream-json + --verbose emits every event live; tee keeps the full stream as
# evidence while bench-watch pretty-prints progress to the terminal.
# Pinned model: arms are only comparable across sweeps if the model is held
# constant — the CLI default drifts with releases. Recorded in bench.json.
BENCH_MODEL="${BENCH_MODEL:-claude-sonnet-5}"
# Optional reasoning capture: BENCH_THINKING=summary|full makes the agent's
# thinking visible in claude-stream.jsonl (billing is unchanged — thinking is
# billed whether displayed or not; streams get larger). Requires CLI >= 2.1.177.
[ -n "${BENCH_THINKING:-}" ] && export CLAUDE_CODE_THINKING_DISPLAY="$BENCH_THINKING"
claude -p "$PROMPT" \
  --model "$BENCH_MODEL" \
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

if [ "$KIND" = web ]; then
  {
    gate typecheck pnpm typecheck
    gate lint pnpm lint
    gate test pnpm test:run
    gate e2e pnpm test:e2e
  } > "$RUN_DIR/gates.jsonl"
else
  {
    gate tsc pnpm exec tsc --noEmit
    gate lint pnpm lint
    gate test pnpm test
    gate e2e pnpm test:e2e
  } > "$RUN_DIR/gates.jsonl"
fi

RUN_DIR="$RUN_DIR" ARM="$ARM" TASK="$TASK" AGENT_EXIT="$agent_exit" WALL_S="$wall_s" BENCH_MODEL="$BENCH_MODEL" \
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
  task: process.env.TASK,
  agent: {
    model: process.env.BENCH_MODEL,
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
console.log(`\n=== ${bench.arm} — ${bench.task} ===`);
console.log(`wall: ${bench.agent.wall_seconds}s  turns: ${bench.agent.num_turns}  cost: $${bench.agent.cost_usd ?? '?'}`);
console.log(`tokens in/out: ${t.input_tokens ?? '?'}/${t.output_tokens ?? '?'}  cache read: ${t.cache_read_input_tokens ?? '?'}`);
console.log(`DoD first attempt: ${bench.definition_of_done.first_attempt_pass ? 'PASS' : 'FAIL'} (${gates.map(g => `${g.gate}:${g.pass ? 'ok' : 'FAIL'}`).join(' ')})`);
console.log(`results: ${dir}/bench.json`);
EOF
