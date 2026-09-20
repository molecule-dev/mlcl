# Analytics dashboards — spec + post-deploy reminder

> **REMINDER (owner):** Build the dashboard page after the platform deploy.
> This doc is the spec so it's a paste-and-build, not a design session.

## What we collect (both surfaces, same `analyticsEvents` table)

| Event           | Source                                    | Key properties                                                                                                                                                                                |
| --------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cli.command`   | every mlcl command (oclif hooks)          | command, ok, durationMs, errorName, cliVersion, nodeMajor, platform, arch, **template, packages, searchQuery, harness, projectType, framework, loginMethod, deployOutcome, swapFrom, swapTo** |
| `mcp.tool_call` | every molecule-mcp tool (tracked wrapper) | tool, ok, durationMs, serverVersion, nodeMajor, platform, arch, **template, packages, searchQuery, harness**                                                                                  |
| IDE events      | platform (server-side)                    | existing product events (`payment.revenue`, `ai.turn.completed`, page views, signup funnel, …)                                                                                                |

Both CLI and MCP events share a `source` field (`mlcl` vs `molecule-mcp`) and
an anonymous install id — the join key for cross-surface funnels.

## The dashboard: ONE page, three tabs

The comparison view is the killer insight — "60% of scaffolds come from the
CLI" or "CLI users deploy 2× more" — and it needs IDE and CLI data on the
same screen. Three separate dashboards would hide exactly that.

### Tab 1: Overview (the comparison)

Side-by-side metric cards + a single time-series chart with two lines:

| Metric                    | IDE               | CLI                                | Comparison   |
| ------------------------- | ----------------- | ---------------------------------- | ------------ |
| Daily active users        | sessions          | anonymousId distinct               | % CLI        |
| Projects created          | POST /projects    | `cli.command` where command=create | % CLI        |
| Deploys triggered         | deployments table | `cli.command` where command=deploy | % CLI        |
| Mean time to first deploy | signup→deploy     | install→deploy                     | delta        |
| Agent adoption            | —                 | `cli.command` where harness≠null   | % of CLI     |
| Search volume             | —                 | `cli.command` where command=search | —            |
| Error rate                | 5xx %             | `cli.command` where ok=false       | side-by-side |

### Tab 2: CLI deep dive

- **Command usage heatmap** (command × day) — spot adoption and abandonment
- **Template leaderboard** (`template` property on create) — which flagship apps win
- **Package composition graph** (`packages` property) — what agents compose
- **Search terms cloud** (`searchQuery`) — what agents look for (product roadmap)
- **Harness distribution** (`harness`) — Claude Code vs Cursor vs Codex vs …
- **Funnel**: install (first event) → first search → first create → first deploy
- **Swap pairs** (`swapFrom`/`swapTo`) — which bonds actually get exercised
- **Error breakdown** (`errorName` × command) — what breaks most

### Tab 3: IDE deep dive (existing metrics)

The existing `/analytics/dashboard` content — AI turns, tokens, cost, revenue,
retention, churn — unchanged.

## Backend: stay on Postgres (for now)

**Decision: NOT Axiom yet.** The events are already in the platform's
`analyticsEvents` table via the `@molecule/api-analytics` bond (dogfooding
the same interface scaffolded apps use). At launch volume, Postgres handles
this easily, and the dashboard is SQL queries over a single table.

**When to add Axiom (or similar):**

- Event volume > ~1M/day (Postgres starts needing partitioning)
- You need ad-hoc exploration beyond what SQL dashboards provide
- You want long-term retention without growing the platform DB

**When that day comes:** add `@molecule/api-analytics-axiom` as a provider
bond (~100 lines, PostHog-shaped) wired alongside `analytics-database` —
zero CLI changes, zero migration. The bond architecture makes this a swap,
not a rewrite. See the workspace AGENTS.md "On Axiom" note.

## Implementation notes

- Route: `GET /analytics/cli` (admin) — three JSON payloads (overview, cli, ide)
- Frontend: extend the existing Analytics page (`app/src/pages/Analytics.tsx`)
  with tabs, or a dedicated `/analytics/platform` if the page is already dense
- Query patterns: `GROUP BY properties->>'template'`, `COUNT(DISTINCT
anonymousId)`, date_trunc('day', "createdAt")`— straightforward SQL over`analyticsEvents`where`event IN ('cli.command', 'mcp.tool_call')`
- The IDE's own events are already in the same table — the comparison is a
  `source`-less vs `source`-ful join, not a cross-system query
