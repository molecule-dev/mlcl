/**
 * Decision-time capability guidance derived from the registry and a project's
 * own package manifests. Packages opt in with `decisionGuide` metadata; this
 * module contains no package-specific list or configuration.
 *
 * @module
 */

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { getRawRegistry } from './registry.js'
import type { Registry, RegistryEntry } from './schema.js'

/** One package declaration and its workspace relative to the project root. */
export interface DeclaredPackage {
  name: string
  /** Empty for the root package; otherwise a path such as `app` or `api`. */
  workspace: string
}

/** The reusable guidance one declared package contributes to the map. */
export interface CapabilityMapEntry {
  name: string
  label: string
  description: string
  capabilities: string[]
  configuration: string[]
  guidance: string[]
  workspaces: string[]
  defaultBond?: string
  configNames: string[]
  documentation: string
}

const DEPENDENCY_SECTIONS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const

function workspaceOf(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '')
}

/**
 * Build one entry directly from registry metadata.
 *
 * `decisionGuide` is the opt-in: packages without it still appear in the normal
 * catalog and search, but do not create a noisy decision-time entry.
 */
export function capabilityEntryFromRegistry(
  name: string,
  entry: RegistryEntry | undefined,
  workspaces: readonly string[] = [''],
): CapabilityMapEntry | null {
  const configuration = entry?.decisionGuide?.configuration
  if (!entry || !configuration?.length) return null
  const setup = entry.defaultBondSetup
  const configNames = [
    ...new Set([
      ...(setup?.configImport ? [setup.configImport] : []),
      ...(setup?.configImports ?? []),
      ...(setup?.authBridge?.schemeConfig ? [setup.authBridge.schemeConfig] : []),
    ]),
  ]
  return {
    name,
    label: entry.label,
    description: entry.description,
    capabilities:
      entry.intentHints && entry.intentHints.length > 0
        ? [...entry.intentHints]
        : [entry.description],
    configuration: [...configuration],
    guidance: [...(setup?.header ?? [])],
    workspaces: [...new Set(workspaces.map(workspaceOf))].sort(),
    defaultBond: entry.defaultBond,
    configNames,
    documentation: `https://www.molecule.dev/packages/${name.replace('@molecule/', '')}`,
  }
}

/**
 * Compose the map from declared packages, never from a hardcoded project or
 * package list. Repeated declarations in root/workspace manifests are folded
 * into one entry carrying every declaring workspace.
 */
export function buildCapabilityMap(
  registry: Registry,
  declared: Iterable<DeclaredPackage | string>,
): CapabilityMapEntry[] {
  const workspacesByPackage = new Map<string, Set<string>>()
  for (const declaration of declared) {
    const name = typeof declaration === 'string' ? declaration : declaration.name
    const workspace = typeof declaration === 'string' ? '' : declaration.workspace
    if (!name.startsWith('@molecule/')) continue
    const workspaces = workspacesByPackage.get(name) ?? new Set<string>()
    workspaces.add(workspaceOf(workspace))
    workspacesByPackage.set(name, workspaces)
  }
  return [...workspacesByPackage]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, workspaces]) =>
      capabilityEntryFromRegistry(name, registry.packages[name], [...workspaces]),
    )
    .filter((entry): entry is CapabilityMapEntry => entry !== null)
}

/** Read the root, `api`, and `app` manifests written by mlcl scaffolds. */
async function readDeclaredPackages(projectRoot: string): Promise<DeclaredPackage[]> {
  const declarations = new Map<string, DeclaredPackage>()
  for (const workspace of ['', 'api', 'app']) {
    let manifest: Record<string, unknown>
    try {
      manifest = JSON.parse(
        await readFile(join(projectRoot, workspace, 'package.json'), 'utf8'),
      ) as Record<string, unknown>
    } catch (_error) {
      // A non-Node directory, an absent workspace, or an invalid manifest does
      // not make the generic agent-init guidance unusable.
      continue
    }
    for (const section of DEPENDENCY_SECTIONS) {
      const dependencies = manifest[section]
      if (!dependencies || typeof dependencies !== 'object' || Array.isArray(dependencies)) {
        continue
      }
      for (const name of Object.keys(dependencies)) {
        if (!name.startsWith('@molecule/')) continue
        const key = `${workspace}\0${name}`
        declarations.set(key, { name, workspace })
      }
    }
  }
  return [...declarations.values()]
}

