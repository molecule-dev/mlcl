import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { Command, Flags } from '@oclif/core'

import { ui } from '../lib/ui.js'

interface TemplateEntry {
  label?: string
  description?: string
  type?: string
  packages?: string[]
}

/**
 * List the flagship templates available to `mlcl create --template <slug>`.
 * Reads the same registry the create command resolves templates from, so the
 * list can never drift from what actually scaffolds.
 */
export default class Templates extends Command {
  static override description =
    'List flagship app templates for mlcl create --template <slug> (blog, crm, team-chat, …)'

  static override examples = ['<%= config.bin %> templates', '<%= config.bin %> templates --json']

  static override flags = {
    json: Flags.boolean({
      description: 'Output machine-readable JSON',
      default: false,
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Templates)
    const registryPath = join(this.config.root, 'templates', 'apps', 'registry.json')

    let templates: Record<string, TemplateEntry>
    try {
      templates = JSON.parse(readFileSync(registryPath, 'utf8')).templates
    } catch (_error) {
      // The registry ships inside the package — if it cannot be read, every
      // template feature is broken, so stop with an actionable message.
      this.error(
        `Template registry not found at ${registryPath}. If mlcl was installed from npm, this is a packaging bug — please report it: https://github.com/molecule-dev/mlcl/issues`,
      )
    }

    const entries = Object.entries(templates).sort(([a], [b]) => a.localeCompare(b))

    if (flags.json) {
      this.log(
        JSON.stringify(
          entries.map(([slug, t]) => ({
            slug,
            label: t.label ?? slug,
            description: t.description ?? '',
            type: t.type ?? 'full-stack',
            packageCount: t.packages?.length ?? 0,
            create: `mlcl create my-app --template ${slug} --no-interactive`,
          })),
          null,
          2,
        ),
      )
      return
    }

    this.log(
      `\n${ui.heading(`${entries.length} templates`)} ${ui.dim('— scaffold with:')} ${ui.cmd('mlcl create <name> --template <slug>')}\n`,
    )
    for (const [slug, t] of entries) {
      this.log(
        `  ${ui.id(slug.padEnd(28))} ${(t.label ?? slug) + (t.type ? ui.dim(` (${t.type})`) : '')}`,
      )
      if (t.description) this.log(`  ${''.padEnd(28)} ${ui.dim(t.description)}`)
    }
    this.log('')
  }
}
