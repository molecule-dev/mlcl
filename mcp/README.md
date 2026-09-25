# molecule-mcp

The [Molecule.dev](https://molecule.dev) MCP server — structured tools over the
`mlcl` CLI for any MCP-capable coding agent: search the `@molecule/*` package
fleet, list flagship app templates, scaffold projects, add/wire packages, swap
providers, and read package docs.

> **Status:** built and tested; publishes to npm at launch. The `npx -y
molecule-mcp` entries below are the install-time interface. The
> `@molecule/*` packages themselves are public on npm today.

Also ships the molecule doctrine as a resource (`molecule://conventions`) and
an `agent_init` tool that writes the convention files your harness reads — so
connecting this ONE server delivers both the capability and the context.

The broader agent guide (all harnesses, all wiring methods, example agent
workflows): [../docs/AGENTS-AND-HARNESSES.md](../docs/AGENTS-AND-HARNESSES.md) (in the mlcl repo).

## Install

The one command that works everywhere (uses your harness's own installer when it has one, writes the standard config when it doesn't):

```bash
npx mlcl mcp install
```

Or use your harness's native command / config directly:

| Harness           | Install                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| Claude Code       | `claude mcp add molecule -- npx -y molecule-mcp` _(or the plugin: `/plugin install molecule@molecule`)_ |
| Cursor            | `cursor mcp add molecule -- npx -y molecule-mcp`                                                        |
| Codex             | `codex mcp add molecule -- npx -y molecule-mcp` (or `~/.codex/config.toml` `[mcp_servers.molecule]`)    |
| Gemini CLI        | `gemini mcp add molecule npx -y molecule-mcp` _(no `--` separator)_                                     |
| Windsurf          | edit `~/.codeium/windsurf/mcp_config.json` → `mcpServers.molecule`                                      |
| VS Code / Copilot | `.vscode/mcp.json` → `servers.molecule`                                                                 |
| OpenCode          | `opencode.json` → `mcp.molecule = {type:"local", command:["npx","-y","molecule-mcp"]}`                  |
| Amp               | `~/.config/amp/settings.json` → `mcpServers.molecule`                                                   |
| Crush             | `~/.config/crush/config.json` → `mcpServers.molecule`                                                   |
| Kiro              | `.kiro/settings/mcp.json` (or `~/.kiro/settings/mcp.json`) → `mcpServers.molecule`                      |
| Trae              | `.trae/mcp.json` (or `~/.trae/mcp.json`) → `mcpServers.molecule`                                        |
| Zed               | `.zed/settings.json` → `agent.mcp_servers.molecule`                                                     |
| Goose             | `~/.config/goose/config.yaml` under `extensions:` (or `goose configure`)                                |
| Junie (JetBrains) | `/mcp` in Junie → add server, command `npx -y molecule-mcp`                                             |
| Cline / Kilo Code | MCP Servers → Configure → `mcpServers.molecule` (same shape)                                            |
| Continue          | `config.json` → `mcpServers.molecule`                                                                   |
| Aider             | recent versions support MCP — add `molecule`, command `npx -y molecule-mcp`                             |
| Any MCP client    | command: `npx`, args: `["-y", "molecule-mcp"]`                                                          |

`mlcl mcp install` writes/merges the JSON-config harnesses (Windsurf, VS Code,
OpenCode, Amp, Crush, Kiro, Trae, Zed, Cursor-project) idempotently and never
clobbers existing servers; for the YAML/UI harnesses (Goose, Junie,
Cline/Kilo, Continue, Aider) it prints the exact snippet instead of risking a
mangled config.

Why the long form? A stdio MCP server is a local process the client spawns, so
the client needs its launch command. Shorter paths (all at launch): the hosted endpoint —
`claude mcp add --transport https https://mcp.molecule.dev/mcp`, one URL for
any HTTP-capable client, or paste it into Lovable/v0/bolt connector forms —
the [Smithery](https://smithery.ai)/[Glama](https://glama.ai)/[PulseMCP](https://www.pulsemcp.com)
registry listings (one-click), and for Claude Code the full plugin —
`/plugin marketplace add molecule-dev/molecule-claude-code` then
`/plugin install molecule@molecule` (skills + this server, marketplace-updated).

## Tools

| Tool                   | What it does                                                          |
| ---------------------- | --------------------------------------------------------------------- |
| `search_packages`      | Search `@molecule/*` by capability ("payments", "social login")       |
| `list_templates`       | The flagship app gallery (blog, crm, team-chat, …)                    |
| `scaffold_project`     | `mlcl create` unattended, JSON result                                 |
| `add_package`          | Install + wire a package (`mlcl add --inject`)                        |
| `swap_provider`        | Swap a wired provider (`mlcl swap`)                                   |
| `read_package_doc`     | A package's generated usage README (walks up to hoisted node_modules) |
| `agent_init`           | Write the molecule conventions into this project's agent files        |
| `login` / `login_poll` | Browser device-code login (same token as the CLI — see below)         |
| `whoami` / `logout`    | Login status / clear the token                                        |
| `list_projects`        | Your molecule.dev projects (ids for `create_api_key`)                 |
| `create_api_key`       | Mint a project API key into the project `.env` (never shown in chat)  |
| `embed_text`           | Embeddings on molecule.dev, billed to the project — no OpenAI account |

Plus the `molecule://conventions` resource — the molecule doctrine
(packages before hand-rolled code, bonds for providers, ClassMap, i18n) that
your agent can read as context.

### Example calls

```jsonc
// search_packages — capability search, agent-side package discovery
{ "query": "payments", "limit": 3 }
// → [{"name":"@molecule/api-payments-stripe","stack":"api","category":"payments",
//      "description":"Stripe payment provider…","install":"mlcl add @molecule/api-payments-stripe --inject"}, …]

// scaffold_project — unattended scaffold, JSON result
{ "name": "my-store", "template": "online-store", "skip_install": false }
// → {"project":"my-store","path":"/abs/my-store","type":"full-stack",
//     "packages":[…],"secrets":["STRIPE_SECRET_KEY",…]}

// custom stack instead of a template
{ "name": "api", "type": "api", "packages": "@molecule/api-database-postgresql,@molecule/api-resource-user" }

// add_package / swap_provider — grow and reconfigure
{ "name": "@molecule/api-emails-mailgun" }
{ "new_provider": "@molecule/api-database-mysql", "replace": "@molecule/api-database-postgresql" }

// read_package_doc — the package's own generated usage reference
{ "name": "api-payments-stripe", "directory": "/abs/my-project/api" }

// agent_init — make the current project molecule-aware (idempotent)
{ "directory": "/abs/my-project" }
```

## Hosted services

molecule.dev runs some capabilities for you, so neither your app nor your
agent needs its own vendor account. Each call is metered and billed to one
project, through that project's API key:

1. `login`, then `list_projects` to find the project id.
2. `create_api_key` with `env_file` pointing at the project's `.env`. The
   key is written there as `MOLECULE_API_KEY` (file mode 0600) and is not
   returned to the agent. Check that the file is gitignored.
3. Service tools (`embed_text`) read the key from that `.env` (pass
   `directory`) or from `MOLECULE_API_KEY` in this server's environment.

The same HTTP API (`POST https://api.molecule.dev/api/v1/services/<service>/<operation>`,
catalog at `GET …/v1/services`) backs the `@molecule/*-molecule` bonds, so
app code reaches the same service through a normal, swappable bond.

## Two modes: local (stdio) and hosted (HTTP)

- **Local stdio** (default, `molecule-mcp`): full tool set, wraps the local
  `mlcl` CLI. What every CLI harness registers.
- **Hosted HTTP** (`molecule-mcp-serve` / `node dist/http.js`): the read-only
  face, slated for `https://mcp.molecule.dev/mcp` (deploys at launch) —
  search/templates/docs/conventions served from the live registry and npm, no
  local install needed. This is the surface URL-based clients use: Lovable
  chat connectors, v0 MCP integrations, bolt.new Connectors, and the short
  install (`claude mcp add --transport https https://mcp.molecule.dev/mcp`).
  Deploy runbook: [DEPLOY.md](DEPLOY.md).

## Login (platform features)

Deploy/env-push/project tools need molecule.dev auth, and the login is the
SAME one the CLI uses — call the `login` tool, show the returned URL + code
to the user, poll with `login_poll` until `logged_in`. The token lands in
`~/.mlcl/credentials.json` and covers every surface at once (this server,
the mlcl CLI, and any CLI process it spawns). CI: set `MOLECULE_TOKEN`.

## Configuration

- Local mode shells out to the `mlcl` binary (resolved from PATH; override
  for local/dev with `MOLECULE_MCP_CLI=/path/to/mlcl/bin/run.js`).
- Remote mode env: `MOLECULE_REGISTRY_URL` / `MOLECULE_TEMPLATES_URL`
  (default: the mlcl repo's raw GitHub URLs once public; `*_FILE` overrides
  for local dev) and `PORT`.
- All write tools are explicit CLI invocations with explicit arguments — no
  background behavior. Anonymous opt-out tool-call telemetry (name/outcome/
  duration only; `MOLECULE_TELEMETRY=0` disables — see the mlcl README's
  "Telemetry & privacy" section).

## Requirements

- Node.js ≥ 22; local mode additionally needs `mlcl` resolvable (override
  with `MOLECULE_MCP_CLI=/path/to/bin/run.js`
  for local/dev use).

## License

Apache-2.0 © [Molecule Dev, Inc.](https://molecule.dev)
