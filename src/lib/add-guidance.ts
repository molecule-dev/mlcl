/**
 * What `mlcl add` says about using the package it added: the API the app's code calls, and the
 * environment variables the package reads.
 *
 * A provider is called through its core, and the provider's README mostly repeats the core's
 * types, so the core is the API to read. In the 2026-11-23 add eval, an agent that had already
 * read `@molecule/api-uploads` was sent on to `@molecule/api-uploads-filesystem`'s README as well,
 * one more model turn for nothing it used.
 *
 * A core does nothing until a provider is bonded to it. When the project has none of the core's
 * providers, the lines name them: in the same eval an agent added `@molecule/api-uploads`, was told
 * nothing about a provider, and found out it needed one from the provider's README.
 *
 * The API line carries that API's Quick Start from the registry, the same code a search hit shows:
 * in the 2026-11-24 add evals every agent's next step after the add was to read the core's doc for
 * the calls to write, one model turn each.
 *
 * After the Quick Start come the declarations of what it imports and of the package's types those
 * name, read from the installed package. In the r18 add eval Claude still read the doc in 3 of 5
 * runs, for what `getUploads` returns and what `getFile` resolves to, which the Quick Start's code
 * does not show.
 *
 * @module
 */

import * as fs from 'node:fs'
import { dirname, join } from 'node:path'

import { CLI_COMMAND } from '#cli-command'
import chalk from 'chalk'

import { t } from './i18n.js'
import { readDocDeclarations } from './package-doc-files.js'
import { isOfferedPackage } from './package-search.js'
import { getRawRegistry } from './registry.js'
import { declarationsIn } from './scanner.js'
import type { Registry } from './schema.js'

/** The most declaration text the add result prints: the Quick Start's calls and their types. */
const DECLARATIONS_MAX_CHARS = 3_000

/** How many steps from the Quick Start's imports a named type may be (a call → its return type → that type's member types). */
const DECLARATION_DEPTH = 3

/**
 * The installed copy of a package, found the way Node resolves it from a directory.
 *
 * @param name - The package name.
 * @param from - The directory to resolve from.
 * @returns Its directory, or null when it is not installed.
 */
export function installedPackageDir(name: string, from: string): string | null {
  for (let dir = from; ; dir = dirname(dir)) {
    const candidate = join(dir, 'node_modules', name)
    if (fs.existsSync(join(candidate, 'package.json'))) return fs.realpathSync(candidate)
    if (dirname(dir) === dir) return null
  }
}

/**
 * The declarations a Quick Start's code relies on: each name it imports from its package, then
 * the package's own exported types those declarations name, up to {@link DECLARATION_DEPTH} steps
 * away, read from the installed `.d.ts` files and kept under {@link DECLARATIONS_MAX_CHARS}.
 *
 * @param quickStart - The Quick Start's code.
 * @param api - The package it imports from.
 * @param exported - The package's export names (its registry entry).
 * @param packageDir - The installed package.
 * @returns Declaration texts, the imports first, or none when nothing could be read.
 */
export function quickStartDeclarations(
  quickStart: string,
  api: string,
  exported: readonly string[],
  packageDir: string,
): string[] {
  const escaped = api.replace(/[.*+?^${}()|[\]\\/]/g, (char) => `\\${char}`)
  const from = new RegExp(`import\\s*(?:type\\s*)?\\{([^}]*)\\}\\s*from\\s*['"]${escaped}['"]`, 'g')
  const imported = [...quickStart.matchAll(from)].flatMap((match) =>
    match[1]!
      .split(',')
      .map(
        (part) =>
          part
            .trim()
            .replace(/^type\s+/, '')
            .split(/\s+as\s+/)[0]!,
      )
      .filter(Boolean),
  )
  if (imported.length === 0) return []
  const sources = readDocDeclarations(packageDir, fs).declarations
  const known = new Set(exported)
  const shown = new Map<string, string>()
  let next = [...new Set(imported)]
  let used = 0
  for (let depth = 0; depth < DECLARATION_DEPTH && next.length > 0; depth++) {
    const found = declarationsIn(sources, next)
    const named: string[] = []
    for (const name of next) {
      const text = found[name]
      if (!text || used + text.length > DECLARATIONS_MAX_CHARS) continue
      shown.set(name, text)
      used += text.length
      for (const [word] of text.matchAll(/\b[A-Z]\w*\b/g))
        if (known.has(word) && !shown.has(word) && !named.includes(word)) named.push(word)
    }
    next = named
  }
  return [...shown.values()]
}

