# Molecule + AI coding agents — the complete guide

Molecule is built agent-first: the CLI is non-interactive by flag, emits JSON,
and every scaffolded project teaches your agent its conventions. This guide
covers every supported harness and every wiring method, with examples.

> `mlcl` and `molecule-mcp` are on npm, along with every `@molecule/*`
> package; the commands below run as written.

**The one-paragraph version:** run `npx mlcl setup`. It asks where (every
project on this machine, or this project only) and which of your agents, then
installs the molecule MCP server, the Molecule skills and the conventions for
each one. Or install the Claude Code plugin, or just paste the prompt block from
the README into any agent. Then ask your agent to build something. URL-only clients (Lovable/v0/bolt connectors, and any harness
wanting a one-line install) use the hosted read-only endpoint instead:
`https://mcp.molecule.dev/mcp`.

---

## What your agent gets

| Surface                          | What it provides                                                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `mlcl` CLI (`npx`)               | discovery (`search`, `templates`), scaffolding (`create --no-interactive --json`), growth (`add --inject`), reconfiguration (`swap`) |
| Scaffolded `AGENTS.md`           | the project's conventions, in context the moment any agent opens the project                                                         |
| `setup`                          | the MCP server, the Molecule skills and those conventions, installed into every agent on the machine (or one project) in one command |
| `agent init`                     | those same conventions written into any existing project / harness's instruction files                                               |
| `molecule` MCP server            | the same verbs as structured tools + `read_package_doc` + the `molecule://conventions` resource + a self-install `agent_init` tool   |
| Claude Code plugin _(at launch)_ | two skills + the MCP server, marketplace-updated                                                                                     |
| Package READMEs                  | every `@molecule/*` package documents its API/wiring at `node_modules/@molecule/<name>/README.md` — LLM-oriented by design           |

Scaffolds also ship the same ESLint rules for every harness. In JSX,
`molecule-local/no-empty-interactive-target` rejects an empty native interactive
element without visible content or a locally verifiable visual styling source in the app's loaded
CSS. `aria-label`, `role` and `tabIndex` do not draw a control. Use visible text,
the framework's sized SVG `Icon`, or import CSS that draws the element. The rule
follows local imports and `index.html` stylesheets; an unused CSS file does not
count. Native controls with browser-provided boxes (buttons, inputs, and similar
widgets), SVG drawings and presentational dismissal backdrops are outside this zero-area
check. It leaves dynamic content and custom components to browser tests.
For remote CSS or runtime styling the linter cannot inspect, use a
narrow ESLint disable with a reason and verify the target in the browser.
`npm run lint` and the lint step of `mlcl check` report the source line and fix;
the rule behaves the same with supplied tests, authored tests, or no suite.

The same rule checks literal `className` and `class` values against the icon-font
classes in the scaffold's registry snapshot, including icons inside buttons or
beside text. A known class needs its provider's setter call in the app's entry
imports, or imported CSS that supplies a local font face and the class's font
family. For example, `ion-trash-a` needs
`import { setFont } from '@molecule/app-fonts'; import { font } from '@molecule/app-fonts-ionicons'; setFont(font)`
in the startup bond setup. The error names the class, package and exact wiring.
A font import alone or an unimported bond file does not count. Authored CSS that
draws an ordinary text glyph or image can replace the font. Unrelated class names
and icon families absent from the registry produce no font diagnostic. No tests
or test selectors supply these facts. This is a static dependency check: it
recognizes setter calls in imported setup functions but does not prove that those
functions execute or that font downloads succeed. Dynamic classes and non-JSX
templates still need their framework and browser checks.

`molecule-local/no-dropped-optimistic-intent` follows this rule: an enabled React
control on screen must not have a handler whose first act is to return because a
value that its component's JSX treats as possibly missing is missing, unless the
control is disabled on that value or mounted only with it. Add `disabled={!record}`
to the control (every submit button for a form), or mount it with `record && …`
or `QueryContent`. Both `if (!record) return` and a sole `if (record) action()`
need this protection.