/** Compose a project's map from its manifests and the current registry. */
export async function readProjectCapabilityMap(
  projectRoot: string,
  registry: Registry = getRawRegistry(),
): Promise<CapabilityMapEntry[]> {
  return buildCapabilityMap(registry, await readDeclaredPackages(projectRoot))
}

function prefixed(workspace: string, path: string): string {
  return workspace ? `${workspace}/${path}` : path
}

/** Render the Markdown section delivered in AGENTS.md and MCP tool results. */
export function renderCapabilityMap(entries: readonly CapabilityMapEntry[]): string {
  if (entries.length === 0) return ''
  const lines = [
    '## Declared capability map',
    '',
    "Generated from this project's package manifests and `mlcl/registry.json`. Map every feature in the plan to a declared package and its configuration. Read that package's doc before deciding; write `use @molecule/<name> with <configuration>` or `not using @molecule/<name> because <reason>` after the doc read. An API-shape difference is configuration to look up, not a reason to write a parallel implementation.",
    '',
  ]
  for (const entry of entries) {
    lines.push(`### ${entry.label} — \`${entry.name}\``)
    lines.push(`- Covers: ${entry.capabilities.join('; ')}.`)
    for (const workspace of entry.workspaces) {
      if (entry.defaultBond) {
        lines.push(`- Wired bond: \`${prefixed(workspace, `src/bonds/${entry.defaultBond}.ts`)}\`.`)
      }
      if (entry.configNames.length > 0) {
        lines.push(
          `- Configure in \`${prefixed(workspace, 'src/config.ts')}\`: ${entry.configNames
            .map((name) => `\`${name}\``)
            .join(', ')}.`,
        )
      }
    }
    for (const guidance of entry.guidance) lines.push(`- ${guidance}`)
    lines.push('- Configuration by API shape:')
    for (const configuration of entry.configuration) lines.push(`  - ${configuration}`)
    lines.push(`- Doc: \`read_package_doc\` for \`${entry.name}\` (${entry.documentation}).`)
    lines.push('')
  }
  return lines.join('\n').trimEnd()
}

/** Render the in-file header shared by injected and copied bond files. */
export function renderCapabilityBondHeader(entry: CapabilityMapEntry, title?: string): string {
  const lines = [
    `Declared capability: ${entry.name} — ${entry.label}.`,
    ...entry.guidance,
    'Configuration by API shape:',
    ...entry.configuration,
    `Read the package documentation before replacing this client; if you choose not to use ${entry.name}, record the reason after that read.`,
  ]
  return `/**\n${title ? ` * ${title}\n *\n` : ''}${lines
    .map((line) => ` * ${line}`)
    .join('\n')}\n */\n\n`
}

/**
 * Add decision headers to bond files copied from a flagship template. Injected
 * bonds render the same header directly. Missing files are normal: a template
 * may wire a default client through a composed provider instead.
 *
 * @returns Project-relative bond paths changed by this call.
 */
export async function stampCapabilityBondHeaders(
  projectRoot: string,
  registry: Registry = getRawRegistry(),
): Promise<string[]> {
  const changed: string[] = []
  for (const entry of await readProjectCapabilityMap(projectRoot, registry)) {
    if (!entry.defaultBond || !/^[a-z0-9-]+$/.test(entry.defaultBond)) continue
    for (const workspace of entry.workspaces) {
      const relative = prefixed(workspace, `src/bonds/${entry.defaultBond}.ts`)
      const path = join(projectRoot, relative)
      let source: string
      try {
        source = await readFile(path, 'utf8')
      } catch (_error) {
        // This workspace wires the capability through a composed provider.
        continue
      }
      if (source.includes(`Declared capability: ${entry.name}`)) continue
      await writeFile(path, renderCapabilityBondHeader(entry) + source, 'utf8')
      changed.push(relative)
    }
  }
  return changed
}
