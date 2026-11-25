# molecule-mcp

The [Molecule.dev](https://molecule.dev) MCP server — structured tools over the
`mlcl` CLI for any MCP-capable coding agent, in any JavaScript or TypeScript
project, new or existing: search the `@molecule/*` packages by capability, read
their docs, add and wire them, swap providers, find working examples, run the
project's checks, manage env and deploys, and run hosted tasks (web search, PDF
rendering, image generation, …) with no vendor account. It can also start a new
app from a custom stack or a template.

> On npm as `molecule-mcp`: the `npx -y molecule-mcp` entries below run as
> written. On a machine where npm cannot reach the registry,
> `npx -y --fetch-retries=0 --fetch-timeout=5000 molecule-mcp` starts the cached copy within
> seconds instead of waiting out npm's retries.

Also ships the molecule doctrine as a resource (`molecule://conventions`) and
an `agent_init` tool that writes the convention files your harness reads — so
connecting this ONE server delivers both the capability and the context. Its
startup instructions (sent when your agent connects; clients that show server
instructions put them in context) say when to use Molecule: whenever a task in
a JavaScript or TypeScript project needs a capability, unless the user asked
for another library, search the packages and read their docs before writing the
capability by hand.

The broader agent guide (all harnesses, all wiring methods, example agent
workflows): [../docs/AGENTS-AND-HARNESSES.md](../docs/AGENTS-AND-HARNESSES.md) (in the mlcl repo).

## Install

The one command that works everywhere (uses your harness's own installer when it has one, writes the standard config when it doesn't):

```bash
npx mlcl mcp install
```

For every project on the machine, it installs the server in `~/.mlcl/mcp` and registers
`node ~/.mlcl/mcp/run.mjs`, which starts in about 0.1 s. `npx -y molecule-mcp` asks npm for the
latest version on each start (1–2 s, and over a minute when npm cannot reach the registry), and
some agents begin a session before a slow server is ready. The installed server checks for a new
version once a day, in the background (`MOLECULE_MCP_NO_UPDATE=1` turns that off). A project's own
config keeps `npx -y molecule-mcp`, because the team shares that file.

Or use your harness's native command / config directly (these start the server through npx):

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

Codex does not show an MCP server's instructions to the model, so for Codex `mlcl mcp install` also
writes the Molecule conventions to `~/.codex/AGENTS.md`; after a bare `codex mcp add`, run
`npx mlcl setup --agent codex` for them.

`mlcl mcp install` writes/merges the JSON-config harnesses (Windsurf, VS Code,
OpenCode, Amp, Crush, Kiro, Trae, Zed, Cursor-project) idempotently and never
clobbers existing servers; for the YAML/UI harnesses (Goose, Junie,
Cline/Kilo, Continue, Aider) it prints the exact snippet instead of risking a
mangled config.

