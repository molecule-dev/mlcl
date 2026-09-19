# mlcl — the Molecule.dev CLI

Scaffold and manage production full-stack apps from 900+ composable,
swappable `@molecule/*` packages.

`mlcl create` gives you a real, conventional TypeScript project — Express API,
React app, database with migrations, auth, i18n — not a toy. Every capability
is a package behind a **bond** (a swappable provider interface), so you can
change PostgreSQL for MySQL, Mailgun for SES, or one OAuth provider for
another by changing one wiring file, not rewriting your app.

- **Start from a working app**: 134 flagship templates (blog, CRM, team chat,
  online store, …) — real screens, real handlers, real data models.
- **Stay decoupled**: cores define interfaces; bonds implement them. Your code
  talks to `bond('email')`, never to a vendor SDK.
- **Own everything**: the output is plain TypeScript you can read, edit, and
  deploy anywhere. Apache-2.0 packages; your app is yours.

## Install

```bash
npm install -g mlcl   # or just use npx mlcl … everywhere
```

Node.js ≥ 22.

> **Status:** `mlcl` (and `molecule-mcp`) publish to npm at launch — the
> `npx mlcl …` commands throughout this README are the install-time interface.
> Until then, run from a repo checkout: `node mlcl/bin/run.js …`. The
> `@molecule/*` packages themselves are public on npm today.

## Quickstart (60 seconds)

```bash
npx mlcl create my-app --template blog --no-interactive
cd my-app
# put credentials in api/.env and app/.env (local defaults work for Postgres/SQLite)
npm run dev            # api on :4000-ish, app on :3000
```

You get: Express API with routes and migrations, React app with real screens,
auth, i18n, tests, e2e specs, `.env` templates, CI security workflows, and an
`AGENTS.md` that teaches any AI coding agent the project's conventions.

## Pick a starting point

**Option A — flagship template (recommended).** A complete, polished app you
shape from:

```bash
npx mlcl templates                       # browse all 134
npx mlcl templates --json | head -30     # machine-readable
npx mlcl create store --template online-store --no-interactive
```

