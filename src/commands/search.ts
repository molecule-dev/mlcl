import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { Args, Command, Flags } from '@oclif/core'

import {
  declaredFramework,
  installCommand,
  scoreSearchEntry,
  searchPackages,
  searchResultsJson,
  type SearchSourceEntry,
  unknownFrameworkMessage,
} from '../lib/package-search.js'
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
    // Without it search offered a renamed package (app-i18n-default-react) that the hosted
    // server, which passes the raw entry, leaves out.
    replacedBy: pkg.molecule?.replacedBy,
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
  return declaredFramework((manifest) => {
    const file = join(dir, manifest)
    return existsSync(file) ? readFileSync(file, 'utf8') : undefined
  })
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
    query: Args.string({
      description: 'Search query; several words need no quotes (mlcl search send emails)',
      required: true,
    }),
  }

  // A query is natural language, and an agent writes `mlcl search tool lending` as often as
  // `mlcl search "tool lending"`: every word after the first is part of the query, not an error.
  static override strict = false

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
    const { argv, flags } = await this.parse(Search)
    const q = (argv as string[]).join(' ').trim()
    setTelemetryContext({ searchQuery: q.slice(0, 100) })
    if (!q) this.error('Provide a search query, e.g. mlcl search payments')

    // The shared owner applies the stack filter BEFORE ranking/truncation and
    // emits the DTO both transports expose (the hosted MCP imports the same
    // logic as generated standalone code — see lib/package-search.ts).
    const appFrameworks = loadAppFrameworks()
    const unknown = flags.framework && unknownFrameworkMessage(flags.framework, appFrameworks)
    if (unknown) this.error(unknown)
    // The registry's appFrameworks say which package frameworks the project can
    // import: a react-native-web project keeps React and react-native packages.
    const hits = searchPackages(loadRegistry().map(toSearchEntry), q, {
      stack: flags.stack as 'api' | 'app' | undefined,
      framework: flags.framework ?? projectFramework(process.cwd()),
      appFrameworks,
      limit: flags.limit,
    })

    if (flags.json) {
      this.log(searchResultsJson(hits))
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
      this.log(`      ${ui.dim('add with:')} ${ui.cmd(installCommand(hit.name))}`)
    }
    this.log(
      `\n${ui.dim("Read a package's API before choosing or using it:")} ${ui.cmd('npx mlcl docs <name>')} ${ui.dim('(--section <name> for one function)')}`,
    )
    this.log('')
  }
}
