# molecule-mcp

The [Molecule.dev](https://molecule.dev) MCP server — structured tools over the
`mlcl` CLI for any MCP-capable coding agent: search the `@molecule/*` package
fleet, list flagship app templates, scaffold projects, add/wire packages, swap
providers, and read package docs.

Also ships the molecule doctrine as a resource (`molecule://conventions`) and
an `agent_init` tool that writes the convention files your harness reads — so
connecting this ONE server delivers both the capability and the context.

## Install

The one command that works everywhere (uses your harness's own installer when it has one, writes the standard config when it doesn't):

```bash
npx mlcl mcp install
```

Or use your harness's native command / config directly:

| Harness | Install |
|---|---|
| Claude Code | `claude mcp add molecule -- npx -y molecule-mcp` *(or the plugin: `/plugin install molecule@molecule`)* |
| Cursor | `cursor mcp add molecule -- npx -y molecule-mcp` |
| Codex | `codex mcp add molecule -- npx -y molecule-mcp` (or `~/.codex/config.toml` `[mcp_servers.molecule]`) |
| Gemini CLI | `gemini mcp add molecule npx -y molecule-mcp` *(no `--` separator)* |
| Windsurf | edit `~/.codeium/windsurf/mcp_config.json` → `mcpServers.molecule` |
| VS Code / Copilot | `.vscode/mcp.json` → `servers.molecule` |
| OpenCode | `opencode.json` → `mcp.molecule = {type:"local", command:["npx","-y","molecule-mcp"]}` |
| Amp | `~/.config/amp/settings.json` → `mcpServers.molecule` |
| Crush | `~/.config/crush/config.json` → `mcpServers.molecule` |
| Kiro | `.kiro/settings/mcp.json` (or `~/.kiro/settings/mcp.json`) → `mcpServers.molecule` |
| Trae | `.trae/mcp.json` (or `~/.trae/mcp.json`) → `mcpServers.molecule` |
| Zed | `.zed/settings.json` → `agent.mcp_servers.molecule` |
| Goose | `~/.config/goose/config.yaml` under `extensions:` (or `goose configure`) |
| Junie (JetBrains) | `/mcp` in Junie → add server, command `npx -y molecule-mcp` |
| Cline / Kilo Code | MCP Servers → Configure → `mcpServers.molecule` (same shape) |
| Continue | `config.json` → `mcpServers.molecule` |
| Aider | recent versions support MCP — add `molecule`, command `npx -y molecule-mcp` |
| Any MCP client | command: `npx`, args: `["-y", "molecule-mcp"]` |

`mlcl mcp install` writes/merges all of the JSON-config rows above idempotently
and never clobbers existing servers; for YAML/UI harnesses (Goose, Junie,
Cline, Continue, Aider) it prints the exact snippet instead of risking a
mangled config.

Why the long form? A stdio MCP server is a local process the client spawns, so
the client needs its launch command. Shorter paths: the
[Smithery](https://smithery.ai)/[Glama](https://glama.ai)/[PulseMCP](https://www.pulsemcp.com)
registry listings (one-click) and, for Claude Code, the full plugin —
`/plugin marketplace add molecule-dev/molecule-claude-code` then
`/plugin install molecule@molecule` (skills + this server, marketplace-updated).

## Tools

| Tool | What it does |
|---|---|
| `search_packages` | Search `@molecule/*` by capability ("payments", "social login") |
| `list_templates` | The flagship app gallery (blog, crm, team-chat, …) |
| `scaffold_project` | `mlcl create` unattended, JSON result |
| `add_package` | Install + wire a package (`mlcl add --inject`) |
| `swap_provider` | Swap a wired provider (`mlcl swap`) |
| `read_package_doc` | A package's generated usage README (walks up to hoisted node_modules) |
| `agent_init` | Write the molecule conventions into this project's agent files |

## Requirements

- Node.js ≥ 22, `mlcl` resolvable (the published npm package; override with
  `MOLECULE_MCP_CLI=/path/to/bin/run.js` for local/dev use).

## License

Apache-2.0 © [Molecule Dev, Inc.](https://molecule.dev)
