# Authoring a lab package

Each lab is a directory under `labs/<slug>/` with a `lab.yaml` manifest and a learner-facing `guide.md`. The API validates the manifest before syncing. The JSON Schema reference is `labs/schema/lab.schema.json`; the runtime validator additionally rejects `network.internet: true` and unjustified security exceptions.

1. Copy `labs/_template/` to a new lowercase hyphenated slug directory.
2. Write measurable objectives, a plain-language explanation, safe step-by-step tasks, progressive hints, and a wrap-up in `guide.md`.
3. Set the attacker and target image names, CPU and memory limits. Every lab must set `network.internet: false`. Do not publish ports, mount host paths, or put secrets in the guide.
4. Add at least five question entries. Use `mcq`, `short_text`, `numeric`, `flag`, or `check`. Keep answer keys in `lab.yaml`; the sync layer stores them server-side and public APIs strip them. A `check` command must be fixed in the manifest, have a short timeout, and never be assembled from learner input.
5. Use `{{flag:name}}` in a `flag` answer and a target environment variable when the target needs the same generated value. The platform replaces the template for each new session.
6. Declare each exceptional capability under the affected target's `security_exceptions` and explain why it is required. The reviewer should also add the exception to `docs/THREAT_MODEL.md`.
7. Run `make labs-validate`, inspect the rendered guide, build any custom image with `make build-images`, then run `make labs-sync` against a running API.

Teachers preview the objectives, guide, and question prompts from the catalog. The interface does not expose answer specs.
