/**
 * The `@molecule/*` packages a manifest must declare NEXT TO the ones it already
 * declares: the registry `moleculePeers` + `defaultProvider` closure, with each
 * package's companion locale bonds.
 *
 * Every scaffold installs with `--legacy-peer-deps` (the project's `.npmrc`),
 * which installs no peers, so a package declared without its required peers is
 * absent from `node_modules` everywhere but a workspace that hoists the fleet —
 * the app builds in the sandbox and fails to resolve an import once it is
 * installed anywhere else. Anything that declares a `@molecule/*` package
 * (`mlcl create`, the activity-capture step, `mlcl add`, a platform export of a
 * project whose manifest was edited by hand) closes over this.
 *
 * Kept free of the scaffold module graph so a host process (molecule.dev's
 * project export) can load it on its own.
 *
 * @module
 */

import { resolveLocalePackages } from './features.js'
import { getMoleculeVersion, loadRegistry, requirePackageByRole } from './registry.js'
import type { InferredPackage } from './schema.js'

/**
 * The `@molecule/*` packages a dependency set is missing from its registry
 * `moleculePeers` + `defaultProvider` + companion-locale closure.
 *
 * A core's default provider counts only when nothing in the set already
 * implements that core (same rule as `resolveDefaultProviders` in `./features.ts`):
 * an app on SQLite must not also get Postgres.
 *
 * Each package's companion locale bonds count too (`resolveLocalePackages`, the
 * rule `mlcl create` selects them by): `mlcl inject` plans the locale bond of
 * every `@molecule` package a manifest declares and refuses one that is not
 * installed. A peers-only closure gave every full-stack scaffold
 * `@molecule/api-uploads` (a peer of `@molecule/api-bonds-default-express`)
 * without `@molecule/api-locales-uploads`, and `mlcl inject -p api` then exited 1
 * on a freshly installed project.
 *
 * @param names - The declared dependency names (non-`@molecule` names are ignored).
 * @param registryPackages - The registry by name; read from `registry.json` when omitted.
 * @returns The missing package names, in discovery order.
 */
export function missingMoleculePeers(
  names: Iterable<string>,
  registryPackages: Map<string, InferredPackage> = new Map(loadRegistry().map((p) => [p.name, p])),
): string[] {
  const have = new Set([...names].filter((d) => d.startsWith('@molecule/')))
  const missing: string[] = []
  closePeers([...have], have, missing, registryPackages)
  // A locale bond added here may bring peers of its own, and a peer added for it
  // a locale bond: repeat until neither adds anything.
  for (;;) {
    const locales = resolveLocalePackages([...have], [...registryPackages.values()]).filter(
      (name) => !have.has(name),
    )
    if (locales.length === 0) return missing
    for (const name of locales) {
      have.add(name)
      missing.push(name)
    }
    closePeers(locales, have, missing, registryPackages)
  }
}

/**
 * Adds the `moleculePeers` + `defaultProvider` closure of `queue` to `have` and `missing`.
 *
 * @param queue - The packages whose closure to walk; consumed.
 * @param have - Every package the set holds so far; grows.
 * @param missing - The packages the walk added, in discovery order; grows.
 * @param registryPackages - The registry by name.
 */
function closePeers(
  queue: string[],
  have: Set<string>,
  missing: string[],
  registryPackages: Map<string, InferredPackage>,
): void {
  while (queue.length > 0) {
    const name = queue.shift()!
    const entry = registryPackages.get(name)
    if (!entry) continue
    // A core's default bond only when nothing in the manifest already provides
    // its category: an app on SQLite also got Postgres, and its bond index then
    // wired both database providers (X1 run sol-m08 read that as a broken
    // scaffold and rewrote every migration).
    const provided = [...have].some((n) => {
      const m = registryPackages.get(n)?.molecule
      return m?.implements === name && m.type !== 'framework'
    })
    const next = [
      ...(entry.molecule?.moleculePeers ?? []),
      ...(entry.molecule?.defaultProvider && !provided ? [entry.molecule.defaultProvider] : []),
    ]
    for (const peer of next) {
      if (have.has(peer) || !registryPackages.has(peer)) continue
      have.add(peer)
      queue.push(peer)
      missing.push(peer)
    }
  }
}