/**
 * {@link quickStartDeclarations} for a package `mlcl add` just installed: its API's (the core a
 * provider implements), when the registry records a Quick Start for it.
 *
 * @param name - The added package.
 * @param from - The directory it was installed from.
 * @param registry - The registry to read (default: the CLI's own).
 * @returns Declaration texts, or none when the API is not installed or cannot be read.
 */
export function addedDeclarations(
  name: string,
  from: string,
  registry: Registry = getRawRegistry(),
): string[] {
  const api = registry.packages[name]?.implements ?? name
  const entry = registry.packages[api]
  if (!entry?.quickStart) return []
  try {
    const dir = installedPackageDir(api, from)
    return dir ? quickStartDeclarations(entry.quickStart, api, entry.exports ?? [], dir) : []
  } catch (_error) {
    // Unreadable types: the guidance points at the doc instead.
    return []
  }
}

/**
 * The packages a manifest declares, as dependencies or devDependencies.
 *
 * @param manifest - A package.json.
 * @param manifest.dependencies - Its dependencies.
 * @param manifest.devDependencies - Its devDependencies.
 * @returns Their names.
 */
export function declaredNames(manifest: {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}): string[] {
  return [
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
  ]
}

/**
 * The lines `mlcl add` prints about using a package once it is in.
 *
 * @param name - The added package.
 * @param installed - The packages the project declares once the add is done.
 * @param registry - The registry to read (default: the CLI's own).
 * @param declarations - What the Quick Start's code relies on ({@link quickStartDeclarations}):
 *   printed after it, in place of the pointer to the rest of the doc.
 * @returns The API the code calls (the core a provider implements, else the package itself), with
 *   its Quick Start when the registry records one, the core's providers when the project has none
 *   of them, then the environment variables the package reads, when it reads any (optional ones
 *   marked).
 */
export function afterAddGuidance(
  name: string,
  installed: readonly string[] = [],
  registry: Registry = getRawRegistry(),
  declarations: readonly string[] = [],
): string[] {
  const entry = registry.packages[name]
  const core = entry?.implements
  const api = core ?? name
  const command = chalk.cyan(`${CLI_COMMAND} docs ${api}`)
  const quickStart = registry.packages[api]?.quickStart
  const lines = quickStart
    ? [
        core
          ? t('commands.add.messages.useCoreQuickStart', { core })
          : t('commands.add.messages.quickStart'),
        ...quickStart.split('\n').map((line) => (line ? `    ${line}` : '')),
        ...(declarations.length > 0
          ? [
              t('commands.add.messages.declarations'),
              ...declarations.flatMap((text) => text.split('\n')).map((line) => `    ${line}`),
            ]
          : [t('commands.add.messages.fullApi', { command })]),
      ]
    : [
        core
          ? t('commands.add.messages.useCore', { core, command })
          : t('commands.add.messages.readDocs', { command }),
      ]
  const providers = Object.entries(registry.packages).filter(
    ([, other]) => other.implements === name && isOfferedPackage(other),
  )
  if (providers.length > 0 && !providers.some(([provider]) => installed.includes(provider)))
    lines.push(
      t('commands.add.messages.needsProvider', {
        command: chalk.cyan(`${CLI_COMMAND} add <provider> --inject`),
        providers: providers.map(([provider, other]) => `${provider} (${other.label})`).join(', '),
      }),
    )
  const secrets = entry?.secrets ?? []
  if (secrets.length > 0) {
    const names = secrets.map((secret) =>
      secret.required === false
        ? t('commands.add.messages.envVarOptional', { name: secret.name })
        : secret.name,
    )
    lines.push(t('commands.add.messages.envVars', { names: names.join(', ') }))
  }
  return lines
}