Why the long form? A stdio MCP server is a local process the client spawns, so
the client needs its launch command. Shorter paths: the hosted endpoint —
`claude mcp add --transport http molecule https://mcp.molecule.dev/mcp`, one URL for
any HTTP-capable client, or paste it into Lovable/v0/bolt connector forms —
the [Smithery](https://smithery.ai)/[Glama](https://glama.ai)/[PulseMCP](https://www.pulsemcp.com)
registry listings (one-click), and for Claude Code the full plugin once its
marketplace repo is public at launch — `/plugin marketplace add
molecule-dev/molecule-claude-code` then `/plugin install molecule@molecule`
(skills + this server, marketplace-updated).

## Tools

| Tool                                                              | What it does                                                                           |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `search_packages`                                                 | Search `@molecule/*` by capability ("payments", "social login"); the top three show their Quick Start |
| `read_package_doc`                                                | A package's generated usage README (walks up to hoisted node_modules)                  |
| `add_package`                                                     | Install + wire a package (`mlcl add --inject`)                                         |
| `swap_provider`                                                   | Swap a wired provider (`mlcl swap`)                                                    |
| `find_example`                                                    | A working, tested example of a feature, with where each file goes                      |
| `check_project`                                                   | Run the project's typecheck, lint, build and tests; one short report                   |
| `agent_init`                                                      | Write the molecule conventions into this project's agent files                         |
| `list_templates`                                                  | The flagship app gallery (blog, crm, team-chat, …), for a new app                      |
| `scaffold_project`                                                | `mlcl create` unattended, JSON result                                                  |
| `login` / `login_poll`                                            | Browser device-code login (same token as the CLI — see below)                          |
| `whoami` / `logout`                                               | Login status / clear the token                                                         |
| `list_projects`                                                   | Your molecule.dev projects (ids for `create_api_key`)                                  |
| `create_api_key`                                                  | Mint a project API key into the project `.env` (never shown in chat)                   |
| `check_env_vars`                                                  | Which env vars the app needs (code reads + package declarations) and which are missing |
| `list_env_vars` / `get_env_var` / `set_env_var` / `unset_env_var` | Local `.env` CRUD (values masked unless revealed)                                      |
| `push_env_vars` / `pull_env_vars`                                 | Sync local `.env` with the molecule.dev project env                                    |
| `export_project`                                                  | Download the no-lock-in eject bundle (.tar.gz: code + db dump + .env)                  |
| `embed_text`                                                      | Embeddings on molecule.dev, billed to the project — no OpenAI account                  |
| `text_to_speech`                                                  | Speech audio from text on molecule.dev, written to a local file                        |
| `transcribe_audio`                                                | Text from a local audio file on molecule.dev (whisper-1)                               |
| `moderate_content`                                                | Moderation scores for text or a local image on molecule.dev                            |

Plus the `molecule://conventions` resource — the molecule doctrine
(packages before hand-rolled code, bonds for providers, ClassMap, i18n) that
your agent can read as context.

### Example calls

```jsonc
// search_packages — capability search, agent-side package discovery
{ "query": "payments", "stack": "api", "limit": 3 }
// → [{"name":"@molecule/api-payments-stripe","stack":"api","category":"payments",
//      "label":"Stripe","description":"Stripe payment provider…",
//      "install":"mlcl add @molecule/api-payments-stripe --inject"}, …]

// read_package_doc — the package's own generated usage reference
{ "name": "api-payments-stripe", "directory": "/abs/my-project/api" }

// add_package / swap_provider — add a capability to any project, change its vendor
{ "name": "@molecule/api-emails-mailgun" }
{ "new_provider": "@molecule/api-database-mysql", "replace": "@molecule/api-database-postgresql" }

// agent_init — make the current project molecule-aware (idempotent)
{ "directory": "/abs/my-project" }

// scaffold_project — start a new app, unattended, JSON result
{ "name": "my-store", "template": "online-store", "skip_install": false }
// → {"project":"my-store","path":"/abs/my-store","type":"full-stack",
//     "packages":[…],"secrets":["STRIPE_SECRET_KEY",…]}

// a new app from a custom stack instead of a template
{ "name": "api", "type": "api", "packages": "@molecule/api-database-postgresql,@molecule/api-resource-user" }
```

## Hosted services

molecule.dev runs some capabilities for you, so neither your app nor your
agent needs its own vendor account. Each call is metered and billed to one
project, through that project's API key:

1. `login`, then `list_projects` to find the project id.
2. `create_api_key` with `env_file` pointing at the project's `.env`. The
   key is written there as `MOLECULE_API_KEY` (file mode 0600) and is not
   returned to the agent. Check that the file is gitignored.
3. Service tools (`embed_text`, `text_to_speech`, `transcribe_audio`, …) read the key from that `.env` (pass
   `directory`) or from `MOLECULE_API_KEY` in this server's environment.

Key resolution and `env_file` share one rule — the only names either side
accepts are `.env` and `.env.<variant>` (e.g. `.env.local`); placeholder
variants such as `.env.example`, `.env.schema` and `.env.template` are
refused on write and never read. Given a `directory`, resolution checks, in
order:

1. `MOLECULE_API_KEY` in this server's environment (always wins);
2. `directory/.env`, then every `directory/.env.<variant>` in byte order,
   then the same set in `directory/api`;
3. the same two locations in each parent, up to two parents.

Inside one file the ordinary dotenv rules apply (Node's `util.parseEnv`):
inline `#` comments, single/double quotes, an `export` prefix and multi-line
quoted values are handled, and a duplicate assignment resolves to the last
one. `create_api_key` rewrites the key's assignment line — dropping older
duplicates — so the key it mints is always the one a later service call
reads.

The same HTTP API (`POST https://api.molecule.dev/api/v1/services/<service>/<operation>`,
catalog at `GET …/v1/services`) backs the `@molecule/*-molecule` bonds, so
app code reaches the same service through a normal, swappable bond.

## Two modes: local (stdio) and hosted (HTTP)

- **Local stdio** (default, `molecule-mcp`): full tool set, wraps the local
  `mlcl` CLI. What every CLI harness registers.
- **Hosted HTTP** (`molecule-mcp-serve` / `node dist/http.js`): the read-only
  face, live at `https://mcp.molecule.dev/mcp` —
  search/docs/templates/conventions served from the live registry and npm, no
  local install needed. This is the surface URL-based clients use: Lovable
  chat connectors, v0 MCP integrations, bolt.new Connectors, and the short
  install (`claude mcp add --transport http molecule https://mcp.molecule.dev/mcp`).
  Deploy runbook: [DEPLOY.md](DEPLOY.md).

## Login (platform features)

Deploy/env-push/project tools need molecule.dev auth, and the login is the
SAME one the CLI uses — call the `login` tool, show the returned URL + code
to the user, poll with `login_poll` until `logged_in`. The token lands in
`~/.mlcl/credentials.json` and covers every surface at once (this server,
the mlcl CLI, and any CLI process it spawns). CI: set `MOLECULE_TOKEN` to a
personal API token from `mlcl token create <name>`. This server has no
token-minting tool on purpose: a person creates tokens, an agent does not.

## Configuration

- Local mode runs the `mlcl` CLI: `MOLECULE_MCP_CLI=/path/to/mlcl/bin/run.js`
  when set (local/dev), else `mlcl` on PATH (a global install), else the
  published CLI through npx, fetched once when the server starts and then run
  from npx's cache. No separate CLI install is needed.
- Remote mode env: `MOLECULE_REGISTRY_URL` / `MOLECULE_TEMPLATES_URL`
  (default: the mlcl repo's raw GitHub URLs once public; `*_FILE` overrides
  for local dev) and `PORT`.
- All write tools are explicit CLI invocations with explicit arguments — no
  background behavior. Anonymous opt-out tool-call telemetry (name/outcome/
  duration only; `MOLECULE_TELEMETRY=0` disables — see the mlcl README's
  "Telemetry & privacy" section).

## Requirements

- Node.js ≥ 22 (it ships npx). Local mode needs network access to the npm
  registry the first time, unless `mlcl` is installed globally or
  `MOLECULE_MCP_CLI=/path/to/bin/run.js` points at a checkout.

## License

Apache-2.0 © [Molecule Dev, Inc.](https://molecule.dev)
