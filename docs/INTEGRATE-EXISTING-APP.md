# Integrating Molecule packages into an existing app

This guide covers adding `@molecule/*` packages, and the bond wiring that connects
them, to a JavaScript or TypeScript project you already have: one that was _not_
scaffolded by `mlcl create` and lives in your usual dev environment. Your coding
agent can do every step below; `mlcl setup` gives it the molecule MCP tools and
the conventions that tell it to.

---

## TL;DR

```bash
cd your-app                                    # the dir with package.json
npx mlcl search "send emails"                  # find the package
npx mlcl add @molecule/api-emails-mailgun --inject
```

The last command installs the package, writes `src/bonds/emails-mailgun.js` and a
`setupBonds()` function in `src/bonds/index.js`, and prints the two lines to add
to your server's entry file:

```
In src/server.js, before the server starts listening:
  import { setupBonds } from './bonds/index.js'
  await setupBonds()
```

Add them once. Every later `mlcl add --inject` adds its provider to the same
`setupBonds()`, and `mlcl swap` changes a provider's vendor in place.

**Another route:** build the feature in the Molecule IDE, verify it there, then
copy the generated `src/bonds/` files and handler code into your repo and keep
going with the CLI.

> **CLI or MCP server?** See
> [Surface decision](#surface-decision-cli-vs-mcp-server) at the bottom.

---

## What `mlcl` does in a project it did not create

A project whose `package.json` has no `molecule.projectType` marker (`mlcl create`
writes it, an IDE export keeps it) is treated as yours:

| What                        | Behaviour                                                                                                                                                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Files written               | Only the provider files under `src/bonds/`, the setup function (`setupBonds()` for an API, `setupProviders()` for an app), a router only when a package brings routes, and a migration runner when one brings tables. |
| Files left alone            | Your entry point, router, tests, CI workflows and every file the command did not write. Only the files it wrote are formatted.                                                                                        |
| Language                    | TypeScript when the project has a `tsconfig.json` or depends on `typescript`; otherwise JavaScript as ES modules. A CommonJS package (no `"type": "module"`) gets `.mjs` files, loaded with `await import()`.         |
| What it prints              | The lines that call the setup function from your entry file (found from the `start`/`dev` script or `main`), mount the router, and create the tables. A step your entry file already has is left out.                 |
| Providers you already chose | A database or other provider already in `package.json` is used instead of Molecule's default one.                                                                                                                     |

The one hard requirement is a `package.json`. The bond convention
(`src/bonds/<category>-<provider>` files called from `src/bonds/index`) is what
`swap` rewrites, and `inject` creates it for you.

---

## Step 1 — add a package: `mlcl add`

```bash
cd your-app           # the dir with package.json
mlcl add @molecule/api-emails-mailgun
```

`mlcl add` writes the dependency into `package.json` (exact-pinned, never a
range) and runs `npm install`.

**Version resolution.** It first asks npm for the published version. If that
lookup fails — you're offline, or your registry doesn't proxy the
`@molecule/*` scope — it **falls back to the
exact lockstep version recorded in the molecule registry** and warns you so you
can adjust it:

```
› Warning: Could not resolve @molecule/api-logger from npm — pinned 1.0.0 from
  the local molecule registry. Adjust the version in package.json if you target
  a different release.
```

Useful flags:

- `--no-install` — write `package.json` only; install yourself later.
- `-D, --dev` — add as a `devDependency`.
- `--inject` — chain straight into `mlcl inject` (installs **and** wires the
  package into your bonds in one step):

  ```bash
  mlcl add @molecule/api-emails-mailgun --inject
  ```

---

## Step 2 — wire it up: `mlcl inject`

```bash
mlcl inject                              # wire every pending @molecule/* dep
mlcl inject -m @molecule/api-emails-mailgun   # wire a specific one
mlcl inject --dry-run                    # preview the plan, change nothing
```

`inject` generates the bond setup files, registers them in `src/bonds/index`,
adds any required peer dependencies, migrations, and routes, then validates the
result (and, in a project `mlcl create` made, runs its smoke tests). It scans the
**installed** package, so the package must be present in `node_modules` (that's
why `--inject` on `add` installs first).

When `src/bonds/index`, the router or the locale setup already exist, `inject`
adds the new package's imports, calls, secret names and routes to them and keeps
everything that is there: the providers already wired, your own calls, and a call
marked `KEEP THIS CALL LAST` stays last. A file it cannot merge safely is left
unchanged, with a warning that says what to add by hand.

---

## Step 3 — swap a provider: `mlcl swap`

Swap one provider for another that implements the same core interface — e.g.
move from Postgres to MySQL, or Mailgun to SES:

```bash
mlcl swap @molecule/api-database-mysql --replace @molecule/api-database-postgresql
```

This:

1. Resolves the new provider from the registry and confirms it implements the
   same interface as the one being replaced.
2. Updates `package.json` — removes the old provider, adds the new one pinned to
   the exact lockstep version.
3. Deletes the old `src/bonds/<old>` file, generates `src/bonds/<new>` with the
   correct setup code (it reads the new package's real exports — no guessing,
   and in the project's language: `.ts`, `.js` or `.mjs`), and rewires
   `src/bonds/index`, including the list of secrets `setupBonds()` loads: the
   old provider's names come out and the new provider's go in.
4. Runs `npm install`, syncs assets, and formats the files it wrote.

Flags: `-r, --replace <full-package-name>` (needed only when more than one provider for the
interface is wired in `src/bonds/`), `--no-interactive`, `--no-install`, `--no-format`.

> If your app uses the bond convention but was never scaffolded by `mlcl create`
> (no `molecule.projectType` marker), `swap` still works as long as
> `src/bonds/` exists — it detects that directory as the project root.

---

## Caveats & what to do when conventions don't line up

- **`@molecule/*` packages are public on npm** (Apache-2.0). `mlcl add` and a
  plain `npm install @molecule/<name>` both resolve from the registry; the
  registry-version fallback only matters when you're offline or behind a
  registry that doesn't proxy the scope.
- **Non-standard project layout.** Bond files live under `src/bonds/`. If your
  app keeps source elsewhere, keep molecule's wiring there anyway and import the
  setup function from wherever you start your server, as the printed lines show.
- **Styling / i18n conventions.** Molecule app packages route UI through the
  ClassMap bond (`getClassMap()`) and i18n (`t(...)`); they don't ship raw
  Tailwind or hardcoded strings. When you drop molecule UI into an existing app,
  make sure a ClassMap provider and an i18n provider are wired (the IDE export
  includes them).
- **Always re-run your own build + tests** after integrating. In a project it
  did not create, `mlcl inject` adds no tests of its own; your app's suite is
  the gate.

---

## Surface decision: CLI vs MCP server

Which surface serves external-app integration: the **CLI**
(`mlcl add`/`swap`/`inject`) or a dedicated **MCP server / bridge**? The CLI
is the primary surface.

**Why the CLI is the primary surface:**

- It works end-to-end on a real, non-scaffold project — including `swap` on a
  flat app with no `molecule.projectType` marker.
- It operates **directly on the user's files in their own dev environment**.
  There is nothing to host, no process to keep alive, no auth.
- It is the most universal surface: every editor, agent, and CI runner has a
  terminal. No editor-specific integration is required.
- "Export" is just getting the IDE's generated files into the user's repo
  (git push / download). The IDE already emits a complete, conventional project;
  the local CLI does the integration. No bridge process is needed to connect the
  two.

**MCP server — on npm as `molecule-mcp`, layered on the CLI.** `molecule-mcp` is a thin structured wrapper over
these same `mlcl` operations: a local stdio mode (full tool set, wraps the
local CLI — what `mlcl setup` and `mlcl mcp install` register) and a hosted read-only HTTP
mode at `https://mcp.molecule.dev/mcp` (search/templates/docs/conventions;
live now — the surface URL-based clients like Lovable/v0/bolt
connectors use). The CLI remains the source of truth and the most universal
surface; the MCP server serves agents that prefer structured tools over
shelling out. Everything in this guide still applies unchanged — see
[AGENTS-AND-HARNESSES.md](AGENTS-AND-HARNESSES.md) for the full wiring guide.
