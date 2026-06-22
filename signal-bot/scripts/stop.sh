#!/usr/bin/env bash
# Stop all Signal Bot services
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"
echo "[stop] Stopping Signal Bot services..."
docker compose down
echo "[stop] Done."