/**
 * The package that registers the app's service worker, when a package the user chose needs it.
 *
 * Web push (`generates: ['service-worker-push']`, `@molecule/app-push`) works only in an app
 * that registers a service worker, and the PWA package that registers it is an OPTIONAL peer:
 * every app with a framework binding holds `@molecule/app-push` because the binding exposes its
 * hooks, and a peer walk must not install the worker's build toolchain (vite-plugin-pwa and
 * workbox, about 190 packages) into an app that sends no push. So the worker comes with a
 * deliberate choice of the push package (`mlcl create --packages`, `mlcl add`), never with a
 * peer walk.
 *
 * @param chosen - The packages the user named, before any peer closure.
 * @param registryPackages - The registry by name; read from `registry.json` when omitted.
 * @returns The worker package's name when a chosen package needs it, else `undefined`.
 */
export function serviceWorkerPackageFor(
  chosen: Iterable<string>,
  registryPackages: Map<string, InferredPackage> = new Map(loadRegistry().map((p) => [p.name, p])),
): string | undefined {
  const needsWorker = [...chosen].some((name) =>
    (registryPackages.get(name)?.molecule?.generates ?? []).includes('service-worker-push'),
  )
  return needsWorker ? requirePackageByRole('app', 'feature', 'pwa-default') : undefined
}

/** Peer types whose wiring is a project file: a provider's bond setup, a locale bond's registration. */
const WIRED_PEER_TYPES = new Set(['provider', 'locales'])

/**
 * The packages `mlcl add --inject` hands to `mlcl inject`: the one the user named, then the
 * `@molecule/*` packages `add` declared with it whose wiring is a project file: each provider
 * (its bond setup) and locale bond (its registration), and the service worker package push needs.
 * Cores, middleware cores and infrastructure have no wiring of their own; their providers do it.
 *
 * Injecting the named package alone left its required providers installed but never bonded:
 * `mlcl add @molecule/api-uploads-filesystem --inject` declared the body parser and its Express
 * provider, and the first upload failed with "No upload parser factory has been bonded".
 *
 * @param named - The package the user named.
 * @param declared - The packages `add` declared with it (its missing peers, and the worker).
 * @param registryPackages - The registry by name; read from `registry.json` when omitted.
 * @returns The named package first, then the declared ones to wire, in declaration order.
 */
export function moleculesToInject(
  named: string,
  declared: Iterable<string>,
  registryPackages: Map<string, InferredPackage> = new Map(loadRegistry().map((p) => [p.name, p])),
): string[] {
  const worker = serviceWorkerPackageFor([named], registryPackages)
  const wired = [...declared].filter(
    (name) =>
      name !== named &&
      (name === worker || WIRED_PEER_TYPES.has(registryPackages.get(name)?.molecule?.type ?? '')),
  )
  return [named, ...new Set(wired)]
}

/** A `package.json`, as far as the closure reads and writes it. */
export interface MoleculePeerManifest {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  [field: string]: unknown
}

/**
 * Declare a manifest's missing `@molecule/*` peers in its `dependencies`, at the
 * registry pins (exact versions), keeping `dependencies` sorted. A peer already
 * declared in either dependency map is never declared again.
 *
 * @param manifest - The parsed `package.json`; changed in place.
 * @returns The names added (empty when the manifest was already closed).
 */
export function closeMoleculePeers(manifest: MoleculePeerManifest): string[] {
  const missing = missingMoleculePeers([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
  ])
  if (missing.length === 0) return []
  const deps = { ...manifest.dependencies }
  for (const name of missing) deps[name] = getMoleculeVersion(name)
  manifest.dependencies = Object.fromEntries(
    Object.entries(deps).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  )
  return missing
}
