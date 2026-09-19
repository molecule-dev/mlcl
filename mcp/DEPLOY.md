# Deploying mcp.molecule.dev (the hosted remote MCP)

The remote, read-only face of `molecule-mcp` (`src/remote.ts` + `src/http.ts`)
serves URL-based MCP clients: Lovable chat connectors, v0 MCP integrations,
bolt.new Connectors, and any harness's short install
(`claude mcp add --transport https https://mcp.molecule.dev/mcp`).

## What it serves

Read tools only — `search_packages`, `list_templates`, `read_package_doc`,
and the `molecule://conventions` resource. No writes, no user data, no
secrets: the catalog comes from the public mlcl repo (raw GitHub, 10-min
cache) and docs from the npm registry API. Stateless per request.

## Deploy (Fly, matching the rest of molecule.dev)

```dockerfile
# mcp/Dockerfile
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/http.js"]
```

```toml
# fly.toml sketch
app = "molecule-mcp"
primary_region = "ewr"
[http_service]
  internal_port = 3000
  force_https_domains = ["mcp.molecule.dev"]
[[http_service.checks]]
  path = "/health"
```

```bash
cd mcp && fly deploy
fly certs add mcp.molecule.dev   # + DNS CNAME → <app>.fly.dev
```

Env knobs (all optional): `MOLECULE_REGISTRY_URL` / `MOLECULE_TEMPLATES_URL`
(default: raw.githubusercontent of the public mlcl repo — requires the repo
public, which is a launch-day step), `PORT`.

## Launch checklist (in order)

1. mlcl repo public + `mlcl`/`molecule-mcp` published (the default URLs depend
   on the public repo).
2. `fly deploy` + cert + DNS for `mcp.molecule.dev`.
3. Verify: `claude mcp add --transport https https://mcp.molecule.dev/mcp`
   then `/mcp` shows `molecule-remote` with the read tools.
4. Submit the HTTPS URL to Lovable connectors / v0 / bolt.new (see
   ../docs/LISTINGS.md) — their forms take the URL directly.
5. Consider rate limiting at the edge (fly proxy or a tiny middleware) once
   traffic justifies it; the tool set is read-only and cache-backed, so the
   blast radius of abuse is bandwidth, not state.
