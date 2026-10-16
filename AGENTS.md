# Repository guide

## Commands

- `make dev`: build and start the fake-runtime development stack.
- `make dev-docker`: build custom lab images and run with the Docker runtime.
- `make test`: backend pytest coverage and frontend Vitest.
- `make lint`: Ruff, mypy, ESLint, TypeScript build.
- `make labs-validate`: validate every lab package from `backend/`.
- `make labs-sync`: sync validated packages to the running database.
- `make build-images`: build custom images and pull the Metasploitable2 base.
- `make smoke`: run the Docker-host isolation/cleanup smoke suite.
- `cd frontend && npm run e2e`: run Playwright against a running fake-runtime stack seeded with demo accounts.

## Conventions

- Python 3.12, type annotations for service boundaries, SQLAlchemy 2 typed mappings, Pydantic request models, Ruff import ordering.
- FastAPI route handlers enforce roles and object ownership in the API. New endpoints should use explicit response objects and never serialize `answer_spec` or session secrets.
- Browser authentication uses hashed opaque tokens in HttpOnly cookies plus a CSRF header. Never add JWTs or put credentials in URLs or logs.
- React uses strict TypeScript, TanStack Query for server state, keyboard-visible focus, semantic controls, and sanitized Markdown.
- A lab has `lab.yaml` and `guide.md`. Internet access must remain false. Any target exception requires a written justification and a threat-model entry.
- Pin direct dependency versions. Keep Docker images unprivileged, without host mounts/ports, and with resource limits.
- Document operational assumptions and any reduced scope in `docs/DECISIONS.md`; update `docs/EXTERNAL_STEPS.md` when operators need to act.
