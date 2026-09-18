import { access } from 'node:fs/promises'
import { join, relative } from 'node:path'

import * as p from '@clack/prompts'
import { Command, Flags } from '@oclif/core'
import chalk from 'chalk'

import { t } from '../lib/i18n.js'
import { inferFromDescription, type InferredMetadata } from '../lib/infer.js'
import { loadRegistry, updateRegistryEntry } from '../lib/registry.js'
import { detectMonorepoRoot, resolvePackageDirectory, scaffoldPackage } from '../lib/scaffold.js'
import type { RegistryEntry } from '../lib/schema.js'

export default class Init extends Command {
  static override description = t('commands.init.description')

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --name api-ai --type core --description "AI provider interface"',
    '<%= config.bin %> <%= command.id %> --name api-cache-redis --type provider --category cache --description "Redis cache" --implements @molecule/api-cache --no-interactive',
  ]

  static override flags = {
    name: Flags.string({
      char: 'n',
      description: t('commands.init.flags.name'),
    }),
    type: Flags.string({
      char: 't',
      description: t('commands.init.flags.type'),
      options: [
        'core',
        'provider',
        'resource',
        'middleware',
        'utility',
        'infrastructure',
        'framework',
        'feature',
        'native',
      ],
    }),
    category: Flags.string({
      char: 'c',
      description: t('commands.init.flags.category'),
    }),
    description: Flags.string({
      char: 'd',
      description: t('commands.init.flags.description'),
    }),
    stack: Flags.string({
      char: 's',
      description: t('commands.init.flags.stack'),
      options: ['api', 'app'],
    }),
    implements: Flags.string({
      description: t('commands.init.flags.implements'),
    }),
    label: Flags.string({
      description: t('commands.init.flags.label'),
    }),
    interactive: Flags.boolean({
      description: t('commands.init.flags.interactive'),
      default: true,
      allowNo: true,
    }),
    force: Flags.boolean({
      char: 'f',
      description: t('commands.init.flags.force'),
      default: false,
    }),
    dir: Flags.string({
      description: t('commands.init.flags.dir'),
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Init)

    let meta: InferredMetadata

    if (flags.interactive && !this.hasFullFlags(flags)) {
      // ---- Mode 1: Human interactive (single question) ----
      meta = await this.interactiveFlow(flags)
    } else {
      // ---- Mode 2: Programmatic / AI-assisted (full flags) ----
      meta = this.buildFromFlags(flags)
    }

    // Resolve target directory: explicit --dir > monorepo auto-placement > cwd fallback
    const targetDir = flags.dir ?? this.resolveTargetDir(meta)

    // Check if directory already exists
    let dirExists = false
    try {
      await access(targetDir)
      dirExists = true
    } catch (_error) {
      // Directory doesn't exist — will be created; access() throwing ENOENT is the expected path
    }

    if (dirExists && !flags.force) {
      if (flags.interactive) {
        const overwrite = await p.confirm({
          message: t('commands.init.prompts.overwrite', { name: meta.name }),
        })
        if (p.isCancel(overwrite) || !overwrite) {
          p.cancel(t('commands.init.prompts.cancelled'))
          process.exit(0)
        }
      } else {
        this.error(t('commands.init.errors.dirExists', { path: targetDir }))
      }
    }

    // Scaffold the package — skip existing files when directory already exists
    const scaffoldOpts = dirExists ? { skipExisting: true } : undefined

    if (flags.interactive) {
      const spinner = p.spinner()
      spinner.start(t('commands.init.spinners.creating'))
      const result = await scaffoldPackage(targetDir, meta, scaffoldOpts)
      this.addToRegistry(meta, result.path)
      spinner.stop(t('commands.init.spinners.created'))

      p.outro(chalk.green(t('commands.init.messages.success', { name: meta.name })))

      this.log('')
      this.log(`  ${chalk.cyan(t('commands.init.labels.directory'))}  ${result.path}`)
      this.log(`  ${chalk.cyan(t('commands.init.labels.type'))}       ${meta.type}`)
      this.log(`  ${chalk.cyan(t('commands.init.labels.category'))}   ${meta.category}`)
      this.log(`  ${chalk.cyan(t('commands.init.labels.stack'))}      ${meta.stack}`)
      if (meta.implements) {
        this.log(`  ${chalk.cyan(t('commands.init.labels.implements'))} ${meta.implements}`)
      }
      this.log('')
      this.log(`  ${chalk.dim(t('commands.init.labels.filesCreated'))}`)
      for (const f of result.files) {
        this.log(`    ${chalk.dim('•')} ${f}`)
      }
      this.log('')
      this.log(t('commands.init.messages.nextSteps'))
      this.log(`  1. ${chalk.cyan(`cd ${meta.name}`)}`)
      this.log(`  2. ${t('commands.init.messages.implementPackage', { path: chalk.cyan('src/') })}`)
      this.log(`  3. ${chalk.cyan('npm install')} && ${chalk.cyan('npm run build')}`)
    } else {
      const result = await scaffoldPackage(targetDir, meta, scaffoldOpts)
      this.addToRegistry(meta, result.path)
      // JSON output for programmatic consumption
      this.log(
        JSON.stringify({
          name: `@molecule/${meta.name}`,
          path: result.path,
          type: meta.type,
          category: meta.category,
          stack: meta.stack,
          implements: meta.implements,
          files: result.files,
        }),
      )
    }
  }

  private async interactiveFlow(flags: Record<string, unknown>): Promise<InferredMetadata> {
    p.intro(chalk.bgCyan(` ${t('commands.init.labels.intro')} `))

    // Single open-ended question
    const description = await p.text({
      message: t('commands.init.prompts.describe'),
      placeholder: t('commands.init.prompts.describePlaceholder'),
      validate: (value) => {
        if (!value || value.trim().length < 3) return t('commands.init.prompts.describeValidation')
        return undefined
      },
    })

    if (p.isCancel(description)) {
      p.cancel(t('commands.init.prompts.cancelled'))
      process.exit(0)
    }

    // Load registry for inference context
    let registry: ReturnType<typeof loadRegistry> = []
    try {
      registry = [...loadRegistry('api'), ...loadRegistry('app')]
    } catch (_error) {
      // Registry not available — inference works fine with an empty registry; safe to ignore
    }

    // Infer metadata
    let meta = inferFromDescription(description as string, registry)

    // Apply any flag overrides
    if (flags.name) meta = { ...meta, name: flags.name as string }
    if (flags.type) meta = { ...meta, type: flags.type as InferredMetadata['type'] }
    if (flags.category) meta = { ...meta, category: flags.category as string }
    if (flags.stack) meta = { ...meta, stack: flags.stack as 'api' | 'app' }
    if (flags.implements) meta = { ...meta, implements: flags.implements as string }
    if (flags.label) meta = { ...meta, label: flags.label as string }

    // Show inferred metadata for confirmation
    p.note(
      [
        `${chalk.cyan(t('commands.init.labels.name'))}       @molecule/${meta.name}`,
        `${chalk.cyan(t('commands.init.labels.type'))}       ${meta.type}`,
        `${chalk.cyan(t('commands.init.labels.category'))}   ${meta.category}`,
        `${chalk.cyan(t('commands.init.labels.stack'))}      ${meta.stack}`,
        `${chalk.cyan(t('commands.init.labels.label'))}      ${meta.label}`,
        meta.implements
          ? `${chalk.cyan(t('commands.init.labels.implements'))} ${meta.implements}`
          : null,
        meta.secrets.length > 0
          ? `${chalk.cyan(t('commands.init.labels.secrets'))}    ${meta.secrets.map((s) => s.name).join(', ')}`
          : null,
        meta.tables.length > 0
          ? `${chalk.cyan(t('commands.init.labels.tables'))}     ${meta.tables.join(', ')}`
          : null,
      ]
        .filter(Boolean)
        .join('\n'),
      t('commands.init.labels.inferredMetadata'),
    )

    const confirmed = await p.confirm({
      message: t('commands.init.prompts.confirm'),
      initialValue: true,
    })

    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel(t('commands.init.prompts.cancelled'))
      process.exit(0)
    }

    return meta
  }

  private buildFromFlags(flags: Record<string, unknown>): InferredMetadata {
    const name = flags.name as string | undefined
    const type = (flags.type as InferredMetadata['type'] | undefined) ?? 'core'
    const category = (flags.category as string | undefined) ?? 'general'
    const stack = (flags.stack as 'api' | 'app' | undefined) ?? 'api'
    const description = (flags.description as string | undefined) ?? ''
    const label = (flags.label as string | undefined) ?? this.titleCase(category)
    const implements_ = flags.implements as string | undefined

    if (!name) {
      this.error(t('commands.init.errors.nameRequired'))
    }

    return {
      name,
      type,
      category,
      stack,
      label,
      description,
      implements: implements_,
      secrets: [],
      tables: type === 'resource' ? [category.endsWith('s') ? category : category + 's'] : [],
    }
  }

  private hasFullFlags(flags: Record<string, unknown>): boolean {
    return !!(flags.name && flags.type)
  }

  /**
   * Detect if cwd is inside a molecule monorepo and auto-resolve the package directory.
   * Falls back to cwd/meta.name if not in a monorepo.
   */
  private resolveTargetDir(meta: InferredMetadata): string {
    const monorepoRoot = detectMonorepoRoot()
    if (monorepoRoot) {
      return resolvePackageDirectory(monorepoRoot, meta)
    }
    return join(process.cwd(), meta.name)
  }

  private addToRegistry(meta: InferredMetadata, absolutePath: string): void {
    const monorepoRoot = detectMonorepoRoot()
    // Registry paths are relative to the molecule monorepo root (not workspace root)
    const moleculeRoot = monorepoRoot ?? join(absolutePath, '..', '..', '..', '..')

    const entry: RegistryEntry = {
      language: 'typescript',
      runtime: 'node',
      type: meta.type,
      category: meta.category,
      label: meta.label,
      description: meta.description,
      stack: meta.stack,
      implements: meta.implements,
      exports: [],
      secrets: meta.secrets,
      runtimeDependencies: [],
      path: relative(moleculeRoot, absolutePath),
    }

    try {
      updateRegistryEntry(`@molecule/${meta.name}`, entry)
    } catch (error) {
      // Registry update is best-effort — don't fail package creation, but surface the failure
      this.warn(`Registry update failed for @molecule/${meta.name}: ${error}`)
    }
  }

  private titleCase(str: string): string {
    return str
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }
}
