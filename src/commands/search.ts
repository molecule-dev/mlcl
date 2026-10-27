import { Args, Command, Flags } from '@oclif/core'

import { scoreSearchEntry, searchPackages, type SearchSourceEntry } from '../lib/package-search.js'
import { loadRegistry } from '../lib/registry.js'
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
function toSearchEntry(pkg: RegistryPackage): SearchSourceEntry {
  return {
    name: pkg.name,
    stack: pkg.molecule?.stack,
    category: pkg.molecule?.category,
    label: pkg.molecule?.label,
    description: pkg.description,
    exports: pkg.exports,
    intentHints: pkg.molecule?.intentHints,
  }
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
    const hits = searchPackages(loadRegistry().map(toSearchEntry), q, {
      stack: flags.stack as 'api' | 'app' | undefined,
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
