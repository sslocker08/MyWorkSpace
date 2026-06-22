.PHONY: up down logs scan status build clean help up-fg logs-engine shell-engine migrate test

ENV_FILE := .env
COMPOSE  := docker compose

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

up: ## Start all services (build if needed)
	./scripts/launch.sh --detach

up-fg: ## Start all services in foreground (logs visible)
	./scripts/launch.sh

down: ## Stop all services
	./scripts/stop.sh

logs: ## Tail all service logs
	$(COMPOSE) logs -f

logs-engine: ## Tail engine logs only
	$(COMPOSE) logs -f engine

scan: ## Trigger a manual scan
	curl -sf -X POST http://localhost:8000/api/scanner/trigger | jq .

status: ## Check service health
	@echo "=== Engine ===" && curl -sf http://localhost:8000/health | jq . || echo "Engine not running"
	@echo "=== Signals ===" && curl -sf "http://localhost:8000/api/signals?limit=5" | jq '.total // "N/A"' || true

build: ## Rebuild Docker images without cache
	$(COMPOSE) build --no-cache

clean: ## Remove containers, volumes, orphans
	$(COMPOSE) down -v --remove-orphans

shell-engine: ## Open shell in engine container
	$(COMPOSE) exec engine bash

migrate: ## Run Alembic migrations
	$(COMPOSE) exec engine alembic upgrade head

test: ## Run engine tests
	$(COMPOSE) exec engine pytest tests/ -v --tb=short