The check recognizes identifiers tested by JSX `record ? … : …`, `record && …`
or `record?.field` in the same function. It reads no imported modules or tests and
does not construct a TypeScript program. Local boolean predicates are not missing
data. Imported `useParams` results are exempt because route params do not load
later. Optional access, derived counts and earlier render guards can establish
that the control is disabled or unmounted. Feedback or useful work before the
record guard is not a silently discarded action. Other helpers remain unknown,
so use a direct data guard when the linter cannot establish availability.

In a workspace declaring `@molecule/app-routing-react-router`,
`molecule-local/url-selections-declare-access` reports a raw URL comparison
combined with a value from `useAuth`, including values returned by thin local
session hooks. Hiding a link or skipping a request leaves direct visits unguarded.
Keep public URL selections independent of the session. For private selections,
use `useListRoute` with `requiresAuth: true`, `auth: { status, redirectTo }`, and
`canLoad` before loading data. An explicit custom `<Navigate>` guard or a
`useNavigate` call inside a React effect also establishes navigation handling.
The rule checks immutable local aliases and relative session-hook imports; it
does not infer access from route names, query keys, supplied tests, or selectors.
Public filters, one-time query credentials and other routing bindings receive
no diagnostic. Guard presence does not prove its boolean logic: verify the
signed-out deep link in the browser. Opaque adapters and guards in another
module can use a narrow, reasoned ESLint override after that verification.

---

## Recommended — `mlcl setup` (every agent, one command)

```bash
npx mlcl setup                                    # asks where and which agents
npx mlcl setup --yes                              # every agent found, every project on this machine
npx mlcl setup --scope project --agent claude-code,cursor --yes
npx mlcl setup --dry-run                          # list what it would write, change nothing
```

For each agent it installs three things:

- **the MCP server**, through the agent's own `mcp add` command where it has
  one, otherwise by adding one `molecule` entry to its config file (comments
  and other settings are kept);
- **the Molecule skills**: `build-with-molecule` (start a new app),
  `extend-with-packages` (add or swap a capability) and `capability-first`
  (check what a package already provides before writing code);
- **the conventions**, as a `## Molecule` section in the instructions file the
  agent reads, or as a rules file of its own.

