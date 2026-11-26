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

import { defaultProviderEntries, defaultProviderFor } from './default-provider.js'
import { resolveLocalePackages } from './features.js'
import { getMoleculeVersion, loadRegistry, requirePackageByRole } from './registry.js'
import type { InferredPackage } from './schema.js'
import { rendererFramework, type RendererManifest } from './web-only.js'

/**
 * The `@molecule/*` packages a dependency set is missing from its registry
 * `moleculePeers` + `defaultProvider` + companion-locale closure.
 *
 * A scoped default is eligible on its own renderer, and any existing provider for the core
 * suppresses an automatic choice.
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
 * @param framework - The renderer of the manifest being closed, if known.
 * @returns The missing package names, in discovery order.
 */
export function missingMoleculePeers(
  names: Iterable<string>,
  registryPackages: ReadonlyMap<string, InferredPackage> = new Map(
    loadRegistry().map((p) => [p.name, p]),
  ),
  framework?: string,
): string[] {
  const have = new Set([...names].filter((d) => d.startsWith('@molecule/')))
  const queue = [...have]
  const missing: string[] = []
  const packages = [...registryPackages.values()]
  const entries = defaultProviderEntries(packages)
  const add = (name: string): void => {
    if (have.has(name) || !registryPackages.has(name)) return
    have.add(name)
    queue.push(name)
    missing.push(name)
  }

  let visited = 0
  for (;;) {
    // Close the required graph first so a provider reached by a deeper peer can suppress a default.
    for (; visited < queue.length; visited++) {
      for (const peer of registryPackages.get(queue[visited])?.molecule?.moleculePeers ?? [])
        add(peer)
    }
    for (const locale of resolveLocalePackages(queue, packages)) add(locale)
    if (visited < queue.length) continue

    for (let index = 0; index < visited; index++) {
      const provider = defaultProviderFor(queue[index], entries, have, framework)
      if (provider) add(provider)
    }
    if (visited === queue.length) return missing
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
export interface MoleculePeerManifest extends RendererManifest {
  [field: string]: unknown
}

/**
 * Declare a manifest's missing `@molecule/*` peers in its `dependencies`, at the
 * registry pins (exact versions), keeping `dependencies` sorted. A peer already
 * declared in either dependency map is never declared again.
 *
 * @param manifest - The parsed `package.json`; changed in place.
 * @param registryPackages - The registry by name, when already loaded by the caller.
 * @returns The names added (empty when the manifest was already closed).
 */
export function closeMoleculePeers(
  manifest: MoleculePeerManifest,
  registryPackages?: ReadonlyMap<string, InferredPackage>,
): string[] {
  const missing = missingMoleculePeers(
    Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }),
    registryPackages,
    rendererFramework(manifest),
  )
  if (missing.length === 0) return []
  const deps = { ...manifest.dependencies }
  for (const name of missing) deps[name] = getMoleculeVersion(name)
  manifest.dependencies = Object.fromEntries(
    Object.entries(deps).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  )
  return missing
}
