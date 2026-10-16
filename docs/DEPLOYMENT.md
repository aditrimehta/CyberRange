# Deployment guide

Use a dedicated Linux host or VM with Docker Engine and the Compose v2 plugin. Copy `.env.example` to `.env`, generate unique secrets, set the institution hostname and SMTP values, and choose `RUNTIME=docker`. Keep ports 5432, 2375, and all lab ports off the public interface. Compose publishes only Traefik on 80 and 443.

For a public DNS name, use the production overlay: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`. Let's Encrypt HTTP-01 requires public DNS pointing to the host and inbound 80/443. For campus-only use, replace ACME with a campus-issued certificate or terminate TLS at an approved campus reverse proxy and configure secure cookies accordingly.

Image builds are resource intensive. `make build-images` builds the custom Kali desktop and target images and pulls the Metasploitable2 target. Keep the image tags in the lab manifests pinned and re-scan the builds before use. A build host should have enough disk for image layers and concurrent sessions.

Migrations run before API startup. Lab packages sync at API startup and can be re-synced with the administrator endpoint or CLI. Create the first admin with `docker compose exec api python -m app.cli create-admin`. For local demos, `make seed` creates demo accounts and prints their passwords; never run it in production.

Back up with `deploy/backup.sh`. Store backups outside the host, encrypt them, test restores on a separate system, and schedule image and dependency updates during a maintenance window. Read `docs/EXTERNAL_STEPS.md` for the complete operator checklist.
