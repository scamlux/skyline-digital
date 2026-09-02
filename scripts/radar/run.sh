#!/usr/bin/env bash
# Wrapper: load env from .env.local / .env, then run the radar CLI.
#   scripts/radar/run.sh --all
set -euo pipefail
cd "$(dirname "$0")/../.."
set -a
[ -f .env.local ] && . ./.env.local
[ -f .env ] && . ./.env
set +a
exec npm run radar -- "$@"
