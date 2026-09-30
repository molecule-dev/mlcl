#!/usr/bin/env bash
# Deploy the hosted MCP (https://mcp.molecule.dev/mcp) to Fly.
# Assembles a small build context — this package + the two catalogs — so the
# remote builder never receives the whole mlcl repo, then deploys it.
#   bash mcp/scripts/deploy-remote.sh            # from the mlcl repo root
set -euo pipefail
cd "$(dirname "$0")/../.."
ctx=$(mktemp -d)
trap 'rm -rf "$ctx"' EXIT
cp -r mcp/src mcp/assets mcp/package.json mcp/tsconfig.json mcp/Dockerfile mcp/fly.toml "$ctx/"
mkdir -p "$ctx/catalog"
cp registry.json "$ctx/catalog/registry.json"
cp templates/apps/registry.json "$ctx/catalog/templates.json"
cd "$ctx"
# aarch64 workstations must build remotely: Fly machines are amd64.
flyctl deploy --remote-only --config fly.toml --app molecule-mcp
