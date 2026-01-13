# =============================================
# CodeCraft Gen-Z - Makefile
# =============================================
# Run `make help` to see available commands
# =============================================

.PHONY: help install dev build test lint up down logs db-reset clean

# Default target
.DEFAULT_GOAL := help

# Colors
BLUE := \033[34m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
NC := \033[0m # No Color

## help: Show this help message
help:
	@echo "$(BLUE)CodeCraft Gen-Z - Available Commands$(NC)"
	@echo ""
	@sed -n 's/^##//p' $(MAKEFILE_LIST) | column -t -s ':' | sed -e 's/^/ /'

# =============================================
# Installation
# =============================================

## install: Install all dependencies
install:
	@echo "$(GREEN)Installing backend dependencies...$(NC)"
	cd backend && npm install
	@echo "$(GREEN)Installing frontend dependencies...$(NC)"
	cd frontend && npm install 2>/dev/null || echo "$(YELLOW)Frontend not yet created$(NC)"
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

## install-backend: Install backend dependencies only
install-backend:
	cd backend && npm install

## install-frontend: Install frontend dependencies only
install-frontend:
	cd frontend && npm install

# =============================================
# Development
# =============================================

## dev: Start development environment (Docker + frontend)
dev: up-db
	@echo "$(GREEN)Starting backend in dev mode...$(NC)"
	cd backend && npm run dev &
	@echo "$(GREEN)Starting frontend...$(NC)"
	cd frontend && npm run dev 2>/dev/null || echo "$(YELLOW)Frontend not yet created$(NC)"

## dev-backend: Start backend in dev mode only
dev-backend:
	cd backend && npm run dev

## dev-frontend: Start frontend in dev mode only
dev-frontend:
	cd frontend && npm run dev

# =============================================
# Docker
# =============================================

## up: Start all Docker services
up:
	docker-compose -f infra/docker-compose.yml up -d
	@echo "$(GREEN)✓ All services started$(NC)"
	@echo "$(BLUE)API: http://localhost:8080$(NC)"
	@echo "$(BLUE)MySQL: localhost:3306$(NC)"

## up-db: Start only database
up-db:
	docker-compose -f infra/docker-compose.yml up -d db
	@echo "$(GREEN)✓ Database started$(NC)"

## down: Stop all Docker services
down:
	docker-compose -f infra/docker-compose.yml down
	@echo "$(GREEN)✓ All services stopped$(NC)"

## down-v: Stop all services and remove volumes
down-v:
	docker-compose -f infra/docker-compose.yml down -v
	@echo "$(GREEN)✓ All services stopped and volumes removed$(NC)"

## logs: Show Docker logs
logs:
	docker-compose -f infra/docker-compose.yml logs -f

## logs-api: Show API logs only
logs-api:
	docker-compose -f infra/docker-compose.yml logs -f api

## logs-db: Show database logs only
logs-db:
	docker-compose -f infra/docker-compose.yml logs -f db

# =============================================
# Database
# =============================================

## db-generate: Generate Prisma client
db-generate:
	cd backend && npx prisma generate

## db-migrate: Run database migrations
db-migrate:
	cd backend && npx prisma migrate dev

## db-migrate-deploy: Deploy migrations (production)
db-migrate-deploy:
	cd backend && npx prisma migrate deploy

## db-seed: Seed the database
db-seed:
	cd backend && npm run db:seed

## db-reset: Reset database (migrate + seed)
db-reset:
	cd backend && npx prisma migrate reset --force
	@echo "$(GREEN)✓ Database reset complete$(NC)"

## db-studio: Open Prisma Studio
db-studio:
	cd backend && npx prisma studio

# =============================================
# Build & Test
# =============================================

## build: Build all packages
build: build-backend build-frontend

## build-backend: Build backend
build-backend:
	cd backend && npm run build
	@echo "$(GREEN)✓ Backend built$(NC)"

## build-frontend: Build frontend
build-frontend:
	cd frontend && npm run build 2>/dev/null || echo "$(YELLOW)Frontend not yet created$(NC)"

## test: Run all tests
test: test-backend test-frontend

## test-backend: Run backend tests
test-backend:
	cd backend && npm test

## test-frontend: Run frontend tests
test-frontend:
	cd frontend && npm test 2>/dev/null || echo "$(YELLOW)Frontend not yet created$(NC)"

## test-watch: Run tests in watch mode
test-watch:
	cd backend && npm run test:watch

## test-coverage: Run tests with coverage
test-coverage:
	cd backend && npm run test:coverage

## lint: Run linter on all packages
lint: lint-backend lint-frontend

## lint-backend: Lint backend
lint-backend:
	cd backend && npm run lint

## lint-frontend: Lint frontend
lint-frontend:
	cd frontend && npm run lint 2>/dev/null || echo "$(YELLOW)Frontend not yet created$(NC)"

# =============================================
# Utilities
# =============================================

## clean: Remove build artifacts and node_modules
clean:
	rm -rf backend/dist
	rm -rf backend/node_modules
	rm -rf frontend/dist
	rm -rf frontend/node_modules
	@echo "$(GREEN)✓ Cleaned$(NC)"

## format: Format code with Prettier
format:
	cd backend && npx prettier --write "src/**/*.ts"
	cd frontend && npx prettier --write "src/**/*.{ts,tsx}" 2>/dev/null || true

## typecheck: Run TypeScript type checking
typecheck:
	cd backend && npx tsc --noEmit
	cd frontend && npx tsc --noEmit 2>/dev/null || true

# =============================================
# Production
# =============================================

## prod-build: Build for production
prod-build:
	docker-compose -f infra/docker-compose.yml build

## prod-up: Start production environment
prod-up:
	docker-compose -f infra/docker-compose.yml up -d
	docker-compose -f infra/docker-compose.yml run --rm migrate

## prod-logs: View production logs
prod-logs:
	docker-compose -f infra/docker-compose.yml logs -f api
