# Integrating Molecule packages into an existing app

This guide covers the **external-app integration path**: pulling `@molecule/*`
packages (and the bond wiring that connects them) into an app/api you already
have — one that was _not_ scaffolded by `mlcl create` and lives in your usual
dev environment.

Most production apps are advanced, complex, and varied; porting them wholesale
into the Molecule IDE is usually a waste of time. The realistic flow is the
reverse: **build the piece you need in the Molecule IDE, verify it works, then
bring it back to your own repo with the `mlcl` CLI.**

---

## TL;DR — the recommended flow

```
┌─────────────────────┐   build + verify    ┌──────────────────────┐   git / export   ┌────────────────────┐
│  Molecule.dev IDE   │ ──────────────────▶ │  a real Molecule app │ ───────────────▶ │  your existing repo │
│   (Synthase agent)  │   the feature you    │  (package.json +     │   the generated   │  (your dev env)     │
└─────────────────────┘   want, wired up     │   src/bonds/ + code) │   files            └─────────┬──────────┘
                                             └──────────────────────┘                              │
                                                                                                   │ mlcl add / inject / swap
                                                                                                   ▼
                                                                                    @molecule packages integrated
```

1. **Build it in the Molecule IDE.** Describe the capability to Synthase, let it
   scaffold + wire the `@molecule/*` packages, and confirm it runs in the
   sandbox.
2. **Get the files into your repo.** Push the IDE project to your git remote (or
   download it) and copy the relevant slice — the new `@molecule/*` dependencies
   in `package.json`, the generated `src/bonds/*` files, and any handler/resource
   code — into your existing project.
3. **Integrate locally with `mlcl`.** From your project, use the CLI to add more
   packages, wire them, or swap providers — see below. These commands operate
   directly on your real files; nothing is ported into the IDE.

> **Why the CLI and not an MCP server?** See
> [Surface decision](#surface-decision-cli-vs-mcp-server) at the bottom.

---

## What `mlcl` assumes about your project

`mlcl add`, `mlcl inject`, and `mlcl swap` are designed to work on a real,
existing project. They look for these conventions, in order of preference:

| Assumption                                                             | Used by          | What if it's missing                                                                                                                                                    |
| ---------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A `package.json` in the directory you run the command from             | all              | `mlcl add` errors with a clear message; run it from your project root (or its `api/`/`app/` subdir).                                                                    |
| A `molecule.projectType` marker (`"api"` or `"app"`) in `package.json` | `swap`, `inject` | `mlcl create` writes this and an IDE export preserves it. Without it, the commands fall back to the next signals.                                                       |
| A full-stack layout with `api/` and/or `app/` subdirectories           | `swap`, `inject` | Falls back to the next signal.                                                                                                                                          |
| A `src/bonds/` directory (the molecule bond-wiring convention)         | `swap`           | This is the key fallback: **if your app has a `src/bonds/` dir, `mlcl swap` treats that directory as the project root even without the `molecule.projectType` marker.** |
| `@molecule/*` already installed / present in `node_modules`            | `inject`         | `inject` scans the installed package's source. Run `npm install` (or `mlcl add` first) so the package is resolvable.                                                    |

The single hard requirement is a `package.json`. The bond convention
(`src/bonds/<category>-<provider>.ts` files re-exported and called from
`src/bonds/index.ts`) is what `swap` rewrites, so adopting it is what makes
provider swapping work in a flat, non-scaffold app.

---

## Step 1 — add a package: `mlcl add`

```bash
cd your-app           # the dir with package.json
mlcl add @molecule/api-emails-mailgun
```

`mlcl add` writes the dependency into `package.json` (exact-pinned, never a
range) and runs `npm install`.

**Version resolution.** It first asks npm for the published version. If that
lookup fails — the package isn't on the public registry yet (the current MVP
state), you're offline, or you use a private registry — it **falls back to the
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

