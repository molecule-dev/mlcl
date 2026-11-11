/**
 * Decision-time capability guidance derived from the registry and a project's
 * own package manifests. Packages opt in with `decisionGuide` metadata; this
 * module contains no package-specific list or configuration.
 *
 * @module
 */

import { readdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { isAbsolute, join, posix, relative as relativePath, sep } from 'node:path'

import { ts } from 'ts-morph'

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
  /** Existing bond files with imported, called capability factories or setters. */
  wiredBonds?: string[]
  /** Existing configuration files beside the declaring workspace's bonds. */
  configFiles?: Array<{ path: string; names: string[] }>
  configNames: string[]
  documentation: string
  /** Existing workspace-relative JS/TS files that carry this package's recipes. */
  sourceFiles?: string[]
  /** Existing project-relative resource modules built on this package's factory. */
  resourceModules?: string[]
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
  bindings: readonly string[] = [],
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
    guidance: [
      ...(setup?.header ?? []),
      ...bindings.flatMap((binding) => entry.decisionGuide?.bindingGuidance?.[binding] ?? []),
    ],
    workspaces: [...new Set(workspaces.map(workspaceOf))].sort(),
    defaultBond: entry.defaultBond,
    configNames,
    documentation: `https://www.molecule.dev/packages/${name.replace('@molecule/', '')}`,
    ...(entry.decisionGuide?.sourceFiles ? { sourceFiles: entry.decisionGuide.sourceFiles } : {}),
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
    .map(([name, workspaces]) => {
      const entry = capabilityEntryFromRegistry(name, registry.packages[name], [...workspaces])
      if (!entry) return null
      for (const workspace of entry.workspaces) {
        for (const [binding, bindingWorkspaces] of workspacesByPackage) {
          if (!bindingWorkspaces.has(workspace)) continue
          const guidance = registry.packages[name]?.decisionGuide?.bindingGuidance?.[binding] ?? []
          entry.guidance.push(
            ...guidance.map((line) =>
              entry.workspaces.length > 1 ? `In \`${workspace || '.'}\`: ${line}` : line,
            ),
          )
        }
      }
      return entry
    })
    .filter((entry): entry is CapabilityMapEntry => entry !== null)
}

/** Read the root, `api`, and `app` manifests written by mlcl scaffolds. */
export async function readDeclaredPackages(projectRoot: string): Promise<DeclaredPackage[]> {
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
  declarations?: Iterable<DeclaredPackage | string>,
): Promise<CapabilityMapEntry[]> {
  const declared = declarations
    ? [...declarations].map((item) =>
        typeof item === 'string' ? { name: item, workspace: '' } : item,
      )
    : await readDeclaredPackages(projectRoot)
  const entries = buildCapabilityMap(registry, declared)
  const wiring = new Map<string, Map<string, string[]>>()
  const configFiles = new Map<string, Array<{ path: string; names: string[] }>>()
  for (const workspace of new Set(declared.map((item) => item.workspace))) {
    const sourceDirs = new Set(['src'])
    for (const declaration of declared.filter((item) => item.workspace === workspace)) {
      const framework = registry.packages[declaration.name]?.framework
      const sharedCodeDir = framework && registry.appFrameworks?.[framework]?.sharedCodeDir
      if (sharedCodeDir) sourceDirs.add(`src/${sharedCodeDir}`)
    }
    const sources = new Map<string, string>()
    const configs: Array<{ path: string; names: string[] }> = []
    for (const sourceDir of sourceDirs) {
      const config = prefixed(workspace, `${sourceDir}/config.ts`)
      try {
        configs.push({
          path: config,
          names: exportedConfiguration(await readFile(join(projectRoot, config), 'utf8')),
        })
      } catch (_error) {
        // No configuration file is supplied by this source layout.
      }
      const bonds = prefixed(workspace, `${sourceDir}/bonds`)
      let names: string[]
      try {
        names = (await readdir(join(projectRoot, bonds)))
          .filter((name) => /\.tsx?$/.test(name))
          .sort()
      } catch (_error) {
        continue
      }
      for (const name of names) {
        const relative = `${bonds}/${name}`
        const source = await readFile(join(projectRoot, relative), 'utf8')
        sources.set(relative, source)
      }
    }
    wiring.set(workspace, resolveBondWiring(sources, registry))
    configFiles.set(workspace, configs)
  }
  // The resource modules already in the project, for the package whose factory they call.
  const resourceModules = new Map<string, string[]>()
  for (const entry of entries) {
    const factory = registry.packages[entry.name]?.decisionGuide?.resourceModules
    if (!factory) continue
    const found: string[] = []
    for (const workspace of entry.workspaces) {
      const directory = prefixed(workspace, factory.directory)
      let names: string[]
      try {
        names = await readdir(join(projectRoot, directory))
      } catch (_error) {
        // The project has no resource modules in this workspace.
        continue
      }
      for (const name of names.filter((file) => /\.[cm]?tsx?$/.test(file)).sort()) {
        const source = await readFile(join(projectRoot, directory, name), 'utf8')
        if (source.includes(factory.factory)) found.push(`${directory}/${name}`)
      }
    }
    if (found.length > 0) resourceModules.set(entry.name, found)
  }
  return entries.map((entry) => ({
    ...entry,
    ...(resourceModules.has(entry.name)
      ? { resourceModules: resourceModules.get(entry.name) }
      : {}),
    wiredBonds: [
      ...new Set(
        entry.workspaces.flatMap((workspace) => wiring.get(workspace)?.get(entry.name) ?? []),
      ),
    ],
    configFiles: entry.workspaces
      .flatMap((workspace) => configFiles.get(workspace) ?? [])
      .map((file) => ({
        path: file.path,
        names: entry.configNames.filter((name) => file.names.includes(name)),
      }))
      .filter((file) => file.names.length > 0),
    configNames: entry.configNames.filter((name) =>
      entry.workspaces.some((workspace) =>
        configFiles.get(workspace)?.some((file) => file.names.includes(name)),
      ),
    ),
  }))
}

