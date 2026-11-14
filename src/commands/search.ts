import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { Args, Command, Flags } from '@oclif/core'

import { scoreSearchEntry, searchPackages, type SearchSourceEntry } from '../lib/package-search.js'
import { loadAppFrameworks, loadRegistry } from '../lib/registry.js'
import { setTelemetryContext } from '../lib/telemetry.js'
import { ui } from '../lib/ui.js'

/** A package as loaded by {@link loadRegistry}. */
type RegistryPackage = Awaited<ReturnType<typeof loadRegistry>>[number]

/**
 * Adapt a loaded registry package to the shared search contract's input —
 * `InferredPackage` keeps its molecule metadata under `molecule`, while the
 * hosted MCP reads it straight off the raw registry entry.
 *
 * @param pkg - A package from the canonical registry.
 * @returns The same package in the shared owner's loose entry shape.
 */
export function toSearchEntry(pkg: RegistryPackage): SearchSourceEntry {
  return {
    name: pkg.name,
    stack: pkg.molecule?.stack,
    category: pkg.molecule?.category,
    label: pkg.molecule?.label,
    description: pkg.description,
    exports: pkg.exports,
    framework: pkg.molecule?.framework,
    intentHints: pkg.molecule?.intentHints,
    decisionGuide: pkg.molecule?.decisionGuide,
  }
}

/**
 * The UI framework a project in a directory declares: the `molecule.framework`
 * marker `mlcl create` writes into every app's package.json, read from its app
 * half (`app/package.json`, a full-stack project) or the directory's own
 * package.json. Dependencies are not consulted: a package that merely depends
 * on React (mlcl itself, for its tests) is not a React app.
 *
 * @param dir - The directory `mlcl search` runs in.
 * @returns The declared framework key, or undefined when no project declares one.
 */
export function projectFramework(dir: string): string | undefined {
  for (const manifest of [join(dir, 'app', 'package.json'), join(dir, 'package.json')]) {
    if (!existsSync(manifest)) continue
    let pkg: { molecule?: { framework?: unknown } }
    try {
      pkg = JSON.parse(readFileSync(manifest, 'utf8'))
    } catch (_error) {
      // An unreadable manifest declares nothing; search then ranks every
      // framework's packages, as it does outside a project.
      continue
    }
    const framework = pkg?.molecule?.framework
    if (typeof framework === 'string' && framework) return framework
  }
  return undefined
}

/**
 * Score a package against the query tokens. Higher = more relevant.
 *
 * Delegates to the shared owner (`lib/package-search.ts`) so `mlcl search`, the
 * stdio MCP (which runs this CLI) and the hosted MCP cannot rank differently.
 *
 * @param pkg - A package from the canonical registry.
 * @param q - Package name, exported symbol or natural capability query.
 * @returns Relevance score; zero means no match.
 */
export function scorePackage(pkg: RegistryPackage, q: string): number {
  return scoreSearchEntry(toSearchEntry(pkg), q)
}

export default class Search extends Command {
  static override description =
    'Search @molecule/* packages by name or capability (e.g. "payments", "social login", "file uploads")'

  static override examples = [
    '<%= config.bin %> search payments',
    '<%= config.bin %> search "send emails" --stack api',
    '<%= config.bin %> search database --json',
  ]

  static override args = {
    query: Args.string({ description: 'Search query', required: true }),
  }

  static override flags = {
    stack: Flags.string({
      description: 'Restrict to one stack',
      options: ['api', 'app'],
    }),
    framework: Flags.string({
      description:
        "Only this UI framework's packages plus framework-neutral ones (default: the molecule.framework the current project declares)",
    }),
    limit: Flags.integer({
      description: 'Maximum number of results',
      default: 20,
    }),
    json: Flags.boolean({
      description: 'Output machine-readable JSON (one array of hits)',
      default: false,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Search)
    setTelemetryContext({ searchQuery: (args.query ?? '').slice(0, 100) })
    const q = (args.query ?? '').trim()
    if (!q) this.error('Provide a search query, e.g. mlcl search payments')

    // The shared owner applies the stack filter BEFORE ranking/truncation and
    // emits the DTO both transports expose (the hosted MCP imports the same
    // logic as generated standalone code — see lib/package-search.ts).
    const appFrameworks = loadAppFrameworks()
    if (flags.framework && !appFrameworks[flags.framework])
      this.error(
        `Unknown framework "${flags.framework}". Known: ${Object.keys(appFrameworks).join(', ')}`,
      )
    const projectKey = flags.framework ?? projectFramework(process.cwd())
    // Packages name the UI framework they are written for; react-native-web
    // projects use the react-native UI set (`uiFramework` in the registry).
    const framework = projectKey
      ? (appFrameworks[projectKey]?.uiFramework ?? projectKey)
      : undefined
    const hits = searchPackages(loadRegistry().map(toSearchEntry), q, {
      stack: flags.stack as 'api' | 'app' | undefined,
      framework,
      limit: flags.limit,
    })

    if (flags.json) {
      this.log(
        JSON.stringify(
          hits.map((hit) => ({
            ...hit,
            install: `mlcl add ${hit.name} --inject`,
          })),
          null,
          2,
        ),
      )
      return
    }

    if (hits.length === 0) {
      this.log(ui.warn(`No @molecule/* packages matched "${q}".`))
      this.log(ui.dim('Browse the full catalog: https://www.molecule.dev/packages'))
      return
    }

    this.log(
      `\n${ui.heading(`${hits.length} package${hits.length === 1 ? '' : 's'} matched`)} ${ui.dim(`"${q}"`)}\n`,
    )
    for (const hit of hits) {
      this.log(`  ${ui.id(hit.name)}  ${ui.badge(hit.stack, hit.category)}`)
      if (hit.description) this.log(`      ${ui.dim(hit.description)}`)
      this.log(`      ${ui.dim('add with:')} ${ui.cmd(`mlcl add ${hit.name} --inject`)}`)
    }
    this.log('')
  }
}
