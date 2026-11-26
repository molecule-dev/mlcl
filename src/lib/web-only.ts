/**
 * Packages that render only in a browser, and the requests that would bring one into a React
 * Native project.
 *
 * A React feature package is the implementation for React DOM and React Native both, except where
 * the capability itself is the browser's (HTML5 drag-and-drop of `File`s, `MediaRecorder`, a WebGL
 * canvas, a pan-and-zoom editing surface). Such a package's registry entry carries
 * `webOnlyReason`, and `mlcl add` refuses it in a React Native project, before writing the
 * manifest, whether the project asks for it or for a package that requires it as a peer.
 *
 * @module
 */

import { packageFramework } from './package-search.js'
import { loadAppFrameworks } from './registry.js'
import type { InferredPackage } from './schema.js'

/** A requested package that needs a web-only one: the required-peer chain to it, and why. */
export interface WebOnlyChain {
  /** The requested package first and the web-only package last (one name when it is the request). */
  chain: string[]
  /** The web-only package's `webOnlyReason`. */
  reason: string
}

/** The parts of a project manifest that say what it renders with. */
export interface RendererManifest {
  molecule?: { framework?: unknown }
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

/**
 * The project's renderer. Scaffolds record it as `molecule.framework`, including browser projects
 * that use another framework's UI bindings. For an existing app, look at its direct dependencies.
 *
 * @param manifest - The project's `package.json`.
 * @returns The renderer key, or undefined when the manifest does not identify one.
 */
export function rendererFramework(manifest: RendererManifest): string | undefined {
  const framework = manifest.molecule?.framework
  if (typeof framework === 'string' && framework) return framework

  const deps = { ...manifest.dependencies, ...manifest.devDependencies }
  if ('react-native' in deps) return 'react-native'
  if ('react-native-web' in deps) return 'react-native-web'

  const inferred = packageFramework({ runtimeDependencies: Object.keys(deps) }, loadAppFrameworks())
  // A shared dependency such as Expo does not establish a device target by itself.
  return inferred === 'react-native' ? undefined : inferred
}

/** Whether the manifest identifies a device renderer. */
export function rendersOnReactNative(manifest: RendererManifest): boolean {
  return rendererFramework(manifest) === 'react-native'
}

/**
 * The web-only packages each requested package is or requires, through the registry's
 * `moleculePeers` (the peers every install of it declares), with the shortest chain to each. Each
 * web-only package is reported once, by the first requested package that reaches it.
 *
 * @param names - The requested package names.
 * @param registryPackages - The registry by name.
 * @returns One entry per web-only package reached, in request order.
 */
export function webOnlyChains(
  names: readonly string[],
  registryPackages: ReadonlyMap<string, InferredPackage>,
): WebOnlyChain[] {
  const found: WebOnlyChain[] = []
  const reported = new Set<string>()
  for (const name of names) {
    // Breadth first, so each web-only package is reached by its shortest chain.
    const parent = new Map<string, string | null>([[name, null]])
    const queue = [name]
    while (queue.length > 0) {
      const at = queue.shift()
      if (at === undefined) break
      const molecule = registryPackages.get(at)?.molecule
      const reason = molecule?.webOnlyReason
      if (reason && !reported.has(at)) {
        reported.add(at)
        const chain: string[] = []
        for (let step: string | null | undefined = at; step; step = parent.get(step))
          chain.unshift(step)
        found.push({ chain, reason })
      }
      for (const peer of molecule?.moleculePeers ?? []) {
        if (parent.has(peer)) continue
        parent.set(peer, at)
        queue.push(peer)
      }
    }
  }
  return found
}

/**
 * The packages a React Native project could install although they render only in a browser: each
 * of `names` (packages that still render DOM elements) that neither carries a `webOnlyReason` nor
 * requires, through its `moleculePeers`, a package that does. `mlcl add` and `mlcl create` refuse
 * every other one in a React Native project.
 *
 * @param names - Package names that render DOM elements.
 * @param registryPackages - The registry by name.
 * @returns The names nothing refuses in a React Native project, in the given order.
 */
export function unrefusedOnReactNative(
  names: readonly string[],
  registryPackages: ReadonlyMap<string, InferredPackage>,
): string[] {
  return names.filter((name) => webOnlyChains([name], registryPackages).length === 0)
}

/**
 * The lines `mlcl add` prints for refused packages: `mind-map-canvas-react → canvas-react: <why>`.
 *
 * @param chains - The chains {@link webOnlyChains} found.
 * @returns One line per chain.
 */
export function describeWebOnlyChains(chains: readonly WebOnlyChain[]): string {
  return chains
    .map(
      ({ chain, reason }) =>
        `  ${chain.map((n) => n.replace(/^@molecule\//, '')).join(' → ')}: ${reason}`,
    )
    .join('\n')
}
