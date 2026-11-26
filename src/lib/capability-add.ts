/**
 * The package `mlcl add --capability "<words>"` (and the MCP `add_package` tool's `query`) adds for a
 * capability described in words, or the candidates when the words do not decide it.
 *
 * The rule, in order:
 *
 * 1. A provider whose vendor the words name (`resend`, `filesystem`): that provider, which brings its
 *    interface. When several do (`redis` names a cache and a queue provider), the one whose interface
 *    the words also name.
 * 2. Otherwise an interface package whose name or label the words name (`uploads`, `email`), the
 *    longest such name first: that interface, with the project's provider for it or its declared
 *    default provider. An interface with neither returns its providers.
 * 3. Anything else (nothing named, two equally named) returns the search's first hits.
 *
 * Words count whole, a trailing `s` allowed: `file` never names `profile`. Only packages the search
 * would show for the words, on the project's stack and framework, are considered. Asked to add a
 * capability, both harnesses searched, then added in a second model turn; on the CLI path Claude
 * then added the interface and its provider separately (harness eval `add`, 2026-11-25).
 *
 * @module
 */

import { defaultProviderFor } from './default-provider.js'
import {
  type AppFrameworkInstalls,
  type SearchHit,
  searchPackages,
  type SearchSourceEntry,
} from './package-search.js'

/** Package types that own an interface a provider implements. */
const INTERFACE_TYPES = new Set(['core', 'infrastructure', 'native', 'middleware'])

/** How many search hits a refusal lists. */
export const CAPABILITY_CHOICES = 5

/** Where an add of a capability runs. */
export interface CapabilityContext {
  /** The project's stack, when it has one (a full-stack root has both). */
  stack?: 'api' | 'app'
  /** The project's app framework (`molecule.framework`). */
  framework?: string
  /** The registry's `appFrameworks`. */
  appFrameworks?: Record<string, AppFrameworkInstalls>
  /** The packages the project already declares. */
  declared?: readonly string[]
}

/** The package to add, or the candidates and why the words did not decide. */
export type CapabilityResolution =
  { name: string; because: string } | { choices: SearchHit[]; because: string }

/**
 * Whether the words name a phrase, whole words with a trailing `s` allowed (`status bar`,
 * `status-bar` and `status bars` alike).
 *
 * @param words - The lowercased query.
 * @param phrase - A vendor, package name or label.
 * @returns How many words the phrase has when the query names it, else 0.
 */
function named(words: string, phrase: string): number {
  const parts = phrase
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  if (parts.length === 0) return 0
  const singular = parts.map((part, index) =>
    index === parts.length - 1 && part.length > 3 && part.endsWith('s') ? part.slice(0, -1) : part,
  )
  const match = new RegExp(`(?:^|[^a-z0-9])${singular.join('[^a-z0-9]+')}s?(?=$|[^a-z0-9])`)
  return match.test(words) ? parts.length : 0
}

