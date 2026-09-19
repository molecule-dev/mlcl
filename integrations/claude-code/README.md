# Molecule for Claude Code — plugin + marketplace

The install-once surface for Claude Code: two skills (scaffold a new app,
extend/swap packages) plus the `molecule` MCP server (`molecule-mcp`) bundled
via `.mcp.json`, so tools like `search_packages` / `list_templates` /
`scaffold_project` are available without any shell-out.

## Layout

```
.claude-plugin/marketplace.json     # marketplace "molecule" (future standalone repo root — see runbook below)
plugins/molecule/                   # the plugin
  .claude-plugin/plugin.json        # manifest (only file allowed in .claude-plugin/)
  skills/build-with-molecule/SKILL.md
  skills/extend-with-packages/SKILL.md
  .mcp.json                         # bundled molecule-mcp server
```

## Test locally (before anything is published)

```bash
claude --plugin-dir ./plugins/molecule
# then in the session: the skills trigger on "build me X" / "add payments",
# and `molecule` MCP tools appear once molecule-mcp is on PATH or the
# .mcp.json command is overridden to a local build:
#   {"mcpServers":{"molecule":{"command":"node","args":["<repo>/mlcl/mcp/bin/run.js"]}}}
# (set MOLECULE_MCP_CLI=<repo>/mlcl/bin/run.js while mlcl is unpublished)
# /reload-plugins after edits.
```

## Launch runbook (when mlcl + molecule-mcp are published)

1. Move this directory's CONTENTS to its own public repo
   `github.com/molecule-dev/molecule-claude-code` (repo root = marketplace
   root). Keep this source dir as the working copy until then.
2. Bump plugin `version` in `plugins/molecule/.claude-plugin/plugin.json`
   whenever skills change (users only get updates on version bumps).
3. Users install with:
   ```
   /plugin marketplace add molecule-dev/molecule-claude-code
   /plugin install molecule@molecule
   ```
4. List it in the awesome-claude-code / MCP registry roundups (Smithery,
   Glama, PulseMCP list `molecule-mcp` separately).
