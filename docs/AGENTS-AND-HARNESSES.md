# Molecule + AI coding agents — the complete guide

Molecule is built agent-first: the CLI is non-interactive by flag, emits JSON,
and every scaffolded project teaches your agent its conventions. This guide
covers every supported harness and every wiring method, with examples.

> **Status:** `mlcl` and `molecule-mcp` publish to npm at launch — until then
> run from a repo checkout (`node mlcl/bin/run.js …`) and point the MCP server
> at it via `MOLECULE_MCP_CLI`. The `@molecule/*` packages themselves are
> public on npm today.

**The one-paragraph version:** run `npx mlcl agent init` (context) and
`npx mlcl mcp install` (tools) — or install the Claude Code plugin, or just
paste the prompt block from the README into any agent. Then ask your agent to
build something. URL-only clients (Lovable/v0/bolt connectors, and any harness
wanting a one-line install) use the hosted read-only endpoint instead:
`https://mcp.molecule.dev/mcp`.

---

## What your agent gets

| Surface                          | What it provides                                                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `mlcl` CLI (`npx`)               | discovery (`search`, `templates`), scaffolding (`create --no-interactive --json`), growth (`add --inject`), reconfiguration (`swap`) |
| Scaffolded `AGENTS.md`           | the project's conventions, in context the moment any agent opens the project                                                         |
| `agent init`                     | those same conventions written into any existing project / harness's instruction files                                               |
| `molecule` MCP server            | the same verbs as structured tools + `read_package_doc` + the `molecule://conventions` resource + a self-install `agent_init` tool   |
| Claude Code plugin _(at launch)_ | two skills + the MCP server, marketplace-updated                                                                                     |
| Package READMEs                  | every `@molecule/*` package documents its API/wiring at `node_modules/@molecule/<name>/README.md` — LLM-oriented by design           |

---

## Method 1 — zero setup (any agent, any harness)

Paste this into Claude Code, Codex, Cursor, Gemini CLI, OpenCode, Cline,
Windsurf, Zed, or any chat-based agent:

```text
Build this app with molecule.dev: run `npx mlcl templates` and pick the closest
flagship template (or `npx mlcl search <capability>` to find packages for a
custom stack); scaffold with `npx mlcl create <name> --template <slug>
--no-interactive --json`; then follow the scaffolded AGENTS.md conventions —
prefer @molecule/* packages over hand-rolled code, provider wiring only in
src/bonds/ (swap with `npx mlcl swap`), ClassMap styling, i18n for all
user-facing text, and each package's README at
node_modules/@molecule/<name>/README.md for usage.
```

No configuration exists that this doesn't work with. Everything below just
makes the agent molecule-aware _permanently_.

## Method 2 — `mlcl agent init` (context, one command)

Writes the molecule conventions + quickstart into the instruction files your
harness reads. Idempotent — re-runs never clobber your edits.

```bash
npx mlcl agent init                          # auto-detect the harness
npx mlcl agent init --agent cursor           # be explicit
npx mlcl agent init --agent claude-code --global   # every project, not just this one
npx mlcl agent init --force                  # refresh the molecule section
```

What it writes per harness:

| Harness                                 | Files written                                           |
| --------------------------------------- | ------------------------------------------------------- |
| Claude Code                             | `AGENTS.md` + `.claude/skills/molecule/SKILL.md`        |
| Cursor                                  | `AGENTS.md` + `.cursor/rules/molecule.mdc`              |
| Gemini CLI                              | `AGENTS.md` + `.gemini/extensions/molecule/GEMINI.md`   |
| Windsurf                                | `AGENTS.md` + `.windsurf/rules/molecule.md` (always-on) |
| Codex, Zed, OpenCode, Pi, anything else | `AGENTS.md` (the cross-harness standard they all read)  |

`--global` additionally targets `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`,
or `~/.gemini/GEMINI.md` for the harnesses with well-known home files.

## Method 3 — the MCP server (tools, one command or one line)

`molecule-mcp` exposes structured tools: `search_packages`, `list_templates`,
`scaffold_project`, `add_package`, `swap_provider`, `read_package_doc`,
`agent_init` — plus the `molecule://conventions` resource.

```bash
npx mlcl mcp install                 # detect + register (uses the harness's own installer when it has one)
npx mlcl mcp install --agent opencode --project
```

Or your harness's native command / config:

