# AGENTS.md

This project was scaffolded with [mlcl](https://molecule.dev) — the Molecule.dev CLI. It is a conventional TypeScript project you fully own; these notes tell any AI agent (or human) how it is put together so changes stay idiomatic.

## The molecule way

- **Capabilities come from `@molecule/*` packages behind swappable bonds.** Before hand-rolling a feature, check for a package: `npx mlcl search <capability>` (or browse <https://www.molecule.dev/packages>). Install and wire one with `npx mlcl add @molecule/<name> --inject`.
- **Provider wiring lives in `src/bonds/`** (`api/src/bonds/`, `app/src/bonds/`). Swap a provider (PostgreSQL → MySQL, Mailgun → SES, one OAuth provider for another) with `npx mlcl swap @molecule/<new-provider>` (pass `-r @molecule/<old-provider-package>` when the category has several wired), or by editing the one bond file. Vendor SDKs normally live inside a bond, which keeps the app swappable; an SDK imported elsewhere works, it just ties that code to the vendor.
- **Read a package's docs before using it.** Every `@molecule/*` package ships a generated README at `node_modules/@molecule/<name>/README.md` with its API, examples, and wiring.
- **Styling** in the scaffolded components goes through the ClassMap bond — `getClassMap()` from `@molecule/app-ui` and its framework bindings — so a styling-library swap only touches that bond. Your own CSS and utility classes work too (pass raw classes through `cm.cn(...)`); they just won't follow a ClassMap swap.
- **All user-facing text through i18n** — `t('key', values, { defaultValue })` with translations in the locale bonds; never hardcode strings in components.
- **Database tables** are timestamped `.sql` files in `api/migrations/` (an `api/`-shaped project). Add a new migration; never edit one that has run.
- **New API endpoints** are one `.ts` per feature in `api/src/handlers/`, registered in `api/src/handlers/index.ts`. Mirror an existing handler's shape.

## Dev loop

```bash
npm run dev     # api + app dev servers (or the single one this shape has)
npm run build   # type-check + compile
npm test        # vitest suites
```

`.env` files hold provider credentials (see `.env.example` / the keys the scaffold printed). Secrets never go in code.

The project-root `.npmrc` sets `legacy-peer-deps=true` on purpose (one pinned
dev dependency's peer range lags the toolchain; the file's comment says when
to delete it) — do not "clean it up".
