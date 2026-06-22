#!/usr/bin/env bash
# Signal Bot Desktop Launcher — starts all services via docker-compose
# Usage: ./scripts/launch.sh [--detach] [--no-browser]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$ROOT_DIR/logs"
ENV_FILE="$ROOT_DIR/.env"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
ENGINE_URL="http://localhost:8000"
WEB_URL="http://localhost:3000"
DETACH=false
NO_BROWSER=false

# Parse args
for arg in "$@"; do
  case $arg in
    --detach) DETACH=true ;;
    --no-browser) NO_BROWSER=true ;;
  esac
done

# Color helpers
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[launch]${NC} $*"; }
warn()  { echo -e "${YELLOW}[launch]${NC} $*"; }
error() { echo -e "${RED}[launch]${NC} $*" >&2; }

# Preflight checks
check_docker() {
  if ! command -v docker &>/dev/null; then
    error "Docker not found. Install Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
  fi
  if ! docker info &>/dev/null 2>&1; then
    error "Docker daemon not running. Start Docker Desktop first."
    exit 1
  fi
  info "Docker OK"
}

check_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    warn ".env not found. Copying from .env.example..."
    if [[ -f "$ROOT_DIR/.env.example" ]]; then
      cp "$ROOT_DIR/.env.example" "$ENV_FILE"
      warn "Please edit $ENV_FILE and add your API keys, then re-run this script."
      exit 0
    else
      error ".env.example not found either. Cannot continue."
      exit 1
    fi
  fi
  info ".env OK"
}

wait_healthy() {
  local url="$1" service="$2" max_wait=120 interval=3
  info "Waiting for $service at $url ..."
  local elapsed=0
  while [[ $elapsed -lt $max_wait ]]; do
    if curl -sf "$url/health" &>/dev/null; then
      info "$service is healthy"
      return 0
    fi
    sleep $interval
    elapsed=$((elapsed + interval))
  done
  warn "$service did not become healthy in ${max_wait}s (continuing anyway)"
  return 0
}

open_browser() {
  if $NO_BROWSER; then return; fi
  info "Opening dashboard at $WEB_URL ..."
  case "$(uname -s)" in
    Darwin) open "$WEB_URL" ;;
    Linux)  xdg-open "$WEB_URL" 2>/dev/null || true ;;
    CYGWIN*|MINGW*) start "$WEB_URL" ;;
  esac
}

# Main
mkdir -p "$LOG_DIR"
check_docker
check_env

info "Starting Signal Bot services..."
cd "$ROOT_DIR"

if $DETACH; then
  docker compose -f "$COMPOSE_FILE" up -d --build
  wait_healthy "$ENGINE_URL" "Engine"
  open_browser
  info "Signal Bot running in background."
  info "  Dashboard: $WEB_URL"
  info "  Engine API: $ENGINE_URL"
  info "  Logs: docker compose logs -f"
  info "  Stop: ./scripts/stop.sh"
else
  # Foreground: tail logs
  docker compose -f "$COMPOSE_FILE" up --build &
  COMPOSE_PID=$!
  wait_healthy "$ENGINE_URL" "Engine"
  open_browser
  info "Signal Bot running (Ctrl+C to stop)"
  wait $COMPOSE_PID
fi
