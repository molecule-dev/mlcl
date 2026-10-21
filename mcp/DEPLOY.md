# Deploying mcp.molecule.dev (the hosted remote MCP)

The remote, read-only face of `molecule-mcp` (`src/remote.ts` + `src/http.ts`)
serves URL-based MCP clients: Lovable chat connectors, v0 MCP integrations,
bolt.new Connectors, and any harness's short install
(`claude mcp add --transport http molecule https://mcp.molecule.dev/mcp`).

## What it serves

Read tools only — `search_packages`, `list_templates`, `read_package_doc`,
and the `molecule://conventions` resource. No writes, no user data, no
secrets. The package and template catalogs are baked into the image
(`MOLECULE_REGISTRY_FILE` / `MOLECULE_TEMPLATES_FILE`) because the mlcl repo
is private — the raw-GitHub default URLs 404 — so the catalog updates on each
redeploy. Package docs come from the npm registry API. Stateless per request.

## Where it runs

Fly app `molecule-mcp` (org personal, region iad), on Fly's default network —
it serves the public internet unauthenticated, so it shares no private network
with the platform. `mcp.molecule.dev` has A/AAAA records in Netlify DNS
(zone molecule.dev) pointing at the app's IPs; the Fly certificate is issued.
Each client address gets `MCP_RATE_PER_MIN` requests a minute (default 120,
`src/http.ts`); beyond that it answers 429.

## Deploy

```bash
bash mcp/scripts/deploy-remote.sh    # from the mlcl root
```

The script assembles a small build context (this package + the two catalogs)
and runs `flyctl deploy --remote-only` with `mcp/Dockerfile` and
`mcp/fly.toml`. Redeploy after catalog changes that users should see.

## Verify

```bash
curl -s -X POST https://mcp.molecule.dev/mcp -H content-type:application/json \
  -H accept:application/json,text/event-stream \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
claude mcp add --transport http molecule https://mcp.molecule.dev/mcp
```

## Still open

- Submit the URL to Lovable connectors / v0 / bolt.new (see ../docs/LISTINGS.md).

The local stdio server (`npx -y molecule-mcp`, what `mlcl mcp install`
registers) is published on npm. It uses the installed `mlcl` CLI on PATH;
keep that CLI current with `npm install -g mlcl`. Publishing a new server
version uses the optional `mcp_publish` input in the owned release workflow.
