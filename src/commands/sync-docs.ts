import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import * as p from '@clack/prompts'
import { Command, Flags } from '@oclif/core'
import chalk from 'chalk'

import { checkDocs } from '../lib/docs-check.js'
import { stripGeneratedTimestamp } from '../lib/docs-generator.js'
import { generateDocs } from '../lib/docs-sync.js'
import {
  type DocIssue,
  fixLanguageCount,
  fixLanguageList,
  fixTranslationKeys,
  validateDocs,
} from '../lib/docs-validator.js'
import { getRawRegistry } from '../lib/registry.js'
import type { Registry } from '../lib/schema.js'

export default class SyncDocs extends Command {
  // Internal maintenance command — hidden from the public CLI surface (still
  // callable by name for CI and workspace scripts).
  static override hidden = true

  static override description =
    'Validate README.md files against source code and auto-fix mechanical sections'

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --check',
    '<%= config.bin %> <%= command.id %> --fix',
    '<%= config.bin %> <%= command.id %> --generate',
    '<%= config.bin %> <%= command.id %> --generate -p @molecule/api-logger',
    '<%= config.bin %> <%= command.id %> --package @molecule/api-logger',
  ]

  static override flags = {
    jobs: Flags.integer({
      description: 'README check processes (1 or 2; single-package checks stay in process)',
      default: 1,
      min: 1,
      max: 2,
      env: 'MLCL_DOCS_JOBS',
    }),
    check: Flags.boolean({
      description: 'CI mode: exit non-zero if any README.md differs from generated output',
      default: false,
    }),
    fix: Flags.boolean({
      description: 'Auto-fix mechanical sections (language counts, lists, translation keys)',
      default: false,
    }),
    generate: Flags.boolean({
      description: 'Generate all README.md files from source code + registry metadata',
      default: false,
    }),
    package: Flags.string({
      char: 'p',
      description: 'Target a single package (e.g. @molecule/api-logger)',
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(SyncDocs)

    if (flags.jobs !== 1 && !flags.check) this.error('--jobs=2 requires --check')

    p.intro(chalk.bgCyan(' sync-docs '))

    const registry = getRawRegistry()
    const __dir = dirname(fileURLToPath(import.meta.url))
    const moleculeDir = process.env.MOLECULE_PACKAGES_DIR
      ? join(process.env.MOLECULE_PACKAGES_DIR, '..')
      : join(__dir, '..', '..', '..', 'molecule')

    if (!existsSync(moleculeDir)) {
      p.outro(chalk.red(`Could not find molecule directory at ${moleculeDir}`))
      this.exit(1)
      return
    }

    // --generate mode: generate README.md from source code + registry
    if (flags.generate || flags.check) {
      await this.runGenerate(registry, moleculeDir, flags)
      return
    }

    const spinner = p.spinner()
    spinner.start('Scanning README.md files...')

    const issues = await validateDocs(moleculeDir, registry, flags.package)

    spinner.stop(
      issues.length > 0 ? `Found ${issues.length} issue(s)` : 'All README.md files are in sync',
    )

    if (issues.length === 0) {
      p.outro(chalk.green('No issues found'))
      return
    }

    // Display issues grouped by file
    const byFile = new Map<string, DocIssue[]>()
    for (const issue of issues) {
      const existing = byFile.get(issue.file) ?? []
      existing.push(issue)
      byFile.set(issue.file, existing)
    }

    for (const [file, fileIssues] of byFile) {
      p.log.warn(chalk.yellow(file))
      for (const issue of fileIssues) {
        const fixable = issue.fixable ? chalk.dim(' (fixable)') : ''
        p.log.message(`  ${issue.message}${fixable}`)
      }
    }

    const fixableCount = issues.filter((i) => i.fixable).length
    const unfixableCount = issues.length - fixableCount

    if (flags.fix && fixableCount > 0) {
      const fixSpinner = p.spinner()
      fixSpinner.start('Applying fixes...')

      let fixed = 0
      for (const [file, fileIssues] of byFile) {
        const mdPath = join(moleculeDir, file)
        if (!existsSync(mdPath)) continue

        let md = readFileSync(mdPath, 'utf-8')
        let changed = false

        for (const issue of fileIssues) {
          if (!issue.fixable) continue

          if (issue.type === 'language_count') {
            const countMatch = issue.message.match(/has (\d+) language/)
            if (countMatch) {
              md = fixLanguageCount(md, Number.parseInt(countMatch[1], 10))
              changed = true
              fixed++
            }
          }

          if (issue.type === 'language_list') {
            // Rebuild from actual language files
            const srcDir = join(moleculeDir, file.replace('/README.md', ''), 'src')
            if (existsSync(srcDir)) {
              const langFiles = getLangFilesFromDir(srcDir)
              md = fixLanguageList(md, langFiles)
              changed = true
              fixed++
            }
          }

          if (issue.type === 'translation_keys') {
            const srcDir = join(moleculeDir, file.replace('/README.md', ''), 'src')
            const enPath = join(srcDir, 'en.ts')
            if (existsSync(enPath)) {
              const enContent = readFileSync(enPath, 'utf-8')
              const keys = parseTranslationKeysFromEn(enContent)
              md = fixTranslationKeys(md, keys)
              changed = true
              fixed++
            }
          }

          if (issue.type === 'title') {
            const nameMatch = issue.message.match(/package name "([^"]+)"/)
            if (nameMatch) {
              md = md.replace(/^#\s+.+$/m, `# ${nameMatch[1]}`)
              changed = true
              fixed++
            }
          }
        }

        if (changed) {
          writeFileSync(mdPath, md)
        }
      }

      fixSpinner.stop(`Applied ${fixed} fix(es)`)

      if (unfixableCount > 0) {
        p.log.warn(chalk.yellow(`${unfixableCount} issue(s) require manual review`))
      }
    }

    // Summary
    const missingCount = issues.filter((i) => i.type === 'missing').length
    const hasMissing = missingCount > 0
    const fixHint = fixableCount > 0 ? `Run with --fix to auto-fix ${fixableCount} issue(s)` : ''
    const generateHint = hasMissing
      ? `Run with --generate to create ${missingCount} missing README.md file(s)`
      : ''
    const defaultHint = [fixHint, generateHint].filter(Boolean).join('. ')

    p.outro(
      flags.check
        ? chalk.red(`${issues.length} issue(s) found`)
        : flags.fix
          ? unfixableCount > 0
            ? chalk.yellow(`${unfixableCount} issue(s) remaining (manual fix needed)`)
            : chalk.green('All fixable issues resolved')
          : chalk.yellow(defaultHint),
    )

    if (flags.check && issues.length > 0) {
      this.exit(1)
    }
  }

  /**
   * Generate README.md files from source code + registry metadata.
   * In --check mode, compares generated output to existing files and exits non-zero on diff.
   * In --generate mode, writes the generated files.
   */
  private async runGenerate(
    registry: Registry,
    moleculeDir: string,
    flags: { check: boolean; generate: boolean; package?: string; jobs?: number },
  ): Promise<void> {
    const spinner = p.spinner()
    spinner.start(flags.check ? 'Checking README.md files...' : 'Generating README.md files...')

    if (flags.package && !registry.packages[flags.package]) {
      // A typo'd or unregistered -p previously matched nothing and reported
      // success — a false green that let unregistered packages drift
      // unmaintained. Fail loudly instead.
      spinner.stop('No matching package.')
      this.error(
        `Package "${flags.package}" is not in the registry. ` +
          `Check the name, or register the package (mlcl init --force) before syncing its docs.`,
      )
    }

    if (flags.check && flags.jobs === 2 && !flags.package) {
      const controller = new AbortController()
      const cancel = (): void => controller.abort(new Error('README check cancelled'))
      process.prependOnceListener('SIGINT', cancel)
      process.prependOnceListener('SIGTERM', cancel)
      try {
        const result = await checkDocs(registry, moleculeDir, undefined, {
          jobs: 2,
          signal: controller.signal,
        })
        spinner.stop(
          result.different.length
            ? `${result.different.length} file(s) differ from generated output`
            : `All ${result.checked.length} README.md files match generated output`,
        )
        for (const name of result.different) p.log.warn(chalk.yellow(`  ${name}`))
        if (result.different.length) {
          p.outro(chalk.red(`Run 'mlcl sync-docs --generate' to regenerate`))
          this.exit(1)
        }
        p.outro(chalk.green('All README.md files are in sync'))
      } catch (error) {
        spinner.stop('README check failed')
        throw error
      } finally {
        process.removeListener('SIGINT', cancel)
        process.removeListener('SIGTERM', cancel)
      }
      return
    }

    const docs = await generateDocs(
      registry,
      moleculeDir,
      flags.package ? [flags.package] : undefined,
    )

    let generated = 0
    let unchanged = 0
    let diffs = 0
    const diffFiles: string[] = []

    for (const { name, readmePath, md } of docs) {
      // Compare WITHOUT the generation timestamp: it changes every run, so a raw
      // byte comparison would report all ~900 docs stale forever.
      const current = existsSync(readmePath) ? readFileSync(readmePath, 'utf-8') : null
      const stale =
        current === null || stripGeneratedTimestamp(current) !== stripGeneratedTimestamp(md)

      if (flags.check) {
        if (stale) {
          diffs++
          diffFiles.push(name)
        } else {
          unchanged++
        }
      } else if (stale) {
        // Only rewrite on a real content change, so the timestamp records when
        // the document last CHANGED rather than when the generator last ran.
        writeFileSync(readmePath, md)
        generated++
      } else {
        unchanged++
      }
    }

    if (flags.check) {
      spinner.stop(
        diffs > 0
          ? `${diffs} file(s) differ from generated output`
          : `All ${unchanged} README.md files match generated output`,
      )

      if (diffs > 0) {
        for (const name of diffFiles) {
          p.log.warn(chalk.yellow(`  ${name}`))
        }
        p.outro(chalk.red(`Run 'mlcl sync-docs --generate' to regenerate`))
        this.exit(1)
      } else {
        p.outro(chalk.green('All README.md files are in sync'))
      }
    } else {
      spinner.stop(`Generated ${generated} README.md file(s)`)
      p.outro(chalk.green('Done'))
    }
  }
}

/** Get language file names from a src directory */
function getLangFilesFromDir(srcDir: string): string[] {
  try {
    return readdirSync(srcDir)
      .filter(
        (f) =>
          f.endsWith('.ts') &&
          !f.endsWith('.d.ts') &&
          f !== 'index.ts' &&
          f !== 'types.ts' &&
          !f.startsWith('__'),
      )
      .map((f) => f.replace(/\.ts$/, ''))
  } catch (_error) {
    // safe to ignore: if srcDir is unreadable, returning [] skips the fix step without data loss
    return []
  }
}

/** Parse translation keys from en.ts content */
function parseTranslationKeysFromEn(content: string): Record<string, string> {
  const keys: Record<string, string> = {}
  const pattern = /['"]([^'"]+)['"]\s*:\s*\n?\s*['"]([^'"]+)['"]/g
  for (const match of content.matchAll(pattern)) {
    keys[match[1]] = match[2]
  }
  return keys
}