| Harness           | Install                                                        |
| ----------------- | -------------------------------------------------------------- |
| Claude Code       | `claude mcp add molecule -- npx -y molecule-mcp`               |
| Codex             | `codex mcp add molecule -- npx -y molecule-mcp`                |
| Cursor            | `cursor mcp add molecule -- npx -y molecule-mcp`               |
| Gemini CLI        | `gemini mcp add molecule npx -y molecule-mcp` _(no `--`)_      |
| Windsurf          | `~/.codeium/windsurf/mcp_config.json` → `mcpServers.molecule`  |
| VS Code / Copilot | `.vscode/mcp.json` → `servers.molecule`                        |
| OpenCode          | `opencode.json` → `mcp.molecule` (command-array shape)         |
| Amp               | `~/.config/amp/settings.json` → `mcpServers.molecule`          |
| Crush             | `~/.config/crush/config.json` → `mcpServers.molecule`          |
| Kiro              | `.kiro/settings/mcp.json` → `mcpServers.molecule`              |
| Trae              | `.trae/mcp.json` → `mcpServers.molecule`                       |
| Zed               | `.zed/settings.json` → `agent.mcp_servers.molecule`            |
| Goose             | `~/.config/goose/config.yaml` under `extensions:`              |
| Junie (JetBrains) | `/mcp` → add server, command `npx -y molecule-mcp`             |
| Cline / Kilo Code | MCP Servers → Configure → `mcpServers.molecule`                |
| Continue          | `config.json` → `mcpServers.molecule`                          |
| Aider             | recent versions: add `molecule`, command `npx -y molecule-mcp` |

The standard entry (what `mlcl mcp install` writes) is
`{"command": "npx", "args": ["-y", "molecule-mcp"]}` — adjust only if your
client needs a different shape (OpenCode does; the installer knows).

## Method 4 — the Claude Code plugin (the deluxe path; repo goes public at launch)

```
/plugin marketplace add molecule-dev/molecule-claude-code
/plugin install molecule@molecule
```

Bundles the `build-with-molecule` and `extend-with-packages` skills plus the
MCP server, updated through the marketplace. Skills trigger on intent
("build me X" / "add payments"), and tools come with it.

## Method 5 — the hosted remote endpoint (no local install)

The read-only face of the server, served over HTTP at
`https://mcp.molecule.dev/mcp` (see [../mcp/DEPLOY.md](../mcp/DEPLOY.md)). Tools:
`search_packages`, `list_templates`, `read_package_doc`, and the
`molecule://conventions` resource; the catalog streams live from the public
repo and docs from npm.

```bash
# any HTTP-transport harness — one URL, no local process:
claude mcp add --transport http molecule https://mcp.molecule.dev/mcp
```

And the URL goes straight into the connector forms of the vibecoding
platforms — Lovable (custom MCP connector), v0 (MCP integrations), bolt.new
(Connectors) — so their agents can consult the molecule package fleet
mid-build. The graduation path for their exported apps:
[FROM-VIBECODING.md](FROM-VIBECODING.md).

---

## Example agent workflows

**Greenfield, template path** (the 90% case):

```text
You:  Build me a helpdesk app with molecule.
Agent: runs  npx mlcl templates            → picks helpdesk-ticketing
       runs  npx mlcl create helpdesk --template helpdesk-ticketing \
               --no-interactive --json
       fills .env keys it can, tells you the rest
       follows the scaffolded AGENTS.md for every edit after that
```

**Greenfield, custom stack:**

```text
You:  Build an API with Postgres, users, and Stripe subscriptions.
Agent: npx mlcl search subscriptions --json
       npx mlcl create sub-api --type api \
         --packages @molecule/api-database-postgresql,@molecule/api-resource-user,@molecule/api-payments-stripe \
         --no-interactive --json
```

**Existing project, new capability:**

```text
You:  Add transactional email to this app (it's a molecule project).
Agent: npx mlcl search "send emails" --stack api
       npx mlcl add @molecule/api-emails-mailgun --inject
       reads node_modules/@molecule/api-emails-mailgun/README.md for usage
```

**Provider swap:**

```text
You:  Move the database from Postgres to MySQL.
Agent: npx mlcl swap @molecule/api-database-mysql --no-interactive --install
       updates .env DATABASE_URL, runs migrations
```

**MCP-tool path** (harness with `molecule` connected): the agent calls
`list_templates` / `search_packages` / `scaffold_project` / `add_package` /
`swap_provider` / `read_package_doc` directly instead of shelling out.

---

## Notes for every harness

- **Node ≥ 22** is required for `npx mlcl` / `npx molecule-mcp`.
- The scaffolded project's own `AGENTS.md` is the source of truth once a
  project exists — `agent init` sections are for _before_ that / other repos.
- A project scaffold ships `.npmrc` with `legacy-peer-deps=true` and a comment
  explaining when to delete it (an eslint plugin peer-range lag; harmless).
- Structured tools are read-heavy by design; the only write tools are
  `scaffold_project` / `add_package` / `swap_provider` / `agent_init`, each
  an explicit CLI invocation with explicit arguments.
- Local/dev override for the MCP server's CLI:
  `MOLECULE_MCP_CLI=/path/to/mlcl/bin/run.js`.

## Troubleshooting

| Symptom                          | Fix                                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `command not found: mlcl`        | use `npx mlcl …`, or `npm i -g mlcl`                                                                    |
| MCP tools don't appear           | restart the harness after config changes; check its MCP panel (`/mcp` in Claude Code) for launch errors |
| `create` says framework required | you're on a custom build without `--template`; add `--framework react`                                  |
| search finds nothing             | try broader capability words (`email` not `ses`), or browse the catalog                                 |
