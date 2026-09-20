import { Args, Command, Flags } from '@oclif/core'

import { loadRegistry } from '../lib/registry.js'
import { setTelemetryContext } from '../lib/telemetry.js'
import { ui } from '../lib/ui.js'

interface SearchHit {
  name: string
  stack: 'api' | 'app'
  category: string
  label: string
  description: string
  score: number
}

/**
 * Score a package against the query tokens. Higher = more relevant.
 * Exact/substring name matches dominate (an agent usually knows roughly what
 * it wants: "database", "payments"); intentHints and the category/description
 * tokens catch capability phrasing ("social login", "send emails").
 */
function scorePackage(pkg: Awaited<ReturnType<typeof loadRegistry>>[number], q: string): number {
  const name = pkg.name.replace('@molecule/', '')
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return 0
  let score = 0
  for (const tok of tokens) {
    if (name === tok) score += 40
    else if (name.includes(tok)) score += 20
    if (pkg.molecule?.category?.includes(tok)) score += 8
    if (pkg.molecule?.intentHints?.some((h) => h.includes(tok) || tok.includes(h))) score += 6
    if (pkg.description?.toLowerCase().includes(tok)) score += 3
    if (pkg.molecule?.label?.toLowerCase().includes(tok)) score += 3
  }
  return score
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

    const pool = loadRegistry(flags.stack as 'api' | 'app' | undefined)

    const hits: SearchHit[] = pool
      .map((pkg) => {
        const name = pkg.name
        const stack = pkg.molecule?.stack ?? (name.includes('/app-') ? 'app' : 'api')
        return {
          name,
          stack,
          category: pkg.molecule?.category ?? '',
          label: pkg.molecule?.label ?? name,
          description: pkg.description ?? '',
          score: scorePackage(pkg, q),
        }
      })
      .filter((h) => h.score > 0)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, flags.limit)

    if (flags.json) {
      this.log(
        JSON.stringify(
          hits.map(({ score: _score, ...hit }) => ({
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
