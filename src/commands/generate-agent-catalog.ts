import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import { Command, Flags } from '@oclif/core'

import {
  buildCatalog,
  type BuildCatalogOptions,
  type CatalogStack,
  inferFrameworkFromName,
} from '../lib/catalog-generator.js'
import { getRawRegistry, loadAppFrameworks } from '../lib/registry.js'

const STACKS: readonly CatalogStack[] = ['api', 'app', 'full-stack']

export default class GenerateAgentCatalog extends Command {
  // Internal maintenance command — hidden from the public CLI surface (still
  // callable by name for CI and workspace scripts).
  static override hidden = true

  static override description =
    'Generate an intent-grouped, framework-scoped @molecule/* catalog for .agents/skills/molecule-packages/SKILL.md'

  static override examples = [
    '<%= config.bin %> <%= command.id %> --framework react --stack full-stack',
    '<%= config.bin %> <%= command.id %> --framework react --stack app --out /path/SKILL.md',
    '<%= config.bin %> <%= command.id %> --framework vue --stack full-stack --format json',
  ]

  static override flags = {
    framework: Flags.string({
      description: 'App framework to scope the catalog to (e.g. react, vue, svelte)',
      required: true,
    }),
    stack: Flags.string({
      description: 'Project stack: api, app, or full-stack',
      default: 'full-stack',
      options: [...STACKS],
    }),
    out: Flags.string({
      description: 'Output file path (defaults to stdout)',
    }),
    format: Flags.string({
      description: 'Output format',
      default: 'markdown',
      options: ['markdown', 'json'],
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(GenerateAgentCatalog)

    const registry = getRawRegistry()
    const frameworks = loadAppFrameworks()

    if (flags.stack !== 'api' && !frameworks[flags.framework]) {
      const known = Object.keys(frameworks).join(', ') || '(none)'
      this.error(`Unknown framework "${flags.framework}". Known app frameworks: ${known}`, {
        exit: 1,
      })
    }

    const opts: BuildCatalogOptions = {
      registry,
      framework: flags.framework,
      stack: flags.stack as CatalogStack,
    }

    const output =
      flags.format === 'json'
        ? JSON.stringify(this.buildJson(opts), null, 2) + '\n'
        : buildCatalog(opts) + '\n'

    if (flags.out) {
      mkdirSync(dirname(flags.out), { recursive: true })
      writeFileSync(flags.out, output, 'utf-8')
      this.log(`Wrote ${output.length} bytes to ${flags.out}`)
    } else {
      process.stdout.write(output)
    }
  }

  /**
   * JSON form for programmatic consumers (e.g. tests, molecule-dev scaffold).
   * The markdown form stays canonical for the SKILL.md use case.
   */
  private buildJson(opts: BuildCatalogOptions): unknown {
    const { registry, framework, stack } = opts
    const intents: Record<string, string[]> = {}
    const unhinted: string[] = []
    for (const [name, entry] of Object.entries(registry.packages)) {
      if (stack !== 'full-stack' && entry.stack !== stack) continue
      if (entry.framework) {
        if (entry.framework !== framework) continue
      } else {
        const inferred = inferFrameworkFromName(name)
        if (inferred && inferred !== framework) continue
      }
      if (entry.ui?.hidden) continue
      const hints = entry.intentHints ?? []
      if (hints.length === 0) {
        if (entry.type === 'feature' || entry.type === 'resource' || entry.type === 'framework') {
          unhinted.push(name)
        }
        continue
      }
      for (const hint of hints) {
        ;(intents[hint] ??= []).push(name)
      }
    }
    for (const list of Object.values(intents)) list.sort()
    unhinted.sort()
    return { framework, stack, intents, unhinted }
  }
}
