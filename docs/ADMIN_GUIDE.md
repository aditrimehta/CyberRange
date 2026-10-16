# Administrator guide

Create the first administrator interactively with `python -m app.cli create-admin` inside the API container. Sign in, accept the acceptable-use policy, and create teacher accounts from the admin user list/API. Temporary passwords force a password change. Disable accounts immediately when access should end; deactivation revokes their sessions.

Use the lab catalog to inspect and enable approved packages. Run `python -m app.cli labs validate` before syncing new manifests. System overview shows active session count, runtime mode, and session references. Use the API audit-log view to review account and session events. Set production environment variables in the deployment secret store and keep the Docker Engine and database private.

The initial admin UI is intentionally small; user and lab management endpoints are available in the documented API. Teacher spectating, dynamic quota editing, and email verification are not enabled in this MVP.
