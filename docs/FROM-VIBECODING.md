# Graduating from a vibe-coded prototype (Lovable, v0, bolt.new, Replit)

You prompted an app into existence — Lovable, v0, bolt.new, Replit, or a
chat with an agent — and now it's a real repo with real users heading its
way. That's the moment this guide is for: turning a working prototype into a
production app **without rewriting it**.

Molecule's value at this stage is exactly what prototypes lack:

- **Real infrastructure packages** — battle-tested auth (2FA, device
  management, password reset), payments, transactional email, uploads,
  push — each behind a swappable bond, not hand-rolled around a vendor SDK.
- **Conventions an AI agent can hold onto** — an AGENTS.md that keeps
  whichever agent you use next (Claude Code, Cursor, …) productive instead
  of improvising.
- **Swappability** — change providers (Stripe→PayPal, Mailgun→SES,
  Postgres→MySQL) with one command, forever.

## The graduation path

```bash
# 1. Export the app from the builder (GitHub export / download) — you get a
#    conventional Vite/React/TS repo. Commit it, push it.

# 2. Give your agent the molecule conventions (works in any harness):
npx mlcl agent init

# 3. Replace prototype-grade systems with production packages:
npx mlcl search auth --json
npx mlcl add @molecule/app-auth --inject          # real auth: 2FA, devices, reset
npx mlcl add @molecule/api-emails-mailgun --inject  # transactional email
npx mlcl add @molecule/api-payments-stripe --inject # billing that isn't duct tape

# 4. Each package wires itself: bonds in src/bonds/, migrations, routes.
#    Read node_modules/@molecule/<name>/README.md for its API.

# 5. Swap anything, anytime:
npx mlcl swap @molecule/api-emails-ses -r mailgun
```

Details on what `add`/`inject`/`swap` expect from your project's layout —
and the build-in-IDE-then-export flow if you'd rather assemble a feature in
the molecule.dev IDE first — are in
[INTEGRATE-EXISTING-APP.md](INTEGRATE-EXISTING-APP.md).

## Inside the builders themselves

Lovable (chat connectors), v0 (MCP integrations), and bolt.new (Connectors)
all speak MCP in 2026 — but they connect to **remote** MCP servers by URL,
while molecule's local server is a stdio process. The hosted read-only face
(`mcp.molecule.dev` — search/templates/package-docs/conventions, no local
install required) is built and deploys at launch; point any of those
builders' connector forms at its URL and their agents can consult the package
fleet mid-build the same way Claude Code can today.

## The honest comparison

|                         | vibe-coded prototype | molecule build                    |
| ----------------------- | -------------------- | --------------------------------- |
| Time to first demo      | minutes              | minutes (130+ flagship templates) |
| Auth/payments/email     | stubbed or glued     | production packages, swappable    |
| Provider change         | rewrite              | `mlcl swap`                       |
| Agent works on it later | improvises           | follows the scaffolded AGENTS.md  |
| Ownership               | exported code        | exported code — same              |

The prototype tools are great at the demo. Molecule is what's still standing
at version 3.
