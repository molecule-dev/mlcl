import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { Command, Flags } from '@oclif/core'

import { collectRegistrySecrets, detectLocalEnvVars } from '../../lib/env-detect.js'
import { appendSecretsToEnvFile } from '../../lib/env-file.js'
import { ui } from '../../lib/ui.js'

/**
 * The read-only, local answer to "what env vars does this app need and which
 * am I missing" — the same detection the IDE's env panel shows, run against a
 * project on disk. `--fix` appends the missing registry-declared keys (with
 * generated values where the registry marks them generatable) to the right
 * .env file, exactly like `mlcl inject` does.
 */
export default class EnvCheck extends Command {
  static override description =
    'Check which env vars the project needs (from code reads + installed package declarations) and which are missing from your .env files'

  static override examples = [
    '<%= config.bin %> env check',
    '<%= config.bin %> env check --json',
    '<%= config.bin %> env check --fix',
  ]

  static override flags = {
    json: Flags.boolean({ description: 'Machine-readable report', default: false }),
    fix: Flags.boolean({
      description:
        'Append missing registry-declared keys to the workspace .env files (generated values where possible)',
      default: false,
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(EnvCheck)
    const root = process.cwd()
    let report = detectLocalEnvVars(root)

    if (flags.fix) {
      const secrets = [...collectRegistrySecrets(report.packages).values()]
      for (const [dir, projectTypes] of stackDirs(root)) {
        for (const projectType of projectTypes) {
          await appendSecretsToEnvFile(dir, secrets, projectType, projectNameOf(root), {
            generatedBy: 'mlcl env check --fix',
          })
        }
      }
      report = detectLocalEnvVars(root)
    }

    if (flags.json) {
      this.log(JSON.stringify(report, null, 2))
      return
    }

    const attention = report.vars.filter((v) => v.group === 'attention')
    const optional = report.vars.filter((v) => v.group === 'optional')
    const setVars = report.vars.filter((v) => v.group === 'set')
    const platform = report.vars.filter((v) => v.group === 'platform')

    this.log(
      `\n${ui.heading('Env check')} ${ui.dim(report.scannedRoot)}\n` +
        ui.dim(
          `code reads + ${report.packages.length} installed @molecule/* packages, ` +
            `${report.envFiles.length} .env file${report.envFiles.length === 1 ? '' : 's'}`,
        ),
    )

    if (attention.length === 0) {
      this.log(`\n${ui.check('Nothing missing')} — every required env var is set or provided.\n`)
    } else {
      this.log(`\n${ui.heading(`Needs attention (${attention.length})`)}`)
      for (const v of attention) {
        this.log(`  ${ui.warn(v.key)}`)
        if (v.label) this.log(`      ${v.label}`)
        for (const f of v.files) this.log(`      ${ui.dim('read at')} ${f}`)
        if (v.instructions) this.log(`      ${v.instructions}`)
        if (v.setupUrl) this.log(`      ${ui.dim('get one:')} ${v.setupUrl}`)
        this.log(
          `      ${ui.dim('fix:')} ${v.fix === 'generate' ? 'mlcl env check --fix' : `mlcl env set ${v.key}=<value>`}`,
        )
      }
    }

    if (optional.length > 0) {
      this.log(`\n${ui.heading(`Optional (${optional.length})`)}`)
      for (const v of optional) {
        const fallback =
          v.defaultValue !== undefined ? ui.dim(` (falls back to ${v.defaultValue})`) : ''
        this.log(`  ${ui.id(v.key)}${fallback}`)
        for (const f of v.files) this.log(`      ${ui.dim('read at')} ${f}`)
      }
    }

    if (platform.length > 0) {
      this.log(
        `\n${ui.heading(`Provided by molecule.dev (${platform.length})`)} ${ui.dim('injected in sandboxes and deploys')}`,
      )
      for (const v of platform)
        this.log(`  ${ui.id(v.key)}${v.label ? ui.dim(` — ${v.label}`) : ''}`)
    }

    this.log(
      `\n${ui.heading(`Set (${setVars.length})`)} ${ui.dim('in your .env files — see mlcl env list')}`,
    )
    if (report.hiddenCount > 0) {
      this.log(
        `\n${ui.dim(`${report.hiddenCount} tooling-only key${report.hiddenCount === 1 ? '' : 's'} (tests/e2e/build config) not shown`)}`,
      )
    }
    this.log('')
  }
}

/**
 * The stack dirs a workspace keeps .env files in — the append helper's VITE_
 * filter routes each key to the file of the stack that uses it. A
 * single-directory workspace has ONE shared .env with no routing problem, so
 * both filters run there and every key its packages declare lands in it
 * (each pass is idempotent, and the second skips what the first wrote).
 */
function stackDirs(root: string): [dir: string, projectTypes: ('api' | 'app')[]][] {
  const dirs: [string, ('api' | 'app')[]][] = []
  if (existsSync(join(root, 'api', 'package.json'))) dirs.push([join(root, 'api'), ['api']])
  if (existsSync(join(root, 'app', 'package.json'))) dirs.push([join(root, 'app'), ['app']])
  if (dirs.length > 0) return dirs
  return [[root, ['api', 'app']]]
}

function projectNameOf(root: string): string {
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { name?: string }
    return pkg.name ?? 'my-app'
  } catch (_error) {
    // No manifest / unnamed — the append header just says my-app.
    return 'my-app'
  }
}
