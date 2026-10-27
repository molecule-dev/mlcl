---
name: capability-first
description: Use BEFORE implementing any capability — a feature, an integration, a script or a tool. Inspect what the registry and the installed packages already provide, reuse it, adapt the owning package/bond when it is genuinely awkward, and create a typed interface plus swappable providers only for a reusable gap.
---

# Capability first

A capability is anything you are about to implement: a feature for this app, an
integration, a background job, a script, a piece of tooling. Molecule exists so
each of those is built ONCE as a shared package or bond and then reused
everywhere. Work the order below before writing new code — including when the
work looks like a quick script or an internal tool.

## 1. Inspect — what already provides this?

- **Search before designing.** `find_package` answers "is this already built?"
  from the package registry, which carries each package's category, stack,
  providers and intent hints (on a host: `mlcl search <capability>`, or
  `search_packages` over MCP). The `molecule-packages` skill is this workspace's
  catalog.
- **Read the installed contract, not your memory of it.** A package's
  `README.md` — generated from its `src/index.ts` JSDoc, so it cannot be stale —
  documents its interface, required methods and wiring:
  `node_modules/@molecule/<name>/README.md`.
- **Look at what is already wired.** The `src/bonds/` files name every provider
  this project already uses, and `get`/`require` from the bond package name the
  ones you can call.

## 2. Reuse — use the existing capability

If a package provides it, call its API and use the provider already chosen. Never
copy, re-implement or vendor a local version of a capability a bond already
exposes: a copy is invisible to every later fix, swap or security change.

## 3. Adapt — fix the shared capability at its owner

If the shared capability is genuinely awkward or missing a piece you need (the
wrong shape, no accessor, one provider where you need a second, a vendor
hardcoded inside a consumer), change it in the package or bond that OWNS it —
source, docs and a test — and then consume the fixed contract. Do not fork it into
the app, and do not paper over it in a caller.

## 4. Create — only for a reusable gap

Create a new package only when the capability is genuinely reusable and nothing
in the fleet covers it:

- a **typed interface** in a core package: types and an accessor only, no
  implementation and no vendor import;
- one **provider per vendor** in a `@molecule/*-<category>-<vendor>` bond package,
  each exporting a typed `provider` constant;
- consumers call the interface, never the vendor.

**Thin composition root.** Exactly one place chooses the vendor — the app's
`src/bonds/` file, or the entry point of a script. Everything behind it stays
vendor-agnostic. Choosing a provider there is configuration; importing a vendor
anywhere else is coupling.

## Counterexamples — do not package these

- A single-use helper for one screen or one request stays in the app.
- A one-off investigation, a migration, or an operational shell pipeline stays a
  script.
- Business logic that is specific to this app is not a shared package.
- Do not invent a package for something only this project will ever use — a wrong
  abstraction outlives the duplication it was meant to remove.

## Verify

Prove the consumer path, not the mechanism: the app builds and its own tests run,
or the script runs end to end against the real provider. A mock of your own
interface proves nothing. Then check the counterexample — the case where the
shared path does not apply still takes the local path.
