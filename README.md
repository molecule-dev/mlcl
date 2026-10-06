# mlcl — the Molecule.dev CLI

Scaffold and manage production full-stack apps from 1000+ composable,
swappable `@molecule/*` packages.

`mlcl create` gives you a real, conventional TypeScript project — Express API,
React app, database with migrations, auth, i18n — not a toy. Every capability
is a package behind a **bond** (a swappable provider interface), so you can
change PostgreSQL for MySQL, Mailgun for SES, or one OAuth provider for
another by changing one wiring file, not rewriting your app.

- **Start from a working app**: 152+ flagship templates (blog, CRM, team chat,
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
npx mlcl templates                       # browse all 150
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

## Operate the project (env, database, deploy)

The IDE's operational surface, on your machine:

```bash
# Environment variables — local .env (format-preserving, values masked on list):
npx mlcl env list --raw
npx mlcl env set STRIPE_SECRET_KEY=sk_test_…
npx mlcl env get DATABASE_URL          # for scripts: $(mlcl env get DATABASE_URL)
npx mlcl env unset STRIPE_SECRET_KEY   # comments out, value preserved

# Database:
npx mlcl db migrate                    # runs the scaffolded migrate.ts
npx mlcl db reset --force              # drop/recreate + migrate (DESTRUCTIVE)
npx mlcl db console                    # psql on the project DB
npx mlcl db url                        # print DATABASE_URL (resolves .env)

# Local staging environment (per-branch, Docker Compose):
npx mlcl stage up && npx mlcl stage logs --service api

# molecule.dev platform operations (log in once):
npx mlcl login                         # opens your browser → click Approve → done
npx mlcl login --no-browser            # SSH/remote: prints the URL instead of opening it
npx mlcl project list                  # your projects + roles
npx mlcl env push --project <id>       # local .env → the project's env (IDE editor route)
npx mlcl env pull --project <id>       # project env → local (secrets skipped, write-only)
npx mlcl deploy --project <id> --follow  # production deploy, same pipeline as the IDE button

# Platform operations against a project (mlcl project open <id> first for URLs):
npx mlcl sandbox status|start|stop|restart --project <id>
npx mlcl sandbox exec --project <id> -- npm test
npx mlcl snapshot create|list|restore|rm --project <id>
npx mlcl git push|pull --project <id>
npx mlcl deploy list|status|cancel --project <id>
npx mlcl deploy workflow-github --project <id> [--apply]
npx mlcl domain list|add|verify|rm --project <id>
npx mlcl apikey list|create|rm --project <id>
npx mlcl team list|invite|revoke|set-role|rm --project <id>
npx mlcl share list|create|rm --project <id>
npx mlcl build mobile|desktop|list|status --project <id>
npx mlcl usage [--project <id>] && npx mlcl usage tiers
npx mlcl db backup|backup-list|restore --project <id>
npx mlcl db info|tables|query --project <id>  # cloud DB inspection
npx mlcl project open <id>                    # prints workspace + preview URLs
npx mlcl project get|settings|delete --project <id>
npx mlcl logs --project <id> [--stream]       # runtime logs (live tail)
npx mlcl egress get/approve/revoke --project <id>
npx mlcl vault list/set/rm --project <id>     # managed secrets
npx mlcl vault token --project <id>           # mint/revoke mvt_ runtime tokens
npx mlcl vault broker --project <id>          # enable/disable credential broker
npx mlcl import repos/source/upload --project <id>
npx mlcl git ssh-key --project <id> <key-path>
npx mlcl invitations list/accept/decline
npx mlcl profile get/update
npx mlcl status                               # molecule.dev status feed
npx mlcl activities list --project <id>
npx mlcl tasks list/cancel --project <id>
npx mlcl models                               # AI model catalog
npx mlcl account delete/export

# Devices/sessions (the kill-switch for a stolen login — each CLI token is a device):
npx mlcl device list                   # all logged-in browsers + CLIs, current marked
npx mlcl device current                # this machine's device id (offline)
npx mlcl device rename <id> "laptop"   # label it in the IDE session list
npx mlcl device revoke <id>            # kills that token (~10s)
npx mlcl device revoke --all-but-current   # sign out everywhere except here
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
| **Hosted URL** | `claude mcp add --transport http molecule https://mcp.molecule.dev/mcp` — or paste the URL into Lovable / v0 / bolt.new / Base44 connectors | the read tools (search/templates/docs/conventions) with no local install |
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
  CLI/server version, Node major version, platform/arch, and — for the
  commands that take them — the template name and the names of public
  `@molecule/*` packages. No paths, no project names, no search text, no
  private package names, no user identity, no code.
- **The only identifier** is a random per-install id (a UUID at
  `~/.mlcl/telemetry-id`). Delete the file to rotate it.
- **Opt out:** `MOLECULE_TELEMETRY=0` or `DO_NOT_TRACK=1` (env vars, checked per run). Point it
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
mlcl/2.1.0 linux-arm64 node-v25.9.0
$ mlcl --help [COMMAND]
USAGE
  $ mlcl COMMAND
...
```
<!-- usagestop -->

<!-- commands -->
* [`mlcl account delete`](#mlcl-account-delete)
* [`mlcl account export`](#mlcl-account-export)
* [`mlcl activities list`](#mlcl-activities-list)
* [`mlcl add MOLECULE`](#mlcl-add-molecule)
* [`mlcl agent init`](#mlcl-agent-init)
* [`mlcl apikey create`](#mlcl-apikey-create)
* [`mlcl apikey list`](#mlcl-apikey-list)
* [`mlcl apikey rm KEYID`](#mlcl-apikey-rm-keyid)
* [`mlcl auth login`](#mlcl-auth-login)
* [`mlcl auth logout`](#mlcl-auth-logout)
* [`mlcl auth whoami`](#mlcl-auth-whoami)
* [`mlcl build desktop`](#mlcl-build-desktop)
* [`mlcl build list`](#mlcl-build-list)
* [`mlcl build mobile`](#mlcl-build-mobile)
* [`mlcl build status`](#mlcl-build-status)
* [`mlcl create [NAME]`](#mlcl-create-name)
* [`mlcl db backup`](#mlcl-db-backup)
* [`mlcl db backup-list`](#mlcl-db-backup-list)
* [`mlcl db console`](#mlcl-db-console)
* [`mlcl db info`](#mlcl-db-info)
* [`mlcl db migrate`](#mlcl-db-migrate)
* [`mlcl db query SQL`](#mlcl-db-query-sql)
* [`mlcl db reset`](#mlcl-db-reset)
* [`mlcl db restore BACKUPID`](#mlcl-db-restore-backupid)
* [`mlcl db tables`](#mlcl-db-tables)
* [`mlcl db url`](#mlcl-db-url)
* [`mlcl deploy`](#mlcl-deploy)
* [`mlcl deploy cancel`](#mlcl-deploy-cancel)
* [`mlcl deploy list`](#mlcl-deploy-list)
* [`mlcl deploy status`](#mlcl-deploy-status)
* [`mlcl deploy workflow-github`](#mlcl-deploy-workflow-github)
* [`mlcl deploy workflow-gitlab`](#mlcl-deploy-workflow-gitlab)
* [`mlcl device current`](#mlcl-device-current)
* [`mlcl device list`](#mlcl-device-list)
* [`mlcl device rename ID NAME`](#mlcl-device-rename-id-name)
* [`mlcl device revoke [ID]`](#mlcl-device-revoke-id)
* [`mlcl domain add DOMAIN`](#mlcl-domain-add-domain)
* [`mlcl domain list`](#mlcl-domain-list)
* [`mlcl domain rm DOMAINID`](#mlcl-domain-rm-domainid)
* [`mlcl domain verify DOMAINID`](#mlcl-domain-verify-domainid)
* [`mlcl egress approve HOST`](#mlcl-egress-approve-host)
* [`mlcl egress get`](#mlcl-egress-get)
* [`mlcl egress revoke HOST`](#mlcl-egress-revoke-host)
* [`mlcl env check`](#mlcl-env-check)
* [`mlcl env detected`](#mlcl-env-detected)
* [`mlcl env get KEY`](#mlcl-env-get-key)
* [`mlcl env list`](#mlcl-env-list)
* [`mlcl env pull`](#mlcl-env-pull)
* [`mlcl env push`](#mlcl-env-push)
* [`mlcl env set PAIR [VALUE]`](#mlcl-env-set-pair-value)
* [`mlcl env unset KEY`](#mlcl-env-unset-key)
* [`mlcl git pull`](#mlcl-git-pull)
* [`mlcl git push`](#mlcl-git-push)
* [`mlcl git ssh-key PATH`](#mlcl-git-ssh-key-path)
* [`mlcl help [COMMAND]`](#mlcl-help-command)
* [`mlcl import repos`](#mlcl-import-repos)
* [`mlcl import source`](#mlcl-import-source)
* [`mlcl import upload PATH`](#mlcl-import-upload-path)
* [`mlcl init`](#mlcl-init)
* [`mlcl inject`](#mlcl-inject)
* [`mlcl invitations accept INVITEID`](#mlcl-invitations-accept-inviteid)
* [`mlcl invitations decline INVITEID`](#mlcl-invitations-decline-inviteid)
* [`mlcl invitations list`](#mlcl-invitations-list)
* [`mlcl login`](#mlcl-login)
* [`mlcl logout`](#mlcl-logout)
* [`mlcl logs`](#mlcl-logs)
* [`mlcl mcp install`](#mlcl-mcp-install)
* [`mlcl models`](#mlcl-models)
* [`mlcl profile get`](#mlcl-profile-get)
* [`mlcl profile update`](#mlcl-profile-update)
* [`mlcl project create NAME`](#mlcl-project-create-name)
* [`mlcl project delete`](#mlcl-project-delete)
* [`mlcl project export ID`](#mlcl-project-export-id)
* [`mlcl project get ID`](#mlcl-project-get-id)
* [`mlcl project list`](#mlcl-project-list)
* [`mlcl project open NAMEORID`](#mlcl-project-open-nameorid)
* [`mlcl project settings`](#mlcl-project-settings)
* [`mlcl sandbox exec`](#mlcl-sandbox-exec)
* [`mlcl sandbox restart`](#mlcl-sandbox-restart)
* [`mlcl sandbox start`](#mlcl-sandbox-start)
* [`mlcl sandbox status`](#mlcl-sandbox-status)
* [`mlcl sandbox stop`](#mlcl-sandbox-stop)
* [`mlcl search QUERY`](#mlcl-search-query)
* [`mlcl share clone SLUG`](#mlcl-share-clone-slug)
* [`mlcl share create`](#mlcl-share-create)
* [`mlcl share list`](#mlcl-share-list)
* [`mlcl share rm SHAREID`](#mlcl-share-rm-shareid)
* [`mlcl share visibility`](#mlcl-share-visibility)
* [`mlcl snapshot create`](#mlcl-snapshot-create)
* [`mlcl snapshot list`](#mlcl-snapshot-list)
* [`mlcl snapshot restore SNAPID`](#mlcl-snapshot-restore-snapid)
* [`mlcl snapshot rm SNAPID`](#mlcl-snapshot-rm-snapid)
* [`mlcl stage down`](#mlcl-stage-down)
* [`mlcl stage list`](#mlcl-stage-list)
* [`mlcl stage logs`](#mlcl-stage-logs)
* [`mlcl stage status [SLUG]`](#mlcl-stage-status-slug)
* [`mlcl stage up`](#mlcl-stage-up)
* [`mlcl status`](#mlcl-status)
* [`mlcl swap MOLECULE`](#mlcl-swap-molecule)
* [`mlcl sync [DIR]`](#mlcl-sync-dir)
* [`mlcl tasks cancel TASKID`](#mlcl-tasks-cancel-taskid)
* [`mlcl tasks list`](#mlcl-tasks-list)
* [`mlcl team invite`](#mlcl-team-invite)
* [`mlcl team list`](#mlcl-team-list)
* [`mlcl team revoke INVITEID`](#mlcl-team-revoke-inviteid)
* [`mlcl team rm MEMBERID`](#mlcl-team-rm-memberid)
* [`mlcl team set-role MEMBERID ROLE`](#mlcl-team-set-role-memberid-role)
* [`mlcl templates`](#mlcl-templates)
* [`mlcl transcripts import [FILES]`](#mlcl-transcripts-import-files)
* [`mlcl transcripts list`](#mlcl-transcripts-list)
* [`mlcl transcripts rm TRANSCRIPTID`](#mlcl-transcripts-rm-transcriptid)
* [`mlcl usage`](#mlcl-usage)
* [`mlcl usage chat`](#mlcl-usage-chat)
* [`mlcl usage tiers`](#mlcl-usage-tiers)
* [`mlcl validate`](#mlcl-validate)
* [`mlcl vault broker`](#mlcl-vault-broker)
* [`mlcl vault list`](#mlcl-vault-list)
* [`mlcl vault rm KEY`](#mlcl-vault-rm-key)
* [`mlcl vault set KEY VALUE`](#mlcl-vault-set-key-value)
* [`mlcl vault token`](#mlcl-vault-token)
* [`mlcl whoami`](#mlcl-whoami)

## `mlcl account delete`

Delete your molecule.dev account (DESTRUCTIVE — all projects, sandboxes, data)

```
USAGE
  $ mlcl account delete -p <value> [--force]

FLAGS
  -p, --project=<value>  (required) molecule.dev project id
      --force            skip confirmation

DESCRIPTION
  Delete your molecule.dev account (DESTRUCTIVE — all projects, sandboxes, data)

EXAMPLES
  $ mlcl account delete --force
```

_See code: [src/commands/account/delete.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/account/delete.ts)_

## `mlcl account export`

GDPR data export (all your data as JSON)

```
USAGE
  $ mlcl account export -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  GDPR data export (all your data as JSON)

EXAMPLES
  $ mlcl account export
```

_See code: [src/commands/account/export.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/account/export.ts)_

## `mlcl activities list`

List captured side effects (emails, webhooks, etc.) for a project

```
USAGE
  $ mlcl activities list -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  List captured side effects (emails, webhooks, etc.) for a project

EXAMPLES
  $ mlcl activities list --project <id>
```

_See code: [src/commands/activities/list.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/activities/list.ts)_

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

_See code: [src/commands/add.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/add.ts)_

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

_See code: [src/commands/agent/init.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/agent/init.ts)_

## `mlcl apikey create`

Mint a project API key

```
USAGE
  $ mlcl apikey create -p <value> --name <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id
      --name=<value>     (required) key name

DESCRIPTION
  Mint a project API key

EXAMPLES
  $ mlcl apikey create --project <id> --name ci
```

_See code: [src/commands/apikey/create.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/apikey/create.ts)_

## `mlcl apikey list`

List project API keys

```
USAGE
  $ mlcl apikey list -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  List project API keys

EXAMPLES
  $ mlcl apikey list --project <id>
```

_See code: [src/commands/apikey/list.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/apikey/list.ts)_

## `mlcl apikey rm KEYID`

Revoke a project API key

```
USAGE
  $ mlcl apikey rm KEYID -p <value>

ARGUMENTS
  KEYID  key id

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Revoke a project API key

EXAMPLES
  $ mlcl apikey rm --project <id> <keyId>
```

_See code: [src/commands/apikey/rm.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/apikey/rm.ts)_

## `mlcl auth login`

Log the CLI in to molecule.dev — opens your browser to approve (device-code flow); stores a 90-day token at ~/.mlcl/credentials.json

```
USAGE
  $ mlcl auth login [--token <value>] [--with-token] [--no-browser]

FLAGS
  --no-browser     Print the approval URL without trying to open a browser (SSH/remote).
  --token=<value>  Headless: pass a token directly (EXPOSES it in the process list — prefer --with-token or the
                   MOLECULE_TOKEN env var).
  --with-token     Read the token from stdin (gh-style; safe for process lists).

DESCRIPTION
  Log the CLI in to molecule.dev — opens your browser to approve (device-code flow); stores a 90-day token at
  ~/.mlcl/credentials.json

ALIASES
  $ mlcl login

EXAMPLES
  $ mlcl login

  $ mlcl login --no-browser

  $ mlcl login --token <jwt>
```

_See code: [src/commands/auth/login.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/auth/login.ts)_

## `mlcl auth logout`

Remove the stored molecule.dev token

```
USAGE
  $ mlcl auth logout

DESCRIPTION
  Remove the stored molecule.dev token

ALIASES
  $ mlcl logout
```

_See code: [src/commands/auth/logout.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/auth/logout.ts)_

## `mlcl auth whoami`

Show the logged-in molecule.dev account

```
USAGE
  $ mlcl auth whoami [--json]

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Show the logged-in molecule.dev account

ALIASES
  $ mlcl whoami
```

_See code: [src/commands/auth/whoami.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/auth/whoami.ts)_

## `mlcl build desktop`

Start a desktop build

```
USAGE
  $ mlcl build desktop -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Start a desktop build

EXAMPLES
  $ mlcl build desktop --project <id>
```

_See code: [src/commands/build/desktop.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/build/desktop.ts)_

## `mlcl build list`

List builds

```
USAGE
  $ mlcl build list -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  List builds

EXAMPLES
  $ mlcl build list --project <id>
```

_See code: [src/commands/build/list.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/build/list.ts)_

## `mlcl build mobile`

Start a mobile build

```
USAGE
  $ mlcl build mobile -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Start a mobile build

EXAMPLES
  $ mlcl build mobile --project <id>
```

_See code: [src/commands/build/mobile.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/build/mobile.ts)_

## `mlcl build status`

Build detail incl. log

```
USAGE
  $ mlcl build status -p <value> --build <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id
      --build=<value>    (required)

DESCRIPTION
  Build detail incl. log

EXAMPLES
  $ mlcl build status --project <id> --build <id>
```

_See code: [src/commands/build/status.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/build/status.ts)_

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

_See code: [src/commands/create.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/create.ts)_

## `mlcl db backup`

Create a cloud database backup

```
USAGE
  $ mlcl db backup -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Create a cloud database backup

EXAMPLES
  $ mlcl db backup --project <id>
```

_See code: [src/commands/db/backup.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/db/backup.ts)_

## `mlcl db backup-list`

List cloud database backups

```
USAGE
  $ mlcl db backup-list -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  List cloud database backups

EXAMPLES
  $ mlcl db backup-list --project <id>
```

_See code: [src/commands/db/backup-list.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/db/backup-list.ts)_

## `mlcl db console`

Open a psql console on the project database (mlcl db url | psql, with flags forwarded)

```
USAGE
  $ mlcl db console

DESCRIPTION
  Open a psql console on the project database (mlcl db url | psql, with flags forwarded)

EXAMPLES
  $ mlcl db console

  $ mlcl db console -- -c "\dt"
```

_See code: [src/commands/db/console.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/db/console.ts)_

## `mlcl db info`

Cloud database connection info (password masked)

```
USAGE
  $ mlcl db info -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Cloud database connection info (password masked)

EXAMPLES
  $ mlcl db info --project <id>
```

_See code: [src/commands/db/info.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/db/info.ts)_

## `mlcl db migrate`

Run the project’s database migrations (the scaffolded api/src/scripts/migrate.ts)

```
USAGE
  $ mlcl db migrate [--fresh]

FLAGS
  --fresh  Drop/recreate the database first (DESTRUCTIVE)

DESCRIPTION
  Run the project’s database migrations (the scaffolded api/src/scripts/migrate.ts)

EXAMPLES
  $ mlcl db migrate

  $ mlcl db migrate --fresh
```

_See code: [src/commands/db/migrate.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/db/migrate.ts)_

## `mlcl db query SQL`

Run SQL against the cloud database (read queries recommended)

```
USAGE
  $ mlcl db query SQL -p <value>

ARGUMENTS
  SQL  SQL statement

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Run SQL against the cloud database (read queries recommended)

EXAMPLES
  $ mlcl db query --project <id> "SELECT * FROM users LIMIT 5"
```

_See code: [src/commands/db/query.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/db/query.ts)_

## `mlcl db reset`

Drop and recreate the project database, then run migrations + package setup SQL

```
USAGE
  $ mlcl db reset [--force]

FLAGS
  --force  Skip the confirmation prompt

DESCRIPTION
  Drop and recreate the project database, then run migrations + package setup SQL

EXAMPLES
  $ mlcl db reset
```

_See code: [src/commands/db/reset.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/db/reset.ts)_

## `mlcl db restore BACKUPID`

Restore a cloud backup (DESTRUCTIVE)

```
USAGE
  $ mlcl db restore BACKUPID -p <value>

ARGUMENTS
  BACKUPID  backup id

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Restore a cloud backup (DESTRUCTIVE)

EXAMPLES
  $ mlcl db restore --project <id> <backupId>
```

_See code: [src/commands/db/restore.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/db/restore.ts)_

## `mlcl db tables`

Cloud database schema tables

```
USAGE
  $ mlcl db tables -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Cloud database schema tables

EXAMPLES
  $ mlcl db tables --project <id>
```

_See code: [src/commands/db/tables.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/db/tables.ts)_

## `mlcl db url`

Print the project’s DATABASE_URL (resolving .env when not exported)

```
USAGE
  $ mlcl db url [--json] [--app]

FLAGS
  --app  Read from app/.env (rare)

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Print the project’s DATABASE_URL (resolving .env when not exported)

EXAMPLES
  $ mlcl db url

  psql "$(mlcl db url)"
```

_See code: [src/commands/db/url.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/db/url.ts)_

## `mlcl deploy`

Deploy a molecule.dev project to production (builds in the sandbox, launches the runtime container — same pipeline as the IDE’s Deploy button)

```
USAGE
  $ mlcl deploy -p <value> [--follow]

FLAGS
  -p, --project=<value>  (required) molecule.dev project id
      --follow           Poll until the deploy finishes and print the live URL

DESCRIPTION
  Deploy a molecule.dev project to production (builds in the sandbox, launches the runtime container — same pipeline as
  the IDE’s Deploy button)

EXAMPLES
  $ mlcl deploy --project <id>

  $ mlcl deploy --project <id> --follow
```

_See code: [src/commands/deploy/index.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/deploy/index.ts)_

## `mlcl deploy cancel`

Cancel a running deployment

```
USAGE
  $ mlcl deploy cancel -p <value> --deployment <value>

FLAGS
  -p, --project=<value>     (required) molecule.dev project id
      --deployment=<value>  (required) deployment id

DESCRIPTION
  Cancel a running deployment

EXAMPLES
  $ mlcl deploy cancel --project <id> --deployment <id>
```

_See code: [src/commands/deploy/cancel.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/deploy/cancel.ts)_

## `mlcl deploy list`

List deployments

```
USAGE
  $ mlcl deploy list -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  List deployments

EXAMPLES
  $ mlcl deploy list --project <id>
```

_See code: [src/commands/deploy/list.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/deploy/list.ts)_

## `mlcl deploy status`

Deployment detail (incl. build log)

```
USAGE
  $ mlcl deploy status -p <value> --deployment <value>

FLAGS
  -p, --project=<value>     (required) molecule.dev project id
      --deployment=<value>  (required) deployment id

DESCRIPTION
  Deployment detail (incl. build log)

EXAMPLES
  $ mlcl deploy status --project <id> --deployment <id>
```

_See code: [src/commands/deploy/status.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/deploy/status.ts)_

## `mlcl deploy workflow-github`

Generate the GitHub Actions deploy workflow (--apply writes it into the sandbox)

```
USAGE
  $ mlcl deploy workflow-github -p <value> [--apply]

FLAGS
  -p, --project=<value>  (required) molecule.dev project id
      --apply            write into the sandbox repo

DESCRIPTION
  Generate the GitHub Actions deploy workflow (--apply writes it into the sandbox)

EXAMPLES
  $ mlcl deploy workflow-github --project <id> [--apply]
```

_See code: [src/commands/deploy/workflow-github.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/deploy/workflow-github.ts)_

## `mlcl deploy workflow-gitlab`

Generate the GitLab CI deploy workflow (--apply writes it into the sandbox)

```
USAGE
  $ mlcl deploy workflow-gitlab -p <value> [--apply]

FLAGS
  -p, --project=<value>  (required) molecule.dev project id
      --apply            write into the sandbox repo

DESCRIPTION
  Generate the GitLab CI deploy workflow (--apply writes it into the sandbox)

EXAMPLES
  $ mlcl deploy workflow-gitlab --project <id> [--apply]
```

_See code: [src/commands/deploy/workflow-gitlab.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/deploy/workflow-gitlab.ts)_

## `mlcl device current`

Print the device id this CLI is logged in as (offline — decodes the local token)

```
USAGE
  $ mlcl device current [--json]

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Print the device id this CLI is logged in as (offline — decodes the local token)
```

_See code: [src/commands/device/current.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/device/current.ts)_

## `mlcl device list`

List your molecule.dev devices/sessions (browsers + CLIs) — revoking one kills its token

```
USAGE
  $ mlcl device list [--json]

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List your molecule.dev devices/sessions (browsers + CLIs) — revoking one kills its token

EXAMPLES
  $ mlcl device list

  $ mlcl device list --json
```

_See code: [src/commands/device/list.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/device/list.ts)_

## `mlcl device rename ID NAME`

Rename a device (how it appears in the IDE session list)

```
USAGE
  $ mlcl device rename ID NAME

ARGUMENTS
  ID    Device id
  NAME  New name

DESCRIPTION
  Rename a device (how it appears in the IDE session list)

EXAMPLES
  $ mlcl device rename <id> "work laptop"
```

_See code: [src/commands/device/rename.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/device/rename.ts)_

## `mlcl device revoke [ID]`

Revoke a device/session — kills every token bound to it, including a stolen CLI login. --all-but-current signs out everywhere except this machine.

```
USAGE
  $ mlcl device revoke [ID] [--all-but-current] [--force]

ARGUMENTS
  [ID]  Device id (from mlcl device list)

FLAGS
  --all-but-current  Revoke every device EXCEPT the one this CLI is logged in as
  --force            Skip the self-revocation confirmation

DESCRIPTION
  Revoke a device/session — kills every token bound to it, including a stolen CLI login. --all-but-current signs out
  everywhere except this machine.

EXAMPLES
  $ mlcl device revoke <id>

  $ mlcl device revoke --all-but-current
```

_See code: [src/commands/device/revoke.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/device/revoke.ts)_

## `mlcl domain add DOMAIN`

Attach a custom domain

```
USAGE
  $ mlcl domain add DOMAIN -p <value>

ARGUMENTS
  DOMAIN  domain name

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Attach a custom domain

EXAMPLES
  $ mlcl domain add --project <id> app.example.com
```

_See code: [src/commands/domain/add.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/domain/add.ts)_

## `mlcl domain list`

List custom domains

```
USAGE
  $ mlcl domain list -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  List custom domains

EXAMPLES
  $ mlcl domain list --project <id>
```

_See code: [src/commands/domain/list.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/domain/list.ts)_

## `mlcl domain rm DOMAINID`

Remove a custom domain

```
USAGE
  $ mlcl domain rm DOMAINID -p <value>

ARGUMENTS
  DOMAINID  domain id

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Remove a custom domain

EXAMPLES
  $ mlcl domain rm --project <id> <domainId>
```

_See code: [src/commands/domain/rm.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/domain/rm.ts)_

## `mlcl domain verify DOMAINID`

Trigger DNS verification

```
USAGE
  $ mlcl domain verify DOMAINID -p <value>

ARGUMENTS
  DOMAINID  domain id

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Trigger DNS verification

EXAMPLES
  $ mlcl domain verify --project <id> <domainId>
```

_See code: [src/commands/domain/verify.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/domain/verify.ts)_

## `mlcl egress approve HOST`

Approved a host

```
USAGE
  $ mlcl egress approve HOST -p <value>

ARGUMENTS
  HOST  hostname to allow

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Approved a host

EXAMPLES
  $ mlcl egress/approve --project <id> <host>
```

_See code: [src/commands/egress/approve.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/egress/approve.ts)_

## `mlcl egress get`

View sandbox network egress policy (allowlist + denials)

```
USAGE
  $ mlcl egress get -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  View sandbox network egress policy (allowlist + denials)

EXAMPLES
  $ mlcl egress get --project <id>
```

_See code: [src/commands/egress/get.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/egress/get.ts)_

## `mlcl egress revoke HOST`

Revoked a host

```
USAGE
  $ mlcl egress revoke HOST -p <value>

ARGUMENTS
  HOST  hostname to revoke

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Revoked a host

EXAMPLES
  $ mlcl egress/revoke --project <id> <host>
```

_See code: [src/commands/egress/revoke.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/egress/revoke.ts)_

## `mlcl env check`

Check which env vars the project needs (from code reads + installed package declarations) and which are missing from your .env files

```
USAGE
  $ mlcl env check [--json] [--fix]

FLAGS
  --fix   Append missing registry-declared keys to the workspace .env files (generated values where possible)
  --json  Machine-readable report

DESCRIPTION
  Check which env vars the project needs (from code reads + installed package declarations) and which are missing from
  your .env files

EXAMPLES
  $ mlcl env check

  $ mlcl env check --json

  $ mlcl env check --fix
```

_See code: [src/commands/env/check.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/env/check.ts)_

## `mlcl env detected`

List env keys detected from code + registry (what the app looks for)

```
USAGE
  $ mlcl env detected -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  List env keys detected from code + registry (what the app looks for)

EXAMPLES
  $ mlcl env detected --project <id>
```

_See code: [src/commands/env/detected.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/env/detected.ts)_

## `mlcl env get KEY`

Print one environment variable value (for scripts: mlcl env get DATABASE_URL)

```
USAGE
  $ mlcl env get KEY [--json]

ARGUMENTS
  KEY  Variable name

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Print one environment variable value (for scripts: mlcl env get DATABASE_URL)

EXAMPLES
  $ mlcl env get DATABASE_URL

  $ mlcl env get VITE_API_URL --app
```

_See code: [src/commands/env/get.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/env/get.ts)_

## `mlcl env list`

List environment variables in the project .env (values masked unless --raw)

```
USAGE
  $ mlcl env list [--app] [--raw] [--json]

FLAGS
  --app   Target app/.env instead of api/.env (full-stack projects)
  --json  Machine-readable output
  --raw   Show unmasked values

DESCRIPTION
  List environment variables in the project .env (values masked unless --raw)

EXAMPLES
  $ mlcl env list

  $ mlcl env list --app --raw
```

_See code: [src/commands/env/list.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/env/list.ts)_

## `mlcl env pull`

Pull the project’s environment variables from molecule.dev into the local .env (masked server-side values are skipped with a warning)

```
USAGE
  $ mlcl env pull -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Pull the project’s environment variables from molecule.dev into the local .env (masked server-side values are skipped
  with a warning)

EXAMPLES
  $ mlcl env pull --project <id>
```

_See code: [src/commands/env/pull.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/env/pull.ts)_

## `mlcl env push`

Push local .env values up to the molecule.dev project (upserts through the same route the IDE env editor saves to)

```
USAGE
  $ mlcl env push -p <value> [--keys <value>] [--scope all|dev|prod]

FLAGS
  -p, --project=<value>  (required) molecule.dev project id
      --keys=<value>     Comma-separated allowlist of keys to push (default: all set keys)
      --scope=<option>   [default: all] Platform scope for the values
                         <options: all|dev|prod>

DESCRIPTION
  Push local .env values up to the molecule.dev project (upserts through the same route the IDE env editor saves to)

EXAMPLES
  $ mlcl env push --project <id>

  $ mlcl env push --project <id> --keys STRIPE_SECRET_KEY,MAILGUN_API_KEY
```

_See code: [src/commands/env/push.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/env/push.ts)_

## `mlcl env set PAIR [VALUE]`

Set an environment variable in the project .env (creates the key or updates in place)

```
USAGE
  $ mlcl env set PAIR [VALUE] [--app]

ARGUMENTS
  PAIR     KEY=VALUE (or pass VALUE as a second arg)
  [VALUE]  Value when KEY given alone

FLAGS
  --app  Target app/.env instead of api/.env

DESCRIPTION
  Set an environment variable in the project .env (creates the key or updates in place)

EXAMPLES
  $ mlcl env set STRIPE_SECRET_KEY=sk_test_…

  $ mlcl env set VITE_API_URL https://api.example.com --app
```

_See code: [src/commands/env/set.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/env/set.ts)_

## `mlcl env unset KEY`

Comment out an environment variable (value preserved in the file for easy restore)

```
USAGE
  $ mlcl env unset KEY [--app]

ARGUMENTS
  KEY  Variable name

FLAGS
  --app  Target app/.env instead of api/.env

DESCRIPTION
  Comment out an environment variable (value preserved in the file for easy restore)

EXAMPLES
  $ mlcl env unset STRIPE_SECRET_KEY
```

_See code: [src/commands/env/unset.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/env/unset.ts)_

## `mlcl git pull`

Pull the connected remote into the sandbox

```
USAGE
  $ mlcl git pull -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Pull the connected remote into the sandbox

EXAMPLES
  $ mlcl git pull --project <id>
```

_See code: [src/commands/git/pull.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/git/pull.ts)_

## `mlcl git push`

Push the sandbox repo to the connected remote (platform-mediated)

```
USAGE
  $ mlcl git push -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Push the sandbox repo to the connected remote (platform-mediated)

EXAMPLES
  $ mlcl git push --project <id>
```

_See code: [src/commands/git/push.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/git/push.ts)_

## `mlcl git ssh-key PATH`

Store an SSH private key for git push from the sandbox

```
USAGE
  $ mlcl git ssh-key PATH -p <value>

ARGUMENTS
  PATH  path to SSH private key

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Store an SSH private key for git push from the sandbox

EXAMPLES
  $ mlcl git ssh-key --project <id> ~/.ssh/id_ed25519
```

_See code: [src/commands/git/ssh-key.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/git/ssh-key.ts)_

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

## `mlcl import repos`

List repos available for import from the connected git source

```
USAGE
  $ mlcl import repos -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  List repos available for import from the connected git source

EXAMPLES
  $ mlcl import repos --project <id>
```

_See code: [src/commands/import/repos.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/import/repos.ts)_

## `mlcl import source`

View or set the git import source for a project

```
USAGE
  $ mlcl import source -p <value> [--set <value>] [--clear]

FLAGS
  -p, --project=<value>  (required) molecule.dev project id
      --clear            clear the source
      --set=<value>      repo URL to import from

DESCRIPTION
  View or set the git import source for a project

EXAMPLES
  $ mlcl import source --project <id> [--set <repo-url>]
```

_See code: [src/commands/import/source.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/import/source.ts)_

## `mlcl import upload PATH`

Upload a repo tarball (.tar.gz) for import into the sandbox

```
USAGE
  $ mlcl import upload PATH -p <value>

ARGUMENTS
  PATH  path to .tar.gz

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Upload a repo tarball (.tar.gz) for import into the sandbox

EXAMPLES
  $ mlcl import upload --project <id> ~/repo.tar.gz
```

_See code: [src/commands/import/upload.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/import/upload.ts)_

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

_See code: [src/commands/init.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/init.ts)_

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

_See code: [src/commands/inject.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/inject.ts)_

## `mlcl invitations accept INVITEID`

Accept a team invitation

```
USAGE
  $ mlcl invitations accept INVITEID

ARGUMENTS
  INVITEID  invitation id

DESCRIPTION
  Accept a team invitation

EXAMPLES
  $ mlcl invitations accept <inviteId>
```

_See code: [src/commands/invitations/accept.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/invitations/accept.ts)_

## `mlcl invitations decline INVITEID`

Decline a team invitation

```
USAGE
  $ mlcl invitations decline INVITEID

ARGUMENTS
  INVITEID  invitation id

DESCRIPTION
  Decline a team invitation

EXAMPLES
  $ mlcl invitations decline <inviteId>
```

_See code: [src/commands/invitations/decline.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/invitations/decline.ts)_

## `mlcl invitations list`

List your pending team invitations

```
USAGE
  $ mlcl invitations list -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  List your pending team invitations

EXAMPLES
  $ mlcl invitations list
```

_See code: [src/commands/invitations/list.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/invitations/list.ts)_

## `mlcl login`

Log the CLI in to molecule.dev — opens your browser to approve (device-code flow); stores a 90-day token at ~/.mlcl/credentials.json

```
USAGE
  $ mlcl login [--token <value>] [--with-token] [--no-browser]

FLAGS
  --no-browser     Print the approval URL without trying to open a browser (SSH/remote).
  --token=<value>  Headless: pass a token directly (EXPOSES it in the process list — prefer --with-token or the
                   MOLECULE_TOKEN env var).
  --with-token     Read the token from stdin (gh-style; safe for process lists).

DESCRIPTION
  Log the CLI in to molecule.dev — opens your browser to approve (device-code flow); stores a 90-day token at
  ~/.mlcl/credentials.json

ALIASES
  $ mlcl login

EXAMPLES
  $ mlcl login

  $ mlcl login --no-browser

  $ mlcl login --token <jwt>
```

## `mlcl logout`

Remove the stored molecule.dev token

```
USAGE
  $ mlcl logout

DESCRIPTION
  Remove the stored molecule.dev token

ALIASES
  $ mlcl logout
```

## `mlcl logs`

Fetch runtime logs (last N lines) — use --stream for live tailing

```
USAGE
  $ mlcl logs -p <value> [--tail <value>] [--stream]

FLAGS
  -p, --project=<value>  (required) molecule.dev project id
      --stream           live tail (SSE)
      --tail=<value>     [default: 100] number of lines

DESCRIPTION
  Fetch runtime logs (last N lines) — use --stream for live tailing

EXAMPLES
  $ mlcl logs --project <id> [--tail 100] [--stream]
```

_See code: [src/commands/logs/index.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/logs/index.ts)_

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

_See code: [src/commands/mcp/install.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/mcp/install.ts)_

## `mlcl models`

AI model catalog (all models, defaults marked)

```
USAGE
  $ mlcl models -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  AI model catalog (all models, defaults marked)

EXAMPLES
  $ mlcl models [--json]
```

_See code: [src/commands/models.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/models.ts)_

## `mlcl profile get`

Show your molecule.dev profile

```
USAGE
  $ mlcl profile get -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Show your molecule.dev profile

EXAMPLES
  $ mlcl profile get
```

_See code: [src/commands/profile/get.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/profile/get.ts)_

## `mlcl profile update`

Update your profile

```
USAGE
  $ mlcl profile update -p <value> [--name <value>] [--username <value>] [--bio <value>]

FLAGS
  -p, --project=<value>   (required) molecule.dev project id
      --bio=<value>       bio
      --name=<value>      display name
      --username=<value>  username

DESCRIPTION
  Update your profile

EXAMPLES
  $ mlcl profile update --name "Your Name" --bio "..."
```

_See code: [src/commands/profile/update.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/profile/update.ts)_

## `mlcl project create NAME`

Create a molecule.dev project (no sandbox yet — `sandbox start` boots one, `sync` pushes local files into it)

```
USAGE
  $ mlcl project create NAME [--json] [--type api|app|full-stack|static] [--framework <value>] [--packages <value>]

ARGUMENTS
  NAME  project name (the deploy slug is derived from it)

FLAGS
  --framework=<value>  app framework (react, vue, svelte, solid, angular, react-native)
  --packages=<value>   comma-separated @molecule/* packages to scaffold with
  --type=<option>      [default: full-stack] project type
                       <options: api|app|full-stack|static>

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Create a molecule.dev project (no sandbox yet — `sandbox start` boots one, `sync` pushes local files into it)

EXAMPLES
  $ mlcl project create "How Molecule works" --type static --framework react

  $ mlcl project create my-api --type api --packages @molecule/api-database-postgresql
```

_See code: [src/commands/project/create.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/project/create.ts)_

## `mlcl project delete`

Delete a project (DESTRUCTIVE — tears down sandbox, prod, DB)

```
USAGE
  $ mlcl project delete -p <value> [--force]

FLAGS
  -p, --project=<value>  (required) molecule.dev project id
      --force            skip confirmation

DESCRIPTION
  Delete a project (DESTRUCTIVE — tears down sandbox, prod, DB)

EXAMPLES
  $ mlcl project delete --project <id> --force
```

_See code: [src/commands/project/delete.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/project/delete.ts)_

## `mlcl project export ID`

Download the project eject bundle (.tar.gz: code + database dump + .env + manifest) — take the project anywhere

```
USAGE
  $ mlcl project export ID [-o <value>]

ARGUMENTS
  ID  project id

FLAGS
  -o, --out=<value>  Output path (default: ./molecule-export-<projectId>.tar.gz)

DESCRIPTION
  Download the project eject bundle (.tar.gz: code + database dump + .env + manifest) — take the project anywhere

EXAMPLES
  $ mlcl project export <id>

  $ mlcl project export <id> -o ./eject.tar.gz
```

_See code: [src/commands/project/export.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/project/export.ts)_

## `mlcl project get ID`

Project detail (settings, URLs, role)

```
USAGE
  $ mlcl project get ID

ARGUMENTS
  ID  project id

DESCRIPTION
  Project detail (settings, URLs, role)

EXAMPLES
  $ mlcl project get <id>
```

_See code: [src/commands/project/get.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/project/get.ts)_

## `mlcl project list`

List your molecule.dev projects (owned + team, with roles)

```
USAGE
  $ mlcl project list [--json] [--open]

FLAGS
  --open  Print only projects with a live preview

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List your molecule.dev projects (owned + team, with roles)

EXAMPLES
  $ mlcl project list
```

_See code: [src/commands/project/list.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/project/list.ts)_

## `mlcl project open NAMEORID`

Print the IDE workspace + preview URLs for a project (or open them)

```
USAGE
  $ mlcl project open NAMEORID

ARGUMENTS
  NAMEORID  Project id or name

DESCRIPTION
  Print the IDE workspace + preview URLs for a project (or open them)

EXAMPLES
  $ mlcl project open <id>

  $ mlcl project open blog --browser
```

_See code: [src/commands/project/open.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/project/open.ts)_

## `mlcl project settings`

Update project settings

```
USAGE
  $ mlcl project settings -p <value> [--name <value>]

FLAGS
  -p, --project=<value>  (required) molecule.dev project id
      --name=<value>     new project name

DESCRIPTION
  Update project settings

EXAMPLES
  $ mlcl project settings --project <id> --name "New Name"
```

_See code: [src/commands/project/settings.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/project/settings.ts)_

## `mlcl sandbox exec`

Run a command in the project sandbox

```
USAGE
  $ mlcl sandbox exec -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Run a command in the project sandbox

EXAMPLES
  $ mlcl sandbox exec --project <id> -- npm test
```

_See code: [src/commands/sandbox/exec.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/sandbox/exec.ts)_

## `mlcl sandbox restart`

Restart a project sandbox

```
USAGE
  $ mlcl sandbox restart -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Restart a project sandbox

EXAMPLES
  $ mlcl sandbox restart --project <id>
```

_See code: [src/commands/sandbox/restart.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/sandbox/restart.ts)_

## `mlcl sandbox start`

Boot a project sandbox

```
USAGE
  $ mlcl sandbox start -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Boot a project sandbox

EXAMPLES
  $ mlcl sandbox start --project <id>
```

_See code: [src/commands/sandbox/start.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/sandbox/start.ts)_

## `mlcl sandbox status`

Sandbox status for a project

```
USAGE
  $ mlcl sandbox status -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Sandbox status for a project

EXAMPLES
  $ mlcl sandbox status --project <id>
```

_See code: [src/commands/sandbox/status.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/sandbox/status.ts)_

## `mlcl sandbox stop`

Hibernate a project sandbox

```
USAGE
  $ mlcl sandbox stop -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Hibernate a project sandbox

EXAMPLES
  $ mlcl sandbox stop --project <id>
```

_See code: [src/commands/sandbox/stop.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/sandbox/stop.ts)_

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

_See code: [src/commands/search.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/search.ts)_

## `mlcl share clone SLUG`

Clone a shared project into your account

```
USAGE
  $ mlcl share clone SLUG

ARGUMENTS
  SLUG  share slug (from the share URL)

DESCRIPTION
  Clone a shared project into your account

EXAMPLES
  $ mlcl share clone <slug>
```

_See code: [src/commands/share/clone.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/share/clone.ts)_

## `mlcl share create`

Mint a public share link

```
USAGE
  $ mlcl share create -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Mint a public share link

EXAMPLES
  $ mlcl share create --project <id>
```

_See code: [src/commands/share/create.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/share/create.ts)_

## `mlcl share list`

List public share links

```
USAGE
  $ mlcl share list -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  List public share links

EXAMPLES
  $ mlcl share list --project <id>
```

_See code: [src/commands/share/list.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/share/list.ts)_

## `mlcl share rm SHAREID`

Revoke a share link

```
USAGE
  $ mlcl share rm SHAREID -p <value>

ARGUMENTS
  SHAREID  share id

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Revoke a share link

EXAMPLES
  $ mlcl share rm --project <id> <shareId>
```

_See code: [src/commands/share/rm.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/share/rm.ts)_

## `mlcl share visibility`

Show or set what a project's share links show: its session transcripts and a read-only view of its workspace. Turning the workspace on copies the files from the running sandbox at that moment; run it again with --workspace on to copy them again after changes.

```
USAGE
  $ mlcl share visibility -p <value> [--transcripts on|off] [--workspace on|off] [--json]

FLAGS
  -p, --project=<value>       (required) molecule.dev project id
      --json                  Output machine-readable JSON
      --transcripts=<option>  publish the session transcripts behind the share links
                              <options: on|off>
      --workspace=<option>    publish a read-only copy of the workspace files behind the share links (on copies them
                              now; on again re-copies)
                              <options: on|off>

DESCRIPTION
  Show or set what a project's share links show: its session transcripts and a read-only view of its workspace. Turning
  the workspace on copies the files from the running sandbox at that moment; run it again with --workspace on to copy
  them again after changes.

EXAMPLES
  $ mlcl share visibility --project <id>

  $ mlcl share visibility --project <id> --transcripts on --workspace on
```

_See code: [src/commands/share/visibility.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/share/visibility.ts)_

## `mlcl snapshot create`

Create a sandbox snapshot

```
USAGE
  $ mlcl snapshot create -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Create a sandbox snapshot

EXAMPLES
  $ mlcl snapshot create --project <id>
```

_See code: [src/commands/snapshot/create.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/snapshot/create.ts)_

## `mlcl snapshot list`

List sandbox snapshots

```
USAGE
  $ mlcl snapshot list -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  List sandbox snapshots

EXAMPLES
  $ mlcl snapshot list --project <id>
```

_See code: [src/commands/snapshot/list.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/snapshot/list.ts)_

## `mlcl snapshot restore SNAPID`

Restore a sandbox snapshot (destructive)

```
USAGE
  $ mlcl snapshot restore SNAPID -p <value>

ARGUMENTS
  SNAPID  snapshot id

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Restore a sandbox snapshot (destructive)

EXAMPLES
  $ mlcl snapshot restore --project <id> <snapId>
```

_See code: [src/commands/snapshot/restore.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/snapshot/restore.ts)_

## `mlcl snapshot rm SNAPID`

Delete a sandbox snapshot

```
USAGE
  $ mlcl snapshot rm SNAPID -p <value>

ARGUMENTS
  SNAPID  snapshot id

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Delete a sandbox snapshot

EXAMPLES
  $ mlcl snapshot rm --project <id> <snapId>
```

_See code: [src/commands/snapshot/rm.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/snapshot/rm.ts)_

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

_See code: [src/commands/stage/down.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/stage/down.ts)_

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

_See code: [src/commands/stage/list.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/stage/list.ts)_

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

_See code: [src/commands/stage/logs.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/stage/logs.ts)_

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

_See code: [src/commands/stage/status.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/stage/status.ts)_

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

_See code: [src/commands/stage/up.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/stage/up.ts)_

## `mlcl status`

molecule.dev status history (30 days)

```
USAGE
  $ mlcl status -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  molecule.dev status history (30 days)

EXAMPLES
  $ mlcl status
```

_See code: [src/commands/status.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/status.ts)_

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

_See code: [src/commands/swap.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/swap.ts)_

## `mlcl sync [DIR]`

Push a local project tree into a molecule.dev project sandbox (text files only; never deletes)

```
USAGE
  $ mlcl sync [DIR] -p <value> [--dry-run] [--only <value>...] [--concurrency <value>] [--dest <value>]

ARGUMENTS
  [DIR]  [default: .] local project root (default: current directory)

FLAGS
  -p, --project=<value>      (required) molecule.dev project id
      --concurrency=<value>  [default: 6] Parallel writes
      --dest=<value>         Workspace-relative directory to write under (the platform scaffolds a project at
                             /workspace/<appDir>, e.g. `my-app`)
      --dry-run              List what would be sent; send nothing
      --only=<value>...      Only send files under this project-relative path (repeatable)

DESCRIPTION
  Push a local project tree into a molecule.dev project sandbox (text files only; never deletes)

EXAMPLES
  $ mlcl sync --project <id>

  $ mlcl sync ./my-app --project <id> --dry-run

  $ mlcl sync --project <id> --only app/src

  $ mlcl sync --project <id> --dest my-app
```

_See code: [src/commands/sync.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/sync.ts)_

## `mlcl tasks cancel TASKID`

Cancelled a taskId

```
USAGE
  $ mlcl tasks cancel TASKID -p <value>

ARGUMENTS
  TASKID  task id

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Cancelled a taskId

EXAMPLES
  $ mlcl tasks/cancel --project <id> <taskId>
```

_See code: [src/commands/tasks/cancel.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/tasks/cancel.ts)_

## `mlcl tasks list`

List scheduled/idle AI tasks for a project

```
USAGE
  $ mlcl tasks list -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  List scheduled/idle AI tasks for a project

EXAMPLES
  $ mlcl tasks list --project <id>
```

_See code: [src/commands/tasks/list.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/tasks/list.ts)_

## `mlcl team invite`

Invite a member by email

```
USAGE
  $ mlcl team invite -p <value> --email <value> [--role <value>]

FLAGS
  -p, --project=<value>  (required) molecule.dev project id
      --email=<value>    (required)
      --role=<value>     [default: editor] viewer|editor|admin

DESCRIPTION
  Invite a member by email

EXAMPLES
  $ mlcl team invite --project <id> --email x@y.com --role editor
```

_See code: [src/commands/team/invite.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/team/invite.ts)_

## `mlcl team list`

List project team + pending invites

```
USAGE
  $ mlcl team list -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  List project team + pending invites

EXAMPLES
  $ mlcl team list --project <id>
```

_See code: [src/commands/team/list.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/team/list.ts)_

## `mlcl team revoke INVITEID`

Revoke a pending invite

```
USAGE
  $ mlcl team revoke INVITEID -p <value>

ARGUMENTS
  INVITEID  invite id

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Revoke a pending invite

EXAMPLES
  $ mlcl team revoke --project <id> <inviteId>
```

_See code: [src/commands/team/revoke.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/team/revoke.ts)_

## `mlcl team rm MEMBERID`

Remove a member

```
USAGE
  $ mlcl team rm MEMBERID -p <value>

ARGUMENTS
  MEMBERID  member id

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Remove a member

EXAMPLES
  $ mlcl team rm --project <id> <memberId>
```

_See code: [src/commands/team/rm.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/team/rm.ts)_

## `mlcl team set-role MEMBERID ROLE`

Change a member role

```
USAGE
  $ mlcl team set-role MEMBERID ROLE -p <value>

ARGUMENTS
  MEMBERID  member id
  ROLE      viewer|editor|admin

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Change a member role

EXAMPLES
  $ mlcl team set-role --project <id> <memberId> <role>
```

_See code: [src/commands/team/set-role.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/team/set-role.ts)_

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

_See code: [src/commands/templates.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/templates.ts)_

## `mlcl transcripts import [FILES]`

Import agent session transcripts (Claude Code, Codex and other harnesses) into a project

```
USAGE
  $ mlcl transcripts import [FILES...] -p <value> [--from claude-code|codex] [--cwd <value>] [--dry-run] [--json]

ARGUMENTS
  [FILES...]  transcript files to import

FLAGS
  -p, --project=<value>  (required) molecule.dev project id
      --cwd=<value>      the project directory whose sessions --from looks for (default: current directory)
      --dry-run          list what would be sent; send nothing
      --from=<option>    import this harness's local sessions for --cwd instead of named files (reads this machine's
                         session store)
                         <options: claude-code|codex>
      --json             Output machine-readable JSON

DESCRIPTION
  Import agent session transcripts (Claude Code, Codex and other harnesses) into a project

EXAMPLES
  $ mlcl transcripts import --project <id> ./session.jsonl

  $ mlcl transcripts import --project <id> --from claude-code

  $ mlcl transcripts import --project <id> --from codex --cwd ./my-app --dry-run
```

_See code: [src/commands/transcripts/import.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/transcripts/import.ts)_

## `mlcl transcripts list`

List a project's session transcripts: its own chat in the molecule.dev IDE (source ide) and every imported session (source imported)

```
USAGE
  $ mlcl transcripts list -p <value> [--json]

FLAGS
  -p, --project=<value>  (required) molecule.dev project id
      --json             Output machine-readable JSON

DESCRIPTION
  List a project's session transcripts: its own chat in the molecule.dev IDE (source ide) and every imported session
  (source imported)

EXAMPLES
  $ mlcl transcripts list --project <id>
```

_See code: [src/commands/transcripts/list.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/transcripts/list.ts)_

## `mlcl transcripts rm TRANSCRIPTID`

Remove an imported session transcript from a project (the project's own IDE conversations cannot be removed here)

```
USAGE
  $ mlcl transcripts rm TRANSCRIPTID -p <value>

ARGUMENTS
  TRANSCRIPTID  transcript id (from `transcripts list`)

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Remove an imported session transcript from a project (the project's own IDE conversations cannot be removed here)

EXAMPLES
  $ mlcl transcripts rm --project <id> <transcriptId>
```

_See code: [src/commands/transcripts/rm.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/transcripts/rm.ts)_

## `mlcl usage`

Usage rollup (account, or --project)

```
USAGE
  $ mlcl usage [-p <value>]

FLAGS
  -p, --project=<value>  project id (default: account)

DESCRIPTION
  Usage rollup (account, or --project)

EXAMPLES
  $ mlcl usage [--project <id>]
```

_See code: [src/commands/usage/index.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/usage/index.ts)_

## `mlcl usage chat`

AI chat usage for a project (turns, tokens, cost)

```
USAGE
  $ mlcl usage chat -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  AI chat usage for a project (turns, tokens, cost)

EXAMPLES
  $ mlcl usage chat --project <id>
```

_See code: [src/commands/usage/chat.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/usage/chat.ts)_

## `mlcl usage tiers`

Public pricing tiers

```
USAGE
  $ mlcl usage tiers

DESCRIPTION
  Public pricing tiers

EXAMPLES
  $ mlcl usage tiers
```

_See code: [src/commands/usage/tiers.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/usage/tiers.ts)_

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

_See code: [src/commands/validate.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/validate.ts)_

## `mlcl vault broker`

Enable/disable the credential broker (metered AI/API proxy for your app)

```
USAGE
  $ mlcl vault broker -p <value> [--disable]

FLAGS
  -p, --project=<value>  (required) molecule.dev project id
      --disable          disable instead of enable

DESCRIPTION
  Enable/disable the credential broker (metered AI/API proxy for your app)

EXAMPLES
  $ mlcl vault broker --project <id> [--disable]
```

_See code: [src/commands/vault/broker.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/vault/broker.ts)_

## `mlcl vault list`

List vault secrets for a project

```
USAGE
  $ mlcl vault list -p <value>

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  List vault secrets for a project

EXAMPLES
  $ mlcl vault list --project <id>
```

_See code: [src/commands/vault/list.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/vault/list.ts)_

## `mlcl vault rm KEY`

Delete a vault secret

```
USAGE
  $ mlcl vault rm KEY -p <value>

ARGUMENTS
  KEY  secret key

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Delete a vault secret

EXAMPLES
  $ mlcl vault rm --project <id> <key>
```

_See code: [src/commands/vault/rm.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/vault/rm.ts)_

## `mlcl vault set KEY VALUE`

Write a vault secret

```
USAGE
  $ mlcl vault set KEY VALUE -p <value>

ARGUMENTS
  KEY    secret key
  VALUE  secret value

FLAGS
  -p, --project=<value>  (required) molecule.dev project id

DESCRIPTION
  Write a vault secret

EXAMPLES
  $ mlcl vault set --project <id> <key> <value>
```

_See code: [src/commands/vault/set.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/vault/set.ts)_

## `mlcl vault token`

Mint a runtime vault token (mvt_…)

```
USAGE
  $ mlcl vault token -p <value> [--revoke]

FLAGS
  -p, --project=<value>  (required) molecule.dev project id
      --revoke           revoke instead of mint

DESCRIPTION
  Mint a runtime vault token (mvt_…)

EXAMPLES
  $ mlcl vault token --project <id>
```

_See code: [src/commands/vault/token.ts](https://github.com/molecule-dev/mlcl/blob/v2.1.0/src/commands/vault/token.ts)_

## `mlcl whoami`

Show the logged-in molecule.dev account

```
USAGE
  $ mlcl whoami [--json]

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Show the logged-in molecule.dev account

ALIASES
  $ mlcl whoami
```
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