/** A package's name without its scope and stack: `@molecule/api-uploads` → `uploads`. */
function shortName(name: string): string {
  return name.replace(/^@molecule\//, '').replace(/^(api|app)-/, '')
}

/**
 * The vendor in a provider's name: what follows its interface's name
 * (`@molecule/api-emails-resend` implementing `@molecule/api-emails` → `resend`).
 */
function vendorOf(provider: SearchSourceEntry): string | undefined {
  if (!provider.implements) return undefined
  const own = shortName(provider.name)
  const prefix = `${shortName(provider.implements)}-`
  return own.startsWith(prefix) ? own.slice(prefix.length) : undefined
}

/** How many words of an interface's name or label the query names (the longer of the two). */
function interfaceNamed(words: string, entry: SearchSourceEntry): number {
  return Math.max(named(words, shortName(entry.name)), entry.label ? named(words, entry.label) : 0)
}

/**
 * The package to add for a capability described in words (see the module comment for the rule).
 *
 * @param entries - The registry, as search reads it.
 * @param query - The capability in words.
 * @param context - The project's stack, framework and declared packages.
 * @returns The package, or the candidates and the reason.
 */
export function resolveCapability(
  entries: readonly SearchSourceEntry[],
  query: string,
  context: CapabilityContext = {},
): CapabilityResolution {
  const words = query.toLowerCase()
  const options = {
    stack: context.stack,
    framework: context.framework,
    appFrameworks: context.appFrameworks,
  }
  const hits = searchPackages(entries, query, { ...options, limit: entries.length || 1 })
  const shown = new Set(hits.map((hit) => hit.name))
  const byName = new Map(entries.map((entry) => [entry.name, entry]))
  const candidates = entries.filter((entry) => shown.has(entry.name))
  const hitsOf = (names: readonly string[]): SearchHit[] =>
    hits.filter((hit) => names.includes(hit.name))
  const top = hits.slice(0, CAPABILITY_CHOICES)

  const interfaces = candidates.filter((entry) => INTERFACE_TYPES.has(entry.type ?? ''))
  const best = Math.max(0, ...interfaces.map((entry) => interfaceNamed(words, entry)))
  const namedInterfaces =
    best > 0 ? interfaces.filter((entry) => interfaceNamed(words, entry) === best) : []

  if (hits.length === 0) return { choices: [], because: `no package matches "${query}"` }

  // A vendor counts with its own interface named, or with no interface named at all: the `file`
  // in "file uploads" is not the audit log's file provider.
  const anyInterface = new Set(
    interfaces.filter((entry) => interfaceNamed(words, entry) > 0).map((entry) => entry.name),
  )
  const vendors = candidates.filter((entry) => {
    const vendor = entry.type === 'provider' ? vendorOf(entry) : undefined
    return vendor !== undefined && named(words, vendor) > 0
  })
  const ownInterface = vendors.filter((entry) => anyInterface.has(entry.implements ?? ''))
  const chosen = anyInterface.size > 0 ? ownInterface : vendors
  if (chosen.length === 1)
    return {
      name: chosen[0].name,
      because: `"${query}" names its vendor${anyInterface.size > 0 ? ' and interface' : ''}`,
    }
  if (chosen.length > 1)
    return {
      choices: hitsOf(chosen.map((entry) => entry.name)),
      because: `"${query}" names a vendor with several providers`,
    }

  // Without a stack (a full-stack root), an interface on each side is two capabilities, not a
  // longer and a shorter name for one: "file uploads" names the api's storage and the app's picker.
  const stacks = new Set(
    interfaces.filter((entry) => anyInterface.has(entry.name)).map((entry) => entry.stack),
  )
  if (!context.stack && stacks.size > 1)
    return {
      choices: hitsOf([...anyInterface]),
      because: `"${query}" names an interface on the api and one on the app: add each by name`,
    }
  if (namedInterfaces.length > 1)
    return {
      choices: hitsOf(namedInterfaces.map((entry) => entry.name)),
      because: `"${query}" names several interfaces`,
    }
  if (namedInterfaces.length === 0)
    return { choices: top, because: `"${query}" names no package's interface or vendor` }

  const [iface] = namedInterfaces
  const declared = new Set(context.declared ?? [])
  const wired = [...declared].find((name) => {
    const entry = byName.get(name)
    return entry?.implements === iface.name && entry.type !== 'framework'
  })
  if (wired) return { name: iface.name, because: `the project's ${wired} provides it` }
  const fallback = defaultProviderFor(iface.name, byName, declared, context.framework)
  if (fallback && !byName.get(fallback)?.replacedBy)
    return { name: iface.name, because: `its default provider ${fallback} comes with it` }
  const providers = entries
    .filter((entry) => entry.type === 'provider' && entry.implements === iface.name)
    .map((entry) => entry.name)
  const listed = searchPackages(
    entries.filter((entry) => providers.includes(entry.name) || entry.name === iface.name),
    shortName(iface.name),
    { ...options, limit: CAPABILITY_CHOICES + 1 },
  ).filter((hit) => hit.name !== iface.name)
  return {
    choices: listed.length > 0 ? listed : hitsOf(providers).slice(0, CAPABILITY_CHOICES),
    because: `${iface.name} has no default provider: name the one to use`,
  }
}

/**
 * A project's stack from its manifest, for a project with one package.json: `app` when it declares
 * a UI framework or `@molecule/app-*` packages, `api` when it declares a server framework or
 * `@molecule/api-*` packages, else undefined (both stacks are considered).
 *
 * @param manifest - The project's package.json.
 * @returns The stack, or undefined.
 */
export function manifestStack(manifest: {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  molecule?: { framework?: unknown }
}): 'api' | 'app' | undefined {
  if (typeof manifest.molecule?.framework === 'string') return 'app'
  const names = Object.keys({ ...manifest.devDependencies, ...manifest.dependencies })
  const app = names.some(
    (name) =>
      name.startsWith('@molecule/app-') ||
      ['react', 'vue', 'svelte', 'solid-js', '@angular/core', 'react-native'].includes(name),
  )
  const api = names.some(
    (name) =>
      name.startsWith('@molecule/api-') ||
      ['express', 'fastify', 'koa', 'hono', '@nestjs/core', '@hapi/hapi'].includes(name),
  )
  return app === api ? undefined : app ? 'app' : 'api'
}
