.PHONY: dev dev-docker test lint migrate seed build-images smoke labs-validate labs-sync e2e down

dev:
	RUNTIME=fake docker compose --profile mail up --build

dev-docker:
	$(MAKE) build-images
	RUNTIME=docker docker compose --profile mail up --build

build-images:
	docker build -t cyberrange/kali-desktop:1 labs/images/kali-desktop
	docker build -t cyberrange/lab-recon-target:1 labs/images/recon-target
	docker build -t cyberrange/lab-sqli:1 labs/images/sqli-target
	docker build -t cyberrange/lab-password-target:1 labs/images/password-target
	docker build -t cyberrange/lab-firewall-target:1 labs/images/firewall-target
	docker pull tleemcjr/metasploitable2:latest

test:
	cd backend && python -m pytest --cov=app --cov-report=term-missing
	cd frontend && npm test

lint:
	cd backend && ruff check app tests && mypy app
	cd frontend && npm run lint && npm run build

migrate:
	docker compose exec api alembic upgrade head

seed:
	docker compose exec -e BACKEND_PATH=/app api python /scripts/seed_dev.py

labs-validate:
	cd backend && python -m app.cli labs validate

labs-sync:
	docker compose exec api python -m app.cli labs sync

e2e:
	cd frontend && npm run e2e

smoke:
	bash scripts/smoke_test.sh

down:
	docker compose down
