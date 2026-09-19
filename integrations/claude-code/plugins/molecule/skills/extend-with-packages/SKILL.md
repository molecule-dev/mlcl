---
name: extend-with-packages
description: Add a capability to an existing project, or swap a provider, using @molecule/* packages and mlcl — search first, install+wire with mlcl add --inject, swap providers without rewrites, and read the package's own README for correct usage.
---

# Extend a project with @molecule packages

Before hand-rolling any capability (emails, payments, file uploads, auth method, realtime, search, …), check the fleet — molecule almost certainly ships it behind a swappable bond.

## Add a capability

1. **Search.**
   ```bash
   npx mlcl search <capability>       # e.g. "send emails", "payments", "file uploads"
   ```
2. **Install + wire.** From the project root (or its `api/`/`app/` subdir):
   ```bash
   npx mlcl add @molecule/<name> --inject
   ```
   `--inject` writes the dependency, generates the `src/bonds/` wiring, peers, migrations, and routes.
3. **Fill any new secrets** the package needs (listed in its README / the command output).
4. **Read its usage reference** at `node_modules/@molecule/<name>/README.md` — generated, always current, includes `@example` wiring.

## Swap a provider

Same interface, different vendor — one command, no rewrite:

```bash
npx mlcl swap @molecule/api-database-mysql        # e.g. PostgreSQL → MySQL
npx mlcl swap @molecule/api-emails-ses -r mailgun # several wired? name the one to replace
```

## Rules of thumb

- Never import a vendor SDK outside `src/bonds/` — that single rule keeps the app swappable.
- In a molecule-scaffolded project, an `AGENTS.md` at the root carries the project's conventions — read it before editing.
- Non-molecule project? `mlcl add/inject/swap` work on any package.json-having project; the bond convention (`src/bonds/<category>-<provider>.ts`) is what makes swapping work: https://github.com/molecule-dev/mlcl/blob/main/docs/INTEGRATE-EXISTING-APP.md