`inject` generates the bond setup files, registers them in `src/bonds/index.ts`,
adds any required peer dependencies, migrations, and routes, then validates and
(optionally) tests the result. It scans the **installed** package, so the
package must be present in `node_modules` (that's why `--inject` on `add`
installs first).

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
3. Deletes the old `src/bonds/<old>.ts`, generates `src/bonds/<new>.ts` with the
   correct setup code (it reads the new package's real exports — no guessing),
   and rewires `src/bonds/index.ts`.
4. Runs `npm install`, syncs assets, and formats.

Flags: `--replace <pkg>` (required when more than one provider for the interface
is installed), `--no-interactive`, `--no-install`, `--no-format`.

> If your app uses the bond convention but was never scaffolded by `mlcl create`
> (no `molecule.projectType` marker), `swap` still works as long as
> `src/bonds/` exists — it detects that directory as the project root.

---

## Caveats & what to do when conventions don't line up

- **`@molecule/*` packages are not on the public npm registry yet.** During the
  MVP, `npm install @molecule/x` will 404. Two ways forward:
  - Bring the packages in via your IDE export (the exported project already
    references them), or
  - Point your `package.json` at local/file or a private registry. `mlcl add`'s
    registry-version fallback keeps the command working in the meantime, but the
    install step still needs the package to be resolvable by your package manager.
- **No `src/bonds/` directory.** If your existing app doesn't follow the bond
  convention, `mlcl swap` can't find where wiring lives. Easiest fix: scaffold
  the feature in the IDE (which produces `src/bonds/`), copy that directory in,
  then run `mlcl` against it. Alternatively, create `src/bonds/index.ts` with a
  `setupBonds()` function by hand and call it from your server bootstrap.
- **Non-standard project layout.** `mlcl` expects bond files under
  `src/bonds/`. If your app keeps source elsewhere, the lowest-friction path is
  to keep molecule's bond wiring in a conventional `src/bonds/` and import
  `setupBonds()` from wherever you start your server.
- **Styling / i18n conventions.** Molecule app packages route UI through the
  ClassMap bond (`getClassMap()`) and i18n (`t(...)`); they don't ship raw
  Tailwind or hardcoded strings. When you drop molecule UI into an existing app,
  make sure a ClassMap provider and an i18n provider are wired (the IDE export
  includes them).
- **Always re-run your own build + tests** after integrating. `mlcl inject`
  runs the generated project's smoke tests, but your app's full suite is the
  real gate.

---

## Surface decision: CLI vs MCP server

ADV1 asks which surface to ship for external-app integration: the **CLI**
(`mlcl add`/`swap`/`inject`) or a dedicated **MCP server / bridge**. The MVP
answer is the **CLI**.

**Why the CLI is the MVP surface:**

- It already exists and works end-to-end on a real, non-scaffold project
  (verified: `add` with registry-version fallback, `swap` on a flat app with no
  `molecule.projectType` marker, the result type-checks).
- It operates **directly on the user's files in their own dev environment** —
  exactly what ADV1 wants ("port it over to their usual dev environment"). There
  is nothing to host, no process to keep alive, no auth.
- It is the most universal surface: every editor, agent, and CI runner has a
  terminal. No editor-specific integration is required.
- "Export" is just getting the IDE's generated files into the user's repo
  (git push / download). The IDE already emits a complete, conventional project;
  the local CLI does the integration. No bridge process is needed to connect the
  two.

**MCP server = research / post-MVP, not built now.** An MCP server would be a
thin transport wrapper around the _same_ `mlcl` operations, adding tool schemas,
auth, and lifecycle for no new capability at MVP. It becomes worthwhile later,
when we want an agent running _inside_ the user's editor (e.g. Claude in their
IDE) to drive `add`/`swap`/`inject` with structured results and package
discovery without shelling out. That is an enhancement layered on top of the CLI
primitives this guide already documents — track it as future work, not an MVP
blocker.