/** Read actual exports before directing a project to edit a configuration variable. */
function exportedConfiguration(source: string): string[] {
  const file = ts.createSourceFile('config.ts', source, ts.ScriptTarget.Latest, true)
  const names = new Set<string>()
  function binding(name: ts.BindingName): void {
    if (ts.isIdentifier(name)) names.add(name.text)
    else
      for (const element of name.elements) if (ts.isBindingElement(element)) binding(element.name)
  }
  for (const statement of file.statements) {
    if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const name of statement.exportClause.elements) names.add(name.name.text)
    }
    if (
      !ts.canHaveModifiers(statement) ||
      !ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    )
      continue
    if (ts.isVariableStatement(statement))
      for (const declaration of statement.declarationList.declarations) binding(declaration.name)
    if (ts.isFunctionDeclaration(statement) && statement.name) names.add(statement.name.text)
  }
  return [...names]
}

type CallToken = object
interface BondContext {
  capabilities: Set<string>
  calls: Set<CallToken>
}
interface BondSyntax {
  root: CallToken
  contexts: Map<CallToken, BondContext>
  exports: Map<string, CallToken>
  imports: Map<CallToken, { path: string; name: string }>
}

/** Resolve import bindings, including shadows, instead of matching source text. */
function readBondSyntax(path: string, source: string, registry: Registry): BondSyntax {
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.Latest,
    noResolve: true,
    noLib: true,
  }
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
  const host = ts.createCompilerHost(options)
  host.getSourceFile = (name) => (name === path ? file : undefined)
  const checker = ts.createProgram([path], options, host).getTypeChecker()
  const root = {}
  const model: BondSyntax = { root, contexts: new Map(), exports: new Map(), imports: new Map() }
  const namedFactories = new Map<CallToken, { capabilities: string[]; setup: string }>()
  const namespaceFactories = new Map<
    CallToken,
    Map<string, { capabilities: string[]; setup: string }>
  >()
  const setters = new Map<CallToken, string[]>()
  const namespaceSetters = new Map<CallToken, Map<string, string[]>>()
  const namespaceImports = new Map<CallToken, string>()
  const properties = new Map<CallToken, Map<string, CallToken>>()
  const symbol = (node: ts.Node): CallToken | undefined => checker.getSymbolAtLocation(node)
  function property(object: CallToken, name: string): CallToken {
    const values = properties.get(object) ?? new Map<string, CallToken>()
    const token = values.get(name) ?? {}
    values.set(name, token)
    properties.set(object, values)
    return token
  }
  function context(token: CallToken): BondContext {
    const value = model.contexts.get(token) ?? {
      capabilities: new Set<string>(),
      calls: new Set<CallToken>(),
    }
    model.contexts.set(token, value)
    return value
  }
  function token(expression: ts.Expression): CallToken | undefined {
    if (ts.isIdentifier(expression)) return symbol(expression)
    if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression)) {
      const object = symbol(expression.expression)
      if (!object) return undefined
      const result = property(object, expression.name.text)
      const imported = namespaceImports.get(object)
      if (imported) model.imports.set(result, { path: imported, name: expression.name.text })
      return result
    }
    return undefined
  }
  function factory(
    expression: ts.Expression,
  ): { capabilities: string[]; setup: string } | undefined {
    const direct = token(expression)
    if (direct && namedFactories.has(direct)) return namedFactories.get(direct)
    if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression)) {
      const object = symbol(expression.expression)
      if (object) return namespaceFactories.get(object)?.get(expression.name.text)
    }
    return undefined
  }
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      continue
    const clause = statement.importClause
    if (!clause || clause.isTypeOnly) continue
    const packageName = statement.moduleSpecifier.text
    const metadata = registry.packages[packageName]
    const factories = new Map(Object.entries(metadata?.capabilityFactories ?? {}))
    const set = new Map<string, string[]>()
    if (metadata?.defaultBondSetup) set.set(metadata.defaultBondSetup.setter, [packageName])
    const bindings = clause.namedBindings
    if (bindings && ts.isNamedImports(bindings)) {
      for (const binding of bindings.elements) {
        if (binding.isTypeOnly) continue
        const key = symbol(binding.name)
        if (!key) continue
        const name = (binding.propertyName ?? binding.name).text
        const composition = factories.get(name)
        if (composition) namedFactories.set(key, composition)
        const capabilities = set.get(name)
        if (capabilities) setters.set(key, capabilities)
        if (packageName.startsWith('.')) model.imports.set(key, { path: packageName, name })
      }
    } else if (bindings && ts.isNamespaceImport(bindings)) {
      const key = symbol(bindings.name)
      if (!key) continue
      namespaceFactories.set(key, factories)
      namespaceSetters.set(key, set)
      if (packageName.startsWith('.')) namespaceImports.set(key, packageName)
    }
  }
  function expose(name: ts.BindingName): void {
    if (ts.isIdentifier(name)) {
      const key = symbol(name)
      if (key) model.exports.set(name.text, key)
    } else {
      for (const element of name.elements) if (ts.isBindingElement(element)) expose(element.name)
    }
  }
  for (const statement of file.statements) {
    if (
      !ts.canHaveModifiers(statement) ||
      !ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    )
      continue
    if (ts.isFunctionDeclaration(statement) && statement.name) expose(statement.name)
    if (ts.isVariableStatement(statement))
      for (const declaration of statement.declarationList.declarations) expose(declaration.name)
  }
  function visit(node: ts.Node, owner: CallToken): void {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node)
    ) {
      const name =
        node.name ??
        (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)
          ? node.parent.name
          : undefined)
      owner = name ? (symbol(name) ?? {}) : {}
    }
    if (ts.isCallExpression(node)) {
      const key = token(node.expression)
      let provided = key && setters.get(key)
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression)
      ) {
        const object = symbol(node.expression.expression)
        provided ??= object
          ? namespaceSetters.get(object)?.get(node.expression.name.text)
          : undefined
      }
      for (const capability of provided ?? []) context(owner).capabilities.add(capability)
      if (key) context(owner).calls.add(key)
      const composition = factory(node.expression)
      if (composition && ts.isVariableDeclaration(node.parent)) {
        const binding = node.parent.name
        if (ts.isObjectBindingPattern(binding)) {
          for (const element of binding.elements) {
            const name = element.propertyName ?? element.name
            if (
              !ts.isIdentifier(name) ||
              name.text !== composition.setup ||
              !ts.isIdentifier(element.name)
            )
              continue
            const setup = symbol(element.name)
            if (setup)
              for (const capability of composition.capabilities)
                context(setup).capabilities.add(capability)
          }
        } else if (ts.isIdentifier(binding)) {
          const object = symbol(binding)
          if (object)
            for (const capability of composition.capabilities)
              context(property(object, composition.setup)).capabilities.add(capability)
        }
      }
    }
    ts.forEachChild(node, (child) => visit(child, owner))
  }
  visit(file, root)
  return model
}

