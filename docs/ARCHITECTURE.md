# Architecture

The browser loads a static React application from Nginx. Traefik is the only public HTTP entrypoint and forwards `/api/*` to FastAPI and other paths to the web application. PostgreSQL persists accounts, classes, assignments, lab metadata, sessions, attempts, and audit events. The API accesses the Docker Engine through `tecnativa/docker-socket-proxy`, never through a Docker socket mounted in the API or a lab container.

Each launched Docker session creates a unique `internal=true` bridge. Target containers and the attacker desktop have no host-published ports, no bind mounts, dropped Linux capabilities, `no-new-privileges`, process limits, memory limits, and CPU limits. The attacker gets `NET_RAW` for network discovery. The firewall lab's target gets `NET_ADMIN` because changing the target firewall is its exercise. Traefik is attached to one session bridge while that session runs and is disconnected during cleanup. The HTTP entrypoint binds only to its address on the application bridge, preventing a lab peer from using that interface to reach application routes. The internal forward-auth route accepts calls only from the Traefik application-network address.

The application uses opaque random browser session cookies, stores only token hashes, and uses double-submit CSRF checks for state-changing requests. Passwords use Argon2id. Lab answers and generated flags are omitted from student-visible catalog representations. Submission grading is performed by the API and written as an immutable attempt record.

## Runtime interface

`LabRuntime` defines `start`, `stop`, `status`, `exec`, `list_managed`, and `stats`. `FakeRuntime` uses in-memory session references for local UI work. `DockerRuntime` provisions one internal bridge and isolated containers for each launch. The reaper expires idle and over-duration sessions every 30 seconds; startup reconciliation removes managed containers and networks without a live matching database session.

A future `LibvirtRuntime` can implement the same protocol by creating one disposable libvirt network per session, booting an attacker VM and target VMs from signed templates, injecting per-session flags through a guest-agent or cloud-init channel, and exposing the attacker console through a secured browser gateway. `stop` would destroy guests and network resources; `exec` would use the guest agent; `stats` would read libvirt counters. It should preserve the same ownership checks and resource limits.

## Important boundaries

Docker isolation is a practical teaching boundary, not a VM boundary. The API has Docker control-plane influence; compromise of the API or socket proxy can affect the host. Run production on a dedicated host or VM. The static reverse-proxy interface and forward-auth allowlist must remain aligned with the `app` subnet in Compose. Do not change either independently.
