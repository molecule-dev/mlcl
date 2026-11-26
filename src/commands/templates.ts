import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { Args, Command, Flags } from '@oclif/core'
import { CLI_COMMAND } from '#cli-command'

import { STARTING_POINT_LEAD, startingPointRules } from '../lib/starting-point.js'
import { ui } from '../lib/ui.js'

interface TemplateEntry {
  label?: string
  description?: string
  type?: string
  packages?: string[]
}

/**
 * List the flagship templates available to `mlcl create --template <slug>`, or show one
 * template's catalog (its data model, API handlers, screens and integrations) so an agent can
 * judge whether it fits before scaffolding it. Reads the same registry the create command resolves
 * templates from, so the list can never drift from what actually scaffolds.
 */
export default class Templates extends Command {
  static override description = `List flagship app templates for ${CLI_COMMAND} create --template <slug> (blog, crm, team-chat, …), or show one template's catalog`

  static override examples = [
    '<%= config.bin %> templates',
    '<%= config.bin %> templates online-store',
    '<%= config.bin %> templates --json',
  ]

  static override args = {
    slug: Args.string({
      description: "A template's slug: show its catalog (data model, API handlers, screens)",
      required: false,
    }),
  }

  static override flags = {
    json: Flags.boolean({
      description: 'Output machine-readable JSON',
      default: false,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Templates)
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

    if (args.slug !== undefined) {
      this.showCatalog(args.slug, templates, flags.json)
      return
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
            create: `${CLI_COMMAND} create my-app --template ${slug} --no-interactive`,
          })),
          null,
          2,
        ),
      )
      return
    }

    // The rules for choosing sit in the header because an agent often reads only the top of this
    // list (`| head -40`), and this list is where it decides: a template only when one covers the
    // core of the request, otherwise a custom stack, never a hand-built project.
    this.log(
      `\n${ui.heading(`${entries.length} templates`)} ${ui.dim('— scaffold one with:')} ${ui.cmd(`${CLI_COMMAND} create <name> --template <slug>`)}\n` +
        `${STARTING_POINT_LEAD}\n` +
        startingPointRules()
          .map((rule) => `  • ${rule}`)
          .join('\n') +
        '\n',
    )
    // One line per template: its slug, then its description. The label repeats the slug in
    // words, so it is left out; so is the type of the full-stack majority.
    for (const [slug, t] of entries) {
      const type = t.type && t.type !== 'full-stack' ? ui.dim(` (${t.type})`) : ''
      this.log(`  ${ui.id(slug.padEnd(28))} ${t.description ?? t.label ?? ''}${type}`)
    }
    this.log('')
  }

  /**
   * Print one template's catalog, the document a harness judges fit on.
   *
   * @param slug - The template asked for.
   * @param templates - The template registry.
   * @param json - Whether to print JSON.
   */
  private showCatalog(slug: string, templates: Record<string, TemplateEntry>, json: boolean): void {
    // Own keys only: a slug is looked up in a parsed object, where `constructor` is inherited.
    const entry = Object.hasOwn(templates, slug) ? templates[slug] : undefined
    if (!entry) {
      this.error(`No template "${slug}". Run \`${CLI_COMMAND} templates\` for the list.`, {
        exit: 2,
      })
    }
    const catalogPath = join(this.config.root, 'templates', 'apps', slug, 'CATALOG.md')
    const catalog = existsSync(catalogPath)
      ? readFileSync(catalogPath, 'utf8').trimEnd()
      : undefined
    const create = `${CLI_COMMAND} create <name> --template ${slug} --no-interactive`
    if (json) {
      this.log(
        JSON.stringify(
          {
            slug,
            label: entry.label ?? slug,
            description: entry.description ?? '',
            type: entry.type ?? 'full-stack',
            packages: entry.packages ?? [],
            create,
            catalog: catalog ?? null,
          },
          null,
          2,
        ),
      )
      return
    }
    if (catalog) this.log(catalog)
    else {
      this.log(`# ${entry.label ?? slug}\n\n${entry.description ?? ''}\n`)
      this.log(`Packages: ${(entry.packages ?? []).join(', ')}`)
    }
    this.log(`\n${ui.dim('Scaffold it:')} ${ui.cmd(create)}`)
  }
}