| Agent                                           | Every project (`--scope machine`)                                                 | This project (`--scope project`)                           |
| ----------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Claude Code                                     | `claude mcp add --scope user`, `~/.claude/skills`, `~/.claude/CLAUDE.md`          | `.mcp.json`, `.claude/skills`, `CLAUDE.md` or `AGENTS.md`  |
| Codex                                           | `codex mcp add`, `~/.agents/skills`, `~/.codex/AGENTS.md`                         | `.codex/config.toml`, `.agents/skills`, `AGENTS.md`        |
| Cursor                                          | `~/.cursor/mcp.json`, `~/.agents/skills` (user rules live in Cursor's settings)   | `.cursor/mcp.json`, `.agents/skills`, `AGENTS.md`          |
| Gemini CLI                                      | `gemini mcp add -s user`, `~/.agents/skills`, `~/.gemini/GEMINI.md`               | `gemini mcp add -s project`, `.agents/skills`, `GEMINI.md` |
| Devin Desktop (Windsurf)                        | `~/.config/devin/mcp_config.json`, `~/.agents/skills`, `~/.devin/global_rules.md` | `.devin/mcp_config.json`, `.agents/skills`, `AGENTS.md`    |
| OpenCode                                        | `opencode mcp add --global`, `~/.agents/skills`, `~/.config/opencode/AGENTS.md`   | `opencode mcp add`, `.agents/skills`, `AGENTS.md`          |
| Amp                                             | `~/.config/amp/settings.json`, `~/.agents/skills`, `~/.config/amp/AGENTS.md`      | `.amp/settings.json`, `.agents/skills`, `AGENTS.md`        |
| GitHub Copilot                                  | `copilot mcp add`, `~/.copilot/skills`, `~/.copilot/copilot-instructions.md`      | `.mcp.json`, `.github/skills`, `AGENTS.md`                 |
| Kiro                                            | `~/.kiro/settings/mcp.json`, `~/.kiro/skills`, `~/.kiro/steering/molecule.md`     | `.kiro/settings/mcp.json`, `.kiro/skills`, `AGENTS.md`     |
| Zed, Crush, Trae, Cline, Junie, Continue, Goose | the MCP server only (`mlcl mcp install --agent <name>` does the same)             | the MCP server only                                        |

Re-running is safe: anything already in place is left alone, and a skill or
section you edited is kept until you pass `--force`. Restart your agents
afterwards so they load the tools and skills.

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

| Harness                                                               | Files written                                                       |
| --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Claude Code                                                           | `AGENTS.md`, plus `CLAUDE.md` when it exists and does not import it |
| Gemini CLI                                                            | `AGENTS.md` + `GEMINI.md`                                           |
| Codex, Cursor, Copilot, Devin, OpenCode, Amp, Kiro, Pi, anything else | `AGENTS.md` (the cross-harness standard they all read)              |

`--global` writes the agent's file for every project instead: the same files
as the "Every project" column above.

## Method 3 — the MCP server (tools, one command or one line)

`molecule-mcp` exposes structured tools: `search_packages`, `list_templates`,
`scaffold_project`, `add_package`, `swap_provider`, `read_package_doc`,
`agent_init` — plus the `molecule://conventions` resource.

```bash
npx mlcl mcp install                 # detect + register (uses the harness's own installer when it has one)
npx mlcl mcp install --agent opencode --project
npx mlcl setup                       # every agent at once, with the skills and conventions
```

Or your harness's native command / config:

| Harness           | Install                                                                        |
| ----------------- | ------------------------------------------------------------------------------ |
| Claude Code       | `claude mcp add --scope user molecule -- npx -y molecule-mcp`                  |
| Codex             | `codex mcp add molecule -- npx -y molecule-mcp`                                |
| Cursor            | `~/.cursor/mcp.json` (or `.cursor/mcp.json`) → `mcpServers.molecule`           |
| Gemini CLI        | `gemini mcp add -s user molecule npx -y molecule-mcp` _(no `--`)_              |
| Devin Desktop     | `~/.config/devin/mcp_config.json` → `mcpServers.molecule`                      |
| GitHub Copilot    | `copilot mcp add molecule -- npx -y molecule-mcp`, or `.mcp.json` in a project |
| OpenCode          | `opencode mcp add molecule --global -- npx -y molecule-mcp`                    |
| Amp               | `~/.config/amp/settings.json` → `"amp.mcpServers".molecule`                    |
| Crush             | `~/.config/crush/crush.json` → `mcp.molecule` with `"type": "stdio"`           |
| Kiro              | `~/.kiro/settings/mcp.json` → `mcpServers.molecule`                            |
| Trae              | `.trae/mcp.json` → `mcpServers.molecule` (global: Settings → MCP)              |
| Zed               | `~/.config/zed/settings.json` → `context_servers.molecule`                     |
| Cline             | `cline mcp add molecule --yes -- npx -y molecule-mcp`                          |
| Junie (JetBrains) | `~/.junie/mcp/mcp.json` → `mcpServers.molecule`                                |
| Goose             | `~/.config/goose/config.yaml` under `extensions:` (`cmd: npx`, `type: stdio`)  |
| Continue          | `.continue/mcpServers/molecule.json` in a project                              |
| Aider             | no MCP support yet: use the `mlcl` CLI directly                                |

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

When a project has a supplied or scaffolded Playwright suite, run
`npx mlcl test-feedback --suite <spec-directory> --sources <app-source-directory>
--command "<native Playwright command targeting the local app>" --watch --json`
as a background task while editing. Each native locator failure names its spec
line, the rendered page and the source changes. Passing runs are silent. Stop the
watcher when finished; final verification still uses the complete suite.

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
