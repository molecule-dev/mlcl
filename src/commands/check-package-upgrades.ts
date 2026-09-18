import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import * as p from '@clack/prompts'
import { Command, Flags } from '@oclif/core'
import chalk from 'chalk'
import { execa } from 'execa'

import {
  applyUpgrades,
  applyUpgradesToProjectPackageJson,
  collectUpgradeCandidates,
  type FetchResult,
  type UpgradeCandidate,
  type VersionFetcher,
} from '../lib/package-upgrades.js'
import { clearRegistryCache, getRegistryPath } from '../lib/registry.js'
import type { Registry } from '../lib/schema.js'

/**
 * Build the real version fetcher backed by `npm view <pkg> version`.
 *
 * Classifies failures so the report can distinguish a package that simply
 * isn't published (npm E404) from a registry that can't be reached (offline,
 * timeout, auth) — it never throws. Exported so the classification can be tested
 * directly against a mocked `execa` without going to the network.
 */
export function npmViewFetcher(): VersionFetcher {
  return async (name: string): Promise<FetchResult> => {
    try {
      const { stdout } = await execa('npm', ['view', name, 'version'], {
        timeout: 20_000,
        reject: true,
      })
      const version = stdout.trim().split('\n').pop()?.trim() ?? ''
      if (!version) return { ok: false, reason: 'unpublished' }
      return { ok: true, version }
    } catch (error) {
      const message =
        (error as { stderr?: string; shortMessage?: string; message?: string }).stderr ??
        (error as { shortMessage?: string }).shortMessage ??
        (error as { message?: string }).message ??
        String(error)
      if (/E404|404 Not Found|is not in (this|the) (npm )?registry|404/i.test(message)) {
        return { ok: false, reason: 'unpublished' }
      }
      return { ok: false, reason: 'unreachable' }
    }
  }
}

/** Keep only the entries of a dependency map whose name contains `filter`. */
function filterDepsByName(
  deps: Record<string, string> | undefined,
  filter: string,
): Record<string, string> | undefined {
  if (!deps) return deps
  return Object.fromEntries(Object.entries(deps).filter(([name]) => name.includes(filter)))
}

/**
 * Apply the `--filter` substring to every framework config's `dependencies` /
 * `devDependencies`, preserving all other config fields. Returns a new map so
 * the scoped sweep only queries the matching framework deps.
 */
