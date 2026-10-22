# The hosted, read-only molecule MCP (https://mcp.molecule.dev/mcp).
# Built from the small context scripts/deploy-remote.sh assembles: this package
# plus the package and template catalogs, baked in because the mlcl repo is
# private (the raw-GitHub default URLs 404). The catalog updates on redeploy.
FROM node:22.23.4-bookworm-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -b

FROM node:22.23.4-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 \
    MOLECULE_REGISTRY_FILE=/app/catalog/registry.json \
    MOLECULE_TEMPLATES_FILE=/app/catalog/templates.json
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist
COPY assets ./assets
COPY catalog ./catalog
USER node
EXPOSE 3000
CMD ["node", "dist/http.js"]