/** Follow module calls and the generated bond entry point's setup calls. */
function resolveBondWiring(
  sources: Map<string, string>,
  registry: Registry,
): Map<string, string[]> {
  const models = new Map(
    [...sources].map(([path, source]) => [path, readBondSyntax(path, source, registry)]),
  )
  const byPackage = new Map<string, Set<string>>()
  const seen = new Map<string, Set<CallToken>>()
  function visit(path: string, key: CallToken): void {
    const model = models.get(path)
    if (!model) return
    const visited = seen.get(path) ?? new Set<CallToken>()
    if (visited.has(key)) return
    visited.add(key)
    seen.set(path, visited)
    const imported = model.imports.get(key)
    if (imported) {
      const target = posix
        .normalize(posix.join(posix.dirname(path), imported.path))
        .replace(/\.js$/, '.ts')
      const exported = models.get(target)?.exports.get(imported.name)
      if (exported) visit(target, exported)
    }
    const active = model.contexts.get(key)
    if (!active) return
    for (const capability of active.capabilities) {
      const files = byPackage.get(capability) ?? new Set<string>()
      files.add(path)
      byPackage.set(capability, files)
    }
    for (const called of active.calls) visit(path, called)
  }
  for (const [path, model] of models) {
    visit(path, model.root)
    if (posix.basename(path) === 'index.ts')
      for (const key of model.exports.values()) visit(path, key)
  }
  return new Map([...byPackage].map(([name, paths]) => [name, [...paths].sort()]))
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
    for (const path of entry.wiredBonds ?? []) lines.push(`- Wired bond: \`${path}\`.`)
    if (entry.configNames.length > 0) {
      const exports = (names: string[]): string => names.map((name) => `\`${name}\``).join(', ')
      for (const file of entry.configFiles ?? [])
        lines.push(`- Configure in \`${file.path}\`: ${exports(file.names)}.`)
      if (!entry.configFiles?.length)
        lines.push(`- Configuration exports: ${exports(entry.configNames)}.`)
    }
    for (const path of entry.resourceModules ?? [])
      lines.push(`- Resource module, already written — build pages on it: \`${path}\`.`)
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

const SOURCE_HEADER_START = '/* @molecule/capability-recipes:start\n'
const SOURCE_HEADER_END = ' * @molecule/capability-recipes:end */\n\n'

/**
 * Put the declared recipes beside the code an app author edits. This uses the
 * existing registry guide, rather than a second package list or prompt rule.
 * Only an exact generated prefix is replaced; the rest of the module is unchanged.
 * Missing sources are normal (another framework or a static app).
 *
 * @param projectRoot - The scaffold's root or app workspace.
 * @param registry - Registry generation whose metadata selects the source files.
 * @param declared - Optional declarations already resolved by the caller.
 * @returns Project-relative source paths changed by this call.
 * @throws When a selected source resolves outside the project.
 */
export async function stampCapabilitySourceHeaders(
  projectRoot: string,
  registry: Registry = getRawRegistry(),
  declared?: Iterable<DeclaredPackage | string>,
): Promise<string[]> {
  const entries = await readProjectCapabilityMap(projectRoot, registry, declared)
  const byPath = new Map<string, CapabilityMapEntry[]>()
  for (const entry of entries)
    for (const workspace of entry.workspaces)
      for (const file of entry.sourceFiles ?? []) {
        const path = prefixed(workspace, file)
        byPath.set(path, [...(byPath.get(path) ?? []), entry])
      }

  // Include inactive declarations' targets to remove our own stale header when
  // a package is removed. These are the same three manifests the map reads.
  const candidates = new Set(byPath.keys())
  for (const entry of Object.values(registry.packages))
    for (const file of entry.decisionGuide?.sourceFiles ?? [])
      for (const workspace of ['', 'api', 'app']) candidates.add(prefixed(workspace, file))

  const changed: string[] = []
  const ownedRoot = await realpath(projectRoot)
  for (const relative of candidates) {
    const path = join(projectRoot, relative)
    let source: string
    try {
      source = await readFile(path, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue
      throw error
    }
    const shebang = /^#![^\n]*(?:\n|$)/.exec(source)?.[0] ?? ''
    let body = source.slice(shebang.length)
    if (body.startsWith(SOURCE_HEADER_START)) {
      const end = body.indexOf(SOURCE_HEADER_END, SOURCE_HEADER_START.length)
      if (end !== -1) body = body.slice(end + SOURCE_HEADER_END.length)
    }
    const recipes = byPath.get(relative) ?? []
    const lines = recipes.flatMap((entry) => [
      `Installed: ${entry.name}`,
      ...(entry.resourceModules ?? []).map(
        (module) =>
          `Resource module, already written — build pages on it instead of fetching in an effect: ${module}`,
      ),
      ...entry.guidance,
      ...entry.configuration,
    ])
    const header = lines.length
      ? SOURCE_HEADER_START +
        lines.map((line) => ` * ${line.replace(/\*\//g, '* /')}`).join('\n') +
        '\n' +
        SOURCE_HEADER_END
      : ''
    const next = shebang + header + body
    if (next === source) continue
    const ownedPath = relativePath(ownedRoot, await realpath(path))
    if (ownedPath === '..' || ownedPath.startsWith(`..${sep}`) || isAbsolute(ownedPath))
      throw new Error(`Refusing a capability header outside the project: ${relative}`)
    await writeFile(path, next, 'utf8')
    changed.push(relative)
  }
  return changed
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
    for (const relative of entry.wiredBonds ?? []) {
      const path = join(projectRoot, relative)
      let source: string
      try {
        source = await readFile(path, 'utf8')
      } catch (_error) {
        // A caller may remove a bond between map creation and stamping.
        continue
      }
      if (source.includes(`Declared capability: ${entry.name}`)) continue
      await writeFile(path, renderCapabilityBondHeader(entry) + source, 'utf8')
      changed.push(relative)
    }
  }
  return changed
}
