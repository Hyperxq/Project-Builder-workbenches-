#!/bin/bash
# Usage: arm-sweep.sh <workbench> <arm> <service> <model> <sweep-id> <batch...>
# Runs bench.sh for one arm, one batch after another; "-" as batch means a full-sweep run.
set -uo pipefail
WB=$1 ARM_NAME=$2 SERVICE=$3 MODEL=$4 SWEEP=$5
shift 5
cd "$(dirname "$0")"
LOG_DIR="${LOG_DIR:-$PWD/logs}"
mkdir -p "$LOG_DIR"

export WORKBENCH=$WB ARM=$ARM_NAME BENCH_MODEL=$MODEL SWEEP_ID=$SWEEP BENCH_ATTEMPT=1
export BENCH_PROTOCOL="bench.sh clean-room · @pbuilder/sdk 0.10.0 · builder CLI 0.9.11 · skill dialects 0.10 · ${PROTOCOL_NOTE:-claude-opus-5-5 everywhere}"
export HOST_OS="macOS (Darwin $(uname -r)) · Apple Silicon"
export DOCKER_VERSION="Docker Engine $(docker info --format '{{.ServerVersion}}')"
# Separate compose projects: WB01 arms would otherwise share one MongoDB.
project="bench-${WB:10:2}-${ARM_NAME%%-*}"

for batch in "$@"; do
  args=(); [ "$batch" != "-" ] && args=("$batch")
  echo "[$(date +%H:%M:%S)] $WB $ARM_NAME batch $batch start"
  docker compose -p "$project" run --rm -T "$SERVICE" bench.sh ${args[@]+"${args[@]}"} \
    > "$LOG_DIR/${WB:0:12}_${ARM_NAME}_batch${batch}.log" 2>&1
  echo "[$(date +%H:%M:%S)] $WB $ARM_NAME batch $batch exit $?"
done
docker compose -p "$project" down -v > /dev/null 2>&1
