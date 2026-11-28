# {{PROJECT_NAME}}

Built from [Molecule.dev](https://molecule.dev) packages: each capability (database, auth, email, …) is a `@molecule/*` package, and `api/src/bonds/` chooses the provider behind it, so a provider can change without touching the code that uses it.

Use a Node.js version accepted by `engines.node` in the root `package.json`.

## Quick start

```bash
npm install
{{ENV_STEP}}npm run dev
```

## Architecture

- **`api/`** — Express API (TypeScript, ESM)
- **`app/`** — {{FRAMEWORK}} frontend (Vite)
- **`api/src/bonds/`** — provider wiring (the swappable layer — see AGENTS.md)
- **`api/src/handlers/`** — domain API endpoints, one `.ts` per feature
- **`api/migrations/`** — timestamped SQL migrations
- **`app/src/pages/`** — UI pages
- **`app/src/components/`** — UI components

## Growing this project

```bash
# Find a capability:
{{CLI_COMMAND}} search payments

# Add and wire it (installs + bonds + migrations + routes):
{{CLI_COMMAND}} add @molecule/api-payments-stripe --inject

# Swap a provider:
{{CLI_COMMAND}} swap @molecule/api-database-mysql
```

Read any installed package's docs with `{{CLI_COMMAND}} docs @molecule/<name>` (the README is at `node_modules/@molecule/<name>/README.md`).

## AI agents

`AGENTS.md` holds the conventions coding agents follow here (bonds, ClassMap styling, handler patterns, migrations). `{{CLI_COMMAND}} setup` gives your agents Molecule's MCP tools, skills and these conventions, on this machine or in this project.

## Deploy

To deploy on molecule.dev:

```bash
{{CLI_COMMAND}} login
{{CLI_COMMAND}} deploy --project <id> --follow
```