function scopeFrameworkDeps<
  T extends Record<
    string,
    { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
  >,
>(configs: T | undefined, filter: string): T | undefined {
  if (!configs) return configs
  return Object.fromEntries(
    Object.entries(configs).map(([framework, config]) => [
      framework,
      {
        ...config,
        ...(config.dependencies
          ? { dependencies: filterDepsByName(config.dependencies, filter) }
          : {}),
        ...(config.devDependencies
          ? { devDependencies: filterDepsByName(config.devDependencies, filter) }
          : {}),
      },
    ]),
  ) as T
}

export default class CheckPackageUpgrades extends Command {
  /**
   * Factory for the version fetcher. Defaults to the real `npm view` lookup;
   * overridable in tests to inject a deterministic, offline fetcher so the
   * full command orchestration (including the file-writing `--apply` path) can
   * run without touching the network.
   */
  static fetcherFactory: () => VersionFetcher = npmViewFetcher

  // Internal maintenance command — hidden from the public CLI surface (still
  // callable by name for CI and workspace scripts).
  static override hidden = true

  static override description =
    'Check for newer published versions of @molecule/* packages, the toolchain, AND the api/app framework deps every scaffold pins (react, express, @types/*, …); --apply bumps the registry pins (and a project package.json in cwd, if present).'

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --filter typescript',
    '<%= config.bin %> <%= command.id %> --json',
    '<%= config.bin %> <%= command.id %> --apply',
  ]

  static override flags = {
    apply: Flags.boolean({
      description: 'Write the newer versions back to registry.json (+ a cwd project package.json)',
      default: false,
    }),
    filter: Flags.string({
      description: 'Only check packages whose name contains this substring',
    }),
    concurrency: Flags.integer({
      description: 'Max simultaneous npm lookups',
      default: 12,
    }),
    json: Flags.boolean({
      description: 'Emit the raw candidate list as JSON (no pretty report)',
      default: false,
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(CheckPackageUpgrades)

    if (!flags.json) p.intro(chalk.bgCyan(' check-package-upgrades '))

    const registryPath = getRegistryPath()
    const registry = JSON.parse(readFileSync(registryPath, 'utf-8')) as Registry

    // Scope the registry's package list when --filter is supplied so we only
    // query a subset (keeps the sweep fast and targeted). The filter applies to
    // @molecule packages, toolchain deps, AND framework deps alike.
    const scoped: Registry = flags.filter
      ? {
          ...registry,
          packages: Object.fromEntries(
            Object.entries(registry.packages).filter(([name]) =>
              name.includes(flags.filter as string),
            ),
          ),
          toolchain: registry.toolchain
            ? (Object.fromEntries(
                Object.entries(registry.toolchain).map(([section, deps]) => [
                  section,
                  deps && typeof deps === 'object'
                    ? Object.fromEntries(
                        Object.entries(deps as Record<string, string>).filter(([name]) =>
                          name.includes(flags.filter as string),
                        ),
                      )
                    : deps,
                ]),
              ) as Registry['toolchain'])
            : registry.toolchain,
          apiFrameworks: scopeFrameworkDeps(registry.apiFrameworks, flags.filter),
          appFrameworks: scopeFrameworkDeps(registry.appFrameworks, flags.filter),
        }
      : registry

    const spinner = flags.json ? null : p.spinner()
    spinner?.start('Querying npm for newer versions...')

    const candidates = await collectUpgradeCandidates({
      registry: scoped,
      fetch: (this.constructor as typeof CheckPackageUpgrades).fetcherFactory(),
      concurrency: flags.concurrency,
    })

    const upgrades = candidates.filter((c) => c.status === 'upgrade')
    const unreachable = candidates.filter((c) => c.status === 'unreachable')
    const unpublished = candidates.filter((c) => c.status === 'unpublished')
    const current = candidates.filter((c) => c.status === 'current')

    spinner?.stop(
      upgrades.length > 0
        ? `${upgrades.length} upgrade(s) available`
        : chalk.dim('No upgrades available'),
    )

    if (flags.json) {
      this.log(JSON.stringify(candidates, null, 2))
      return
    }

    // Every package reachable but unpublished → almost certainly offline or the
    // @molecule scope is genuinely unpublished. Make the degraded state clear.
    if (current.length === 0 && upgrades.length === 0 && candidates.length > 0) {
      const note =
        unreachable.length > 0
          ? 'Could not reach the npm registry for any package — are you offline?'
          : 'No checked package is published yet — nothing to compare against.'
      p.note(
        [
          `${chalk.dim('Checked:')}      ${candidates.length}`,
          `${chalk.dim('Unpublished:')}  ${unpublished.length}`,
          `${chalk.dim('Unreachable:')}  ${unreachable.length}`,
          '',
          chalk.yellow(note),
        ].join('\n'),
        'No comparable versions',
      )
      p.outro(chalk.yellow('Nothing to upgrade.'))
      return
    }

    // Collapse duplicate upgrade lines: a dep pinned by several frameworks
    // (react across react/react-native/react-native-web) shows once with all
    // its locations, instead of N near-identical rows.
    const grouped = new Map<string, { candidate: UpgradeCandidate; locations: string[] }>()
    for (const c of upgrades) {
      const where =
        c.kind === 'toolchain'
          ? `toolchain.${c.section}`
          : c.kind === 'framework'
            ? `${c.family}.${c.framework}`
            : ''
      const key = `${c.name}@${c.latest}`
      const existing = grouped.get(key)
      if (existing) {
        if (where && !existing.locations.includes(where)) existing.locations.push(where)
      } else {
        grouped.set(key, { candidate: c, locations: where ? [where] : [] })
      }
    }
    const lines = [...grouped.values()]
      .sort((a, b) => a.candidate.name.localeCompare(b.candidate.name))
      .map(({ candidate: c, locations }) => {
        const where = locations.length > 0 ? chalk.dim(` (${locations.join(', ')})`) : ''
        return `${chalk.yellow('↑')} ${chalk.cyan(c.name)}: ${c.current} → ${chalk.green(c.latest ?? '?')}${where}`
      })

    p.note(
      [
        `${chalk.dim('Checked:')}      ${candidates.length}`,
        `${chalk.green('Upgrades:')}     ${upgrades.length}`,
        `${chalk.dim('Up to date:')}   ${current.length}`,
        `${chalk.dim('Unpublished:')}  ${unpublished.length}`,
        unreachable.length > 0 ? `${chalk.red('Unreachable:')}  ${unreachable.length}` : null,
        lines.length > 0 ? '\n' + lines.join('\n') : null,
      ]
        .filter(Boolean)
        .join('\n'),
      'Package Upgrades',
    )

    if (!flags.apply) {
      p.outro(
        upgrades.length > 0
          ? chalk.yellow('Run with --apply to update registry.json (+ a cwd project package.json)')
          : chalk.green('All checked packages are up to date.'),
      )
      return
    }

    if (upgrades.length === 0) {
      p.outro(chalk.green('Nothing to apply — all checked packages are up to date.'))
      return
    }

    // --- apply: registry.json (read raw to preserve every key) ---
    const fullRegistry = JSON.parse(readFileSync(registryPath, 'utf-8')) as Registry
    const result = applyUpgrades(fullRegistry, upgrades)
    writeFileSync(registryPath, JSON.stringify(result.registry, null, 2) + '\n', 'utf-8')
    clearRegistryCache()

    // --- apply: a project package.json in cwd, if present ---
    let projectChanged = 0
    const cwdPkgPath = join(process.cwd(), 'package.json')
    if (existsSync(cwdPkgPath)) {
      try {
        const projectPkg = JSON.parse(readFileSync(cwdPkgPath, 'utf-8')) as {
          dependencies?: Record<string, string>
          devDependencies?: Record<string, string>
        }
        projectChanged = applyUpgradesToProjectPackageJson(projectPkg, upgrades)
        if (projectChanged > 0) {
          writeFileSync(cwdPkgPath, JSON.stringify(projectPkg, null, 2) + '\n', 'utf-8')
        }
      } catch (error) {
        this.warn(`Could not update ${cwdPkgPath}: ${(error as Error).message}`)
      }
    }

    p.outro(
      chalk.green(
        `Applied: ${result.moleculeChanged} @molecule pin(s), ${result.toolchainChanged} toolchain pin(s), ${result.frameworkChanged} framework pin(s)` +
          (projectChanged > 0 ? `, ${projectChanged} dep(s) in ${cwdPkgPath}` : ''),
      ),
    )
  }
}