Templates carry their own framework and full package list — no other flags
needed. Try: `blog`, `crm`, `team-chat`, `online-store`, `project-management`,
`helpdesk-ticketing`, `ai-chatbot-builder`, `database-admin`, …
(the full gallery with screenshots: <https://www.molecule.dev/templates>).

**Option B — exactly the stack you want:**

```bash
# Find packages by capability, not by guessing names:
npx mlcl search payments
npx mlcl search "send emails" --stack api
npx mlcl search "social login" --json

# Compose them:
npx mlcl create my-api \
  --type api \
  --packages @molecule/api-database-postgresql,@molecule/api-resource-user \
  --no-interactive

npx mlcl create my-app \
  --type full-stack --framework react \
  --packages @molecule/api-database-postgresql,@molecule/app-auth \
  --no-interactive
```

Types: `api` · `app` · `full-stack` · `static` · `status-page` · `status-page-edge`.
The scaffold auto-resolves default providers, transitive companions, locale
bonds, and template-required packages — you name the capabilities, mlcl closes
the dependency set.

## Grow and reconfigure the project

```bash
# Add a capability: installs the package AND generates its bond wiring,
# peer deps, migrations, and routes in one step:
npx mlcl add @molecule/api-emails-mailgun --inject

# Add without wiring (just the dependency):
npx mlcl add @molecule/api-logger

# Swap a provider — same interface, different vendor, no rewrite:
npx mlcl swap @molecule/api-database-mysql            # PostgreSQL → MySQL
npx mlcl swap @molecule/api-emails-ses -r @molecule/api-emails-mailgun   # several wired? name the one to replace

# Preview what injection would do, change nothing:
npx mlcl inject --dry-run
```

Read any installed package's usage reference — generated, always current:

```bash
less node_modules/@molecule/api-emails-mailgun/README.md
```

**Machine-readable results** (for scripts, CI, and agents):

```bash
npx mlcl search auth --json
npx mlcl create app --type api --packages @molecule/api-database-sqlite \
  --no-interactive --json
```

`create --json` prints a single result object — path, type, packages,
secrets to fill in `.env` — and suppresses all progress chatter.

## Using it with AI agents

Most people build through an agent (Claude Code, Codex, Cursor, Gemini CLI,
OpenCode, Windsurf, Cline, Zed, …). Four ways to wire molecule in — pick any:

| Method | What to run / paste | Get |
|---|---|---|
| **Zero setup** | paste the block below into any agent chat | the agent scaffolds + follows conventions via the CLI |
| **One command** | `npx mlcl agent init` | conventions written into the files your harness reads (AGENTS.md, Cursor rules, Claude skill, Gemini extension, Windsurf rule) |
| **MCP tools** | `npx mlcl mcp install` | the `molecule` MCP server (search/scaffold/add/swap/docs) registered with your harness — works across Claude Code, Codex, Cursor, Gemini CLI, OpenCode, Windsurf, Kiro, Trae, Zed, Amp, Crush, Cline, VS Code, … |
| **Hosted URL** (at launch) | `claude mcp add --transport https https://mcp.molecule.dev/mcp` — or paste the URL into Lovable / v0 / bolt.new connectors | the read tools (search/templates/docs/conventions) with no local install |
| **Claude Code plugin** (at launch) | `/plugin marketplace add molecule-dev/molecule-claude-code` → `/plugin install molecule@molecule` | skills + MCP bundled, marketplace-updated |

The full guide with every harness, config path, and example workflow:
[docs/AGENTS-AND-HARNESSES.md](docs/AGENTS-AND-HARNESSES.md).

The paste-anywhere block:

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

Every project `mlcl create` scaffolds ships an `AGENTS.md` — so whichever
agent opens the project (even one that has never heard of molecule) gets the
conventions in context immediately.

## Using it in an app you already have

`mlcl add` / `mlcl inject` / `mlcl swap` work on any project with a
`package.json` — no re-scaffolding. The realistic flow (build a feature in
the molecule.dev IDE, export, integrate locally) plus the exact conventions
each command looks for: [docs/INTEGRATE-EXISTING-APP.md](docs/INTEGRATE-EXISTING-APP.md).

## Package authors

```bash
npx mlcl init --name api-my-feature --type core --description "Interface for …"
npx mlcl init --name api-my-feature-redis --type provider --category my-feature
npx mlcl validate ./packages/api-my-feature
```

## Telemetry & privacy

`mlcl` (and `molecule-mcp`) collect **anonymous, opt-out usage telemetry** so
development is data-driven: which commands run, whether they succeed, and how
long they take. The pipeline is molecule dogfooding itself — the CLI bonds the
same `@molecule/api-analytics` interface scaffolded apps use.

- **What's collected:** command/tool name, outcome (ok/failed), duration,
  CLI/server version, Node major version, platform/arch — nothing else. No
  paths, no project names, no argument values, no user identity, no code.
- **The only identifier** is a random per-install id (a UUID at
  `~/.mlcl/telemetry-id`). Delete the file to rotate it.
- **Opt out:** `MOLECULE_TELEMETRY=0` (env var, checked per run). Point it
  elsewhere with `MOLECULE_TELEMETRY_URL`, or inspect traffic yourself with
  `MLCL_DEBUG=1` (emit failures are logged).
- **Never breaks anything:** emission is fire-and-forget with a 5s timeout;
  failures are swallowed. With no reachable endpoint the CLI is silent.

## FAQ

**Why does my scaffolded project have a `.npmrc` with `legacy-peer-deps=true`?**
One pinned dev dependency (`eslint-plugin-jsx-a11y`) still declares eslint ^9
peers while the toolchain pins eslint 10. The file explains itself and tells
you when to delete it.

**Where are the docs for package X?** In the package:
`node_modules/@molecule/<name>/README.md` — generated from source, always
current. Online: <https://www.molecule.dev/packages>. Everything concatenated
for LLM consumption: <https://www.molecule.dev/llms-full.txt>.

**Where do secrets go?** `.env` files at each workspace root; the scaffold
prints every key it expects. Never in code.

<!-- usage -->
```sh-session
$ npm install -g mlcl
$ mlcl COMMAND
running command...
$ mlcl (--version)
mlcl/2.0.0 linux-arm64 node-v25.9.0
$ mlcl --help [COMMAND]
USAGE
  $ mlcl COMMAND
...
```
<!-- usagestop -->

<!-- commands -->
* [`mlcl add MOLECULE`](#mlcl-add-molecule)
* [`mlcl agent init`](#mlcl-agent-init)
* [`mlcl create [NAME]`](#mlcl-create-name)
* [`mlcl help [COMMAND]`](#mlcl-help-command)
* [`mlcl init`](#mlcl-init)
* [`mlcl inject`](#mlcl-inject)
* [`mlcl mcp install`](#mlcl-mcp-install)
* [`mlcl search QUERY`](#mlcl-search-query)
* [`mlcl stage down`](#mlcl-stage-down)
* [`mlcl stage list`](#mlcl-stage-list)
* [`mlcl stage logs`](#mlcl-stage-logs)
* [`mlcl stage status [SLUG]`](#mlcl-stage-status-slug)
* [`mlcl stage up`](#mlcl-stage-up)
* [`mlcl swap MOLECULE`](#mlcl-swap-molecule)
* [`mlcl templates`](#mlcl-templates)
* [`mlcl validate`](#mlcl-validate)

## `mlcl add MOLECULE`

Add a molecule package to your project

```
USAGE
  $ mlcl add MOLECULE [--no-install] [-D] [--inject]

ARGUMENTS
  MOLECULE  Molecule package name

FLAGS
  -D, --dev         Add as dev dependency
      --inject      Run mlcl inject immediately after adding (installs + wires the package)
      --no-install  Skip npm install

DESCRIPTION
  Add a molecule package to your project

EXAMPLES
  $ mlcl add @molecule/api-resource-user

  $ mlcl add @molecule/api-oauth-github --no-install

  $ mlcl add @molecule/api-emails-mailgun --inject
```

_See code: [src/commands/add.ts](https://github.com/molecule-dev/mlcl/blob/v2.0.0/src/commands/add.ts)_

## `mlcl agent init`

Make your AI coding agent (Claude Code, Codex, Cursor, Pi, …) molecule-aware: writes the Molecule conventions + mlcl quickstart into the agent instruction files it reads

```
USAGE
  $ mlcl agent init [--agent auto|claude-code|cursor|codex|zcode|gemini|windsurf|generic|pi] [--global] [--force]

FLAGS
  --agent=<option>  Which harness to target (default: auto-detect from project markers)
                    <options: auto|claude-code|cursor|codex|zcode|gemini|windsurf|generic|pi>
  --force           Rewrite the Molecule section even if already present
  --global          Write to the harness-wide instructions file instead of this project (claude-code, codex, gemini)

DESCRIPTION
  Make your AI coding agent (Claude Code, Codex, Cursor, Pi, …) molecule-aware: writes the Molecule conventions + mlcl
  quickstart into the agent instruction files it reads

EXAMPLES
  $ mlcl agent init            # detect harness in this project and wire it up

  $ mlcl agent init --agent cursor

  $ mlcl agent init --agent claude-code --global   # every project, not just this one
```

_See code: [src/commands/agent/init.ts](https://github.com/molecule-dev/mlcl/blob/v2.0.0/src/commands/agent/init.ts)_

## `mlcl create [NAME]`

Create a new project

```
USAGE
  $ mlcl create [NAME] [--skip-install] [--type api|app|full-stack|static|status-page|status-page-edge]
    [--framework <value>] [--packages <value>] [--theme <value>] [--no-interactive] [--json] [--template <value>]

ARGUMENTS
  [NAME]  Project name

FLAGS
  --framework=<value>  Frontend framework (app only)
  --json               Print a machine-readable JSON result instead of progress output (implies --no-interactive)
  --no-interactive     Run without interactive prompts (requires --type and name arg)
  --packages=<value>   Comma-separated list of @molecule package names to include
  --skip-install       Skip npm install
  --template=<value>   App template slug (e.g., blog, crm, online-store). Run `mlcl templates` to list all available
                       templates.
  --theme=<value>      Theme preset name (e.g. liquid-glass)
  --type=<option>      Project type (api, app, or full-stack)
                       <options: api|app|full-stack|static|status-page|status-page-edge>

DESCRIPTION
  Create a new project

EXAMPLES
  $ mlcl create my-app

  $ mlcl create my-app --skip-install

  $ mlcl create my-api --type api --packages @molecule/api-database-postgresql,@molecule/api-resource-user --no-interactive

  $ mlcl create my-app --type app --framework react --packages @molecule/app-state-zustand --no-interactive

  $ mlcl create my-project --type full-stack --framework react --packages @molecule/api-database-postgresql,@molecule/app-auth --no-interactive
```

_See code: [src/commands/create.ts](https://github.com/molecule-dev/mlcl/blob/v2.0.0/src/commands/create.ts)_

## `mlcl help [COMMAND]`

Display help for mlcl.

```
USAGE
  $ mlcl help [COMMAND...] [-n]

ARGUMENTS
  [COMMAND...]  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for mlcl.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/6.2.55/src/commands/help.ts)_

## `mlcl init`

Initialize a new molecule package

```
USAGE
  $ mlcl init [-n <value>] [-t
    core|provider|resource|middleware|utility|infrastructure|framework|feature|native] [-c <value>] [-d <value>] [-s
    api|app] [--implements <value>] [--label <value>] [--interactive] [-f] [--dir <value>]

FLAGS
  -c, --category=<value>     Feature category (e.g., database, payments, email, cache, ai)
  -d, --description=<value>  Package description
  -f, --force                Overwrite existing files
  -n, --name=<value>         Package name (without @molecule/ prefix)
  -s, --stack=<option>       Stack: api (backend) or app (frontend)
                             <options: api|app>
  -t, --type=<option>        Package type
                             <options:
                             core|provider|resource|middleware|utility|infrastructure|framework|feature|native>
      --dir=<value>          Target directory (default: cwd)
      --implements=<value>   Core interface this provider implements (e.g., @molecule/api-cache)
      --[no-]interactive     Interactive mode (default: true)
      --label=<value>        Human-readable label for UI

DESCRIPTION
  Initialize a new molecule package

EXAMPLES
  $ mlcl init

  $ mlcl init --name api-ai --type core --description "AI provider interface"

  $ mlcl init --name api-cache-redis --type provider --category cache --description "Redis cache" --implements @molecule/api-cache --no-interactive
```

_See code: [src/commands/init.ts](https://github.com/molecule-dev/mlcl/blob/v2.0.0/src/commands/init.ts)_

## `mlcl inject`

Execute molecule injection with preview

```
USAGE
  $ mlcl inject [--dry-run] [-f] [-m <value>] [-p <value>] [--install] [--test] [--format] [--ai]

FLAGS
  -f, --force             Overwrite existing files and skip confirmation prompts
  -m, --molecule=<value>  Specific molecule to inject
  -p, --path=<value>      [default: .] Path to the project
      --[no-]ai           Use AI for code generation (falls back to heuristics when disabled)
      --dry-run           Show what would be done without making changes
      --[no-]format       Format generated code with Prettier
      --[no-]install      Run npm install after injection
      --[no-]test         Run smoke tests after injection

DESCRIPTION
  Execute molecule injection with preview

EXAMPLES
  $ mlcl inject

  $ mlcl inject --dry-run

  $ mlcl inject -m @molecule/api-resource-user

  $ mlcl inject --no-install
```

_See code: [src/commands/inject.ts](https://github.com/molecule-dev/mlcl/blob/v2.0.0/src/commands/inject.ts)_

## `mlcl mcp install`

Register the molecule MCP server with your coding agent — one command that uses the harness’s own native installer when it has one (claude/cursor/gemini/codex) and writes the standard config for the rest

```
USAGE
  $ mlcl mcp install [--agent
    claude-code|cursor|gemini|codex|windsurf|vscode|cursor-project|opencode|amp|crush|kiro|trae|zed|goose|junie|cline|co
    ntinue|aider|auto] [--project]

FLAGS
  --agent=<option>  Which harness to configure (default: auto-detect)
                    <options: claude-code|cursor|gemini|codex|windsurf|vscode|cursor-project|opencode|amp|crush|kiro|tra
                    e|zed|goose|junie|cline|continue|aider|auto>
  --project         Register at project level where the harness supports it (default: user/global)

DESCRIPTION
  Register the molecule MCP server with your coding agent — one command that uses the harness’s own native installer
  when it has one (claude/cursor/gemini/codex) and writes the standard config for the rest

EXAMPLES
  $ mlcl mcp install             # detect the harness and register

  $ mlcl mcp install --agent cursor

  $ mlcl mcp install --agent vscode --project
```

_See code: [src/commands/mcp/install.ts](https://github.com/molecule-dev/mlcl/blob/v2.0.0/src/commands/mcp/install.ts)_

## `mlcl search QUERY`

Search @molecule/* packages by name or capability (e.g. "payments", "social login", "file uploads")

```
USAGE
  $ mlcl search QUERY [--stack api|app] [--limit <value>] [--json]

ARGUMENTS
  QUERY  Search query

FLAGS
  --json            Output machine-readable JSON (one array of hits)
  --limit=<value>   [default: 20] Maximum number of results
  --stack=<option>  Restrict to one stack
                    <options: api|app>

DESCRIPTION
  Search @molecule/* packages by name or capability (e.g. "payments", "social login", "file uploads")

EXAMPLES
  $ mlcl search payments

  $ mlcl search "send emails" --stack api

  $ mlcl search database --json
```

_See code: [src/commands/search.ts](https://github.com/molecule-dev/mlcl/blob/v2.0.0/src/commands/search.ts)_

## `mlcl stage down`

Tear down a staging environment

```
USAGE
  $ mlcl stage down [-b <value>] [--all] [-f] [-p <value>]

FLAGS
  -b, --branch=<value>        Branch name or slug to tear down (defaults to current branch)
  -f, --force                 Skip confirmation prompt
  -p, --project-path=<value>  [default: .] Path to the project root
      --all                   Tear down all staging environments

DESCRIPTION
  Tear down a staging environment

EXAMPLES
  $ mlcl stage down

  $ mlcl stage down --branch feature/login

  $ mlcl stage down --all
```

_See code: [src/commands/stage/down.ts](https://github.com/molecule-dev/mlcl/blob/v2.0.0/src/commands/stage/down.ts)_

## `mlcl stage list`

List all active staging environments

```
USAGE
  $ mlcl stage list [--json] [-p <value>]

FLAGS
  -p, --project-path=<value>  [default: .] Path to the project root
      --json                  Output as JSON

DESCRIPTION
  List all active staging environments

EXAMPLES
  $ mlcl stage list

  $ mlcl stage list --json
```

_See code: [src/commands/stage/list.ts](https://github.com/molecule-dev/mlcl/blob/v2.0.0/src/commands/stage/list.ts)_

## `mlcl stage logs`

View logs from a staging environment

```
USAGE
  $ mlcl stage logs [-s api|app|db|all] [-n <value>] [-b <value>] [-p <value>]

FLAGS
  -b, --branch=<value>        Branch name or slug (defaults to current branch)
  -n, --tail=<value>          [default: 100] Number of lines to show
  -p, --project-path=<value>  [default: .] Path to the project root
  -s, --service=<option>      [default: all] Service to view logs for
                              <options: api|app|db|all>

DESCRIPTION
  View logs from a staging environment

EXAMPLES
  $ mlcl stage logs

  $ mlcl stage logs --service api --tail 50

  $ mlcl stage logs -b feature/login
```

_See code: [src/commands/stage/logs.ts](https://github.com/molecule-dev/mlcl/blob/v2.0.0/src/commands/stage/logs.ts)_

## `mlcl stage status [SLUG]`

Show detailed status of a staging environment

```
USAGE
  $ mlcl stage status [SLUG] [-p <value>]

ARGUMENTS
  [SLUG]  Branch name or slug (defaults to current branch)

FLAGS
  -p, --project-path=<value>  [default: .] Path to the project root

DESCRIPTION
  Show detailed status of a staging environment

EXAMPLES
  $ mlcl stage status

  $ mlcl stage status feat-login
```

_See code: [src/commands/stage/status.ts](https://github.com/molecule-dev/mlcl/blob/v2.0.0/src/commands/stage/status.ts)_

## `mlcl stage up`

Deploy a staging environment for the current branch

```
USAGE
  $ mlcl stage up [-b <value>] [-d <value>] [--skip-build] [-p <value>]

FLAGS
  -b, --branch=<value>        Branch name (defaults to current git branch)
  -d, --driver=<value>        Staging driver to use (defaults to first available)
  -p, --project-path=<value>  [default: .] Path to the project root
      --skip-build            Skip building before deploying

DESCRIPTION
  Deploy a staging environment for the current branch

EXAMPLES
  $ mlcl stage up

  $ mlcl stage up --branch feature/login

  $ mlcl stage up --skip-build
```

_See code: [src/commands/stage/up.ts](https://github.com/molecule-dev/mlcl/blob/v2.0.0/src/commands/stage/up.ts)_

## `mlcl swap MOLECULE`

Swap a molecule provider for another implementing the same interface

```
USAGE
  $ mlcl swap MOLECULE [-r <value>] [--no-interactive] [--install] [--format]

ARGUMENTS
  MOLECULE  New molecule provider to swap in

FLAGS
  -r, --replace=<value>  Specific provider to replace (for multi-provider categories)
      --[no-]format      Run prettier after swap
      --[no-]install     Run npm install after swap
      --no-interactive   Skip confirmation prompt

DESCRIPTION
  Swap a molecule provider for another implementing the same interface

EXAMPLES
  $ mlcl swap @molecule/app-icons-lucide

  $ mlcl swap @molecule/api-database-mysql --no-interactive

  $ mlcl swap @molecule/api-oauth-apple --replace @molecule/api-oauth-github
```

_See code: [src/commands/swap.ts](https://github.com/molecule-dev/mlcl/blob/v2.0.0/src/commands/swap.ts)_

## `mlcl templates`

List flagship app templates for mlcl create --template <slug> (blog, crm, team-chat, …)

```
USAGE
  $ mlcl templates [--json]

FLAGS
  --json  Output machine-readable JSON

DESCRIPTION
  List flagship app templates for mlcl create --template <slug> (blog, crm, team-chat, …)

EXAMPLES
  $ mlcl templates

  $ mlcl templates --json
```

_See code: [src/commands/templates.ts](https://github.com/molecule-dev/mlcl/blob/v2.0.0/src/commands/templates.ts)_

## `mlcl validate`

Validate a molecule package structure and conventions

```
USAGE
  $ mlcl validate [-p <value>] [--json]

FLAGS
  -p, --path=<value>  [default: .] Path to the molecule package
      --json          Output results as JSON

DESCRIPTION
  Validate a molecule package structure and conventions

EXAMPLES
  $ mlcl validate

  $ mlcl validate --path /path/to/molecule

  $ mlcl validate --json
```

_See code: [src/commands/validate.ts](https://github.com/molecule-dev/mlcl/blob/v2.0.0/src/commands/validate.ts)_
<!-- commandsstop -->

## Documentation

- [Molecule.dev](https://www.molecule.dev) — the platform
- [Package catalog](https://www.molecule.dev/packages) — every `@molecule/*` package
- [Templates gallery](https://www.molecule.dev/templates)
- [AI agents guide](docs/AGENTS-AND-HARNESSES.md) — every harness, every method
- [Integrating into an existing app](docs/INTEGRATE-EXISTING-APP.md)
- [Graduating from a vibe-coded prototype](docs/FROM-VIBECODING.md) — Lovable / v0 / bolt.new / Replit → production

## License

Apache-2.0 © [Molecule Dev, Inc.](https://molecule.dev)
