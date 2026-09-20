# Distribution listings — runbook + canonical copy

Execute the day `mlcl` + `molecule-mcp` publish. Every directory below is
staged with exact copy so submission is paste-and-click.

## Canonical listing copy

- **Name:** `molecule` (server `molecule-mcp`) · **Display:** Molecule.dev
- **Tagline:** Build production full-stack apps from 900+ composable, swappable packages — scaffold, extend, and swap providers with one command.
- **Short description (≤100 chars):** Scaffold, extend, and provider-swap production full-stack apps with Molecule.
- **Long description:**
  > Molecule.dev scaffolds real, production-grade TypeScript apps from 900+ composable `@molecule/*` packages behind swappable bonds. This server gives your agent structured tools to search the package fleet, list 134 flagship app templates, scaffold projects unattended, add/wire packages, swap providers without rewrites, and read each package's generated docs — plus the molecule conventions as a resource (`molecule://conventions`) and a self-install tool for your project's agent files.
- **Tags/categories:** scaffolding, boilerplate, fullstack, code-generation, typescript, developer-tools
- **Links:** repo `github.com/molecule-dev/mlcl` · npm `npmjs.com/package/molecule-mcp` · site `molecule.dev` · docs `…/blob/main/docs/AGENTS-AND-HARNESSES.md`
- **Install line:** `npx mlcl mcp install` (or the standard entry `npx -y molecule-mcp`)

## The directories, in priority order

| #   | Hub                                                  | How                                                                                                                                                                                    | Requirements                                                                                                                                                      |
| --- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **[Smithery](https://smithery.ai)**                  | `npx @smithery/cli init` in `mcp/` (config staged at `mcp/smithery.yaml`), then submit — Smithery builds/host-runs the server and gives one-click install + an install-command snippet | published repo; `smithery.yaml` at the indexed repo root (move `mcp/smithery.yaml` there when molecule-mcp gets its own repo, or point Smithery at the mlcl repo) |
| 2   | **[Glama](https://glama.ai/mcp/servers)**            | submit form at glama.ai/mcp/servers                                                                                                                                                    | auto-crawls GitHub too — a public repo with an MCP server often gets picked up; submit explicitly to control the copy                                             |
| 3   | **[PulseMCP](https://www.pulsemcp.com)**             | submission page (22k+ servers indexed, daily crawl + newsletter)                                                                                                                       | URL of the repo/server                                                                                                                                            |
| 4   | **[mcp.so](https://mcp.so)**                         | submission form or GitHub PR                                                                                                                                                           | repo URL                                                                                                                                                          |
| 5   | **[Cursor Directory](https://cursor.com/directory)** | MCP listing submission                                                                                                                                                                 | one-click "Add to Cursor" comes free once listed                                                                                                                  |

## Lists worth PRs

- **awesome-mcp-servers** (punkpeye/awesome-mcp-servers) — the training-data heavyweight; PR one line under the right category
- **awesome-mcp-devtools** — dev-tools subset
- **awesome-claude-code** — the plugin entry (`molecule@molecule`), not just the MCP server
- Hugging Face smolagents / community skill lists if the Agent-Skills format takes off — our SKILL.md files already conform

## Vibecoding platforms (hosted remote MCP — built, deploys with launch)

Lovable (chat connectors), v0 (MCP integrations), and bolt.new (Connectors)
all accept MCP servers — but REMOTE (HTTP URL) ones. molecule-mcp's hosted
read-only face is built (`mcp/src/http.ts` + `remote.ts`; deploy runbook in
`mcp/DEPLOY.md`): `https://mcp.molecule.dev/mcp` serving the read tools
(search/templates/docs + the conventions resource). Deploying it unlocks all
three builders as additional surfaces AND gives every CLI harness the short
one-URL install. The graduation-path story for their exported apps is
meanwhile covered by [FROM-VIBECODING.md](FROM-VIBECODING.md).

## Post-publish reminder

- Remove any local test alias (`alias mlcl="node bin/run.js"`) — after
  publishing, the real command is `mlcl` (global install) or `npx mlcl`.
  For continued LOCAL development against the checkout, use a distinct name
  (`alias mlcl-dev="node ~/Repos/molecule-workspace/mlcl/bin/run.js"`) so the
  published binary and the dev tree never shadow each other.

## Claude Code plugin (separate track)

Already staged at `integrations/claude-code/` — at launch: move contents to the
public `molecule-dev/molecule-claude-code` repo, then the install is
`/plugin marketplace add molecule-dev/molecule-claude-code` +
`/plugin install molecule@molecule`. Also eligible for Anthropic's official
marketplace submission if it opens to third parties.

## Quality-score notes (Smithery et al.)

Directories score servers on tool descriptions, naming, and annotations —
`mcp/src/server.ts` already carries per-tool `title`/`description` with
usage guidance and explicit input schemas; keep that discipline when adding
tools, it is literally the ranking input.
