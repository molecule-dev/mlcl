import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import * as p from '@clack/prompts'
import { Command, Flags } from '@oclif/core'
import chalk from 'chalk'

import { getMoleculeVersion, getRawRegistry, getRegistryPath } from '../lib/registry.js'
import {
  bondSetterScope,
  ROUTE_SCANNED_TYPES,
  routesSignature,
  scanBondSetter,
  scanExports,
  scanForRoutes,
  scanForTables,
  scanSetupSqlBundle,
  scanSqlCapabilities,
} from '../lib/scanner.js'
import { readPackageVersion } from '../lib/setup-sql.js'
import { planSetupSqlEntrySync } from '../lib/setup-sql-version.js'

export default class SyncRegistry extends Command {
  // Internal maintenance command — hidden from the public CLI surface (still
  // callable by name for CI and workspace scripts).
  static override hidden = true

  static override description =
    'Sync registry.json with molecule packages (exports, routes, tables, toolchain, and framework versions)'

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --dry-run',
    '<%= config.bin %> <%= command.id %> --check',
    '<%= config.bin %> <%= command.id %> --scan-exports',
    '<%= config.bin %> <%= command.id %> --scan-routes',
    '<%= config.bin %> <%= command.id %> --sync-toolchain',
    '<%= config.bin %> <%= command.id %> --sync-frameworks',
    '<%= config.bin %> <%= command.id %> --check-intent-hints',
  ]

  static override flags = {
    'dry-run': Flags.boolean({
      description: 'Show what would be written without writing',
      default: false,
    }),
    check: Flags.boolean({
      description: 'Check if registry is in sync (exits non-zero if drift detected, for CI)',
      default: false,
    }),
    'scan-exports': Flags.boolean({
      description: 'Scan actual source exports for every package and update the registry',
      default: false,
    }),
    'scan-tables': Flags.boolean({
      description:
        "Scan each package's src/__setup__/ SQL (and setup/ for a bond package that ships it beside its source) and update the registry tables field",
      default: false,
    }),
    'scan-routes': Flags.boolean({
      description:
        "Scan each resource's src/routes.ts (middlewares filtered to requestHandlerMap keys) and update the registry routes field",
      default: false,
    }),
    'sync-toolchain': Flags.boolean({
      description:
        'Sync toolchain versions in registry.json from mlcl and molecule package.json files',
      default: false,
    }),
    'sync-frameworks': Flags.boolean({
      description:
        'Sync framework dependency versions in registry.json from molecule package.json files',
      default: false,
    }),
    'check-intent-hints': Flags.boolean({
      description:
        'Validate intentHints: duplicates across non-multiSelect packages, count >8, non-lowercase entries, and BLOCKING coverage (every matcher-eligible package must have hints)',
      default: false,
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(SyncRegistry)

    p.intro(chalk.bgCyan(' sync-registry '))

    // Individual flag modes
    if (flags['sync-toolchain']) {
      this.syncToolchain(flags['dry-run'])
      return
    }

    if (flags['sync-frameworks']) {
      this.syncFrameworks(flags['dry-run'])
      return
    }

    if (flags['scan-exports']) {
      await this.refreshExports(flags['dry-run'])
      return
    }

    if (flags['scan-tables']) {
      await this.refreshTables(flags['dry-run'])
      return
    }

    if (flags['scan-routes']) {
      await this.refreshRoutes(flags['dry-run'])
      return
    }

    if (flags['check-intent-hints']) {
      const violations = this.checkIntentHints()
      if (violations > 0) this.exit(1)
      return
    }

    // Default: run all syncs. --check implies --dry-run.
    const dryRun = flags.check || flags['dry-run']

    const toolchainUpdated = this.syncToolchain(dryRun, false)
    const frameworksUpdated = this.syncFrameworks(dryRun, false)
    const exportsUpdated = await this.refreshExports(dryRun, false)
    const tablesUpdated = await this.refreshTables(dryRun, false)
    const routesUpdated = await this.refreshRoutes(dryRun, false)
    const totalUpdated =
      toolchainUpdated + frameworksUpdated + exportsUpdated + tablesUpdated + routesUpdated

    if (flags.check) {
      p.outro(
        totalUpdated > 0
          ? chalk.red(`Registry is out of sync — ${totalUpdated} update(s) needed`)
          : chalk.green('Registry is in sync'),
      )
      if (totalUpdated > 0) this.exit(1)
    } else {
      p.outro(
        dryRun
          ? chalk.yellow('Run without --dry-run to write changes')
          : totalUpdated > 0
            ? chalk.green(`Synced ${totalUpdated} update(s)`)
            : chalk.green('Registry is up to date'),
      )
    }
  }

  /**
   * Sync toolchain versions in registry.json from reference package.json files.
   *
   * @returns Number of versions updated.
   */
  private syncToolchain(dryRun: boolean, standalone = true): number {
    const spinner = p.spinner()
    spinner.start('Syncing toolchain versions...')

    const registry = getRawRegistry()
    const registryPath = getRegistryPath()
    const toolchain = registry.toolchain ?? {
      shared: {},
      api: {},
      app: {},
      moleculePackage: {},
    }

    const __dir = dirname(fileURLToPath(import.meta.url))
    const mlclDir = join(__dir, '..', '..')
    const moleculeDir = process.env.MOLECULE_PACKAGES_DIR
      ? join(process.env.MOLECULE_PACKAGES_DIR, '..')
      : join(__dir, '..', '..', '..', 'molecule')

    const mlclPkg = JSON.parse(readFileSync(join(mlclDir, 'package.json'), 'utf-8'))
    const mlclAllDeps: Record<string, string> = {
      ...mlclPkg.dependencies,
      ...mlclPkg.devDependencies,
    }

    const appFrameworkDevDeps: Record<string, string> = {}
    for (const fw of Object.values(registry.appFrameworks ?? {})) {
      const fwConfig = fw as { devDependencies?: Record<string, string> }
      Object.assign(appFrameworkDevDeps, fwConfig.devDependencies ?? {})
    }

    const moleculePackageRef = this.scanMoleculeDevDeps(
      moleculeDir,
      Object.keys(toolchain.moleculePackage ?? {}),
    )

    const sectionRefs: Record<string, Record<string, string>> = {
      shared: mlclAllDeps,
      api: mlclAllDeps,
      app: { ...mlclAllDeps, ...appFrameworkDevDeps },
      moleculePackage: moleculePackageRef,
    }

    let updated = 0
    let unchanged = 0
    let unresolved = 0
    const changes: string[] = []

    for (const [section, deps] of Object.entries(toolchain)) {
      if (typeof deps !== 'object' || deps === null) continue
      const ref = sectionRefs[section] ?? {}

      for (const [pkg, currentVersion] of Object.entries(deps as Record<string, string>)) {
        const refVersion = ref[pkg]
        if (!refVersion) {
          unresolved++
          changes.push(
            `${chalk.dim('?')} ${section}.${chalk.dim(pkg)}: ${currentVersion} ${chalk.dim('(no reference — update manually)')}`,
          )
          continue
        }
        if (refVersion !== currentVersion) {
          ;(deps as Record<string, string>)[pkg] = refVersion
          updated++
          changes.push(
            `${chalk.yellow('↑')} ${section}.${chalk.cyan(pkg)}: ${currentVersion} → ${chalk.green(refVersion)}`,
          )
        } else {
          unchanged++
        }
      }
    }

    if (!dryRun && updated > 0) {
      registry.toolchain = toolchain
      writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n', 'utf-8')
    }

    const details = changes.length > 0 ? '\n' + changes.join('\n') : ''

    spinner.stop(updated > 0 ? `Toolchain: ${updated} updated` : chalk.dim('Toolchain: up to date'))

    if (standalone) {
      p.note(
        [
          `${chalk.cyan('Registry:')}    ${registryPath}`,
          `${chalk.yellow('Updated:')}     ${updated}`,
          `${chalk.dim('Unchanged:')}   ${unchanged}`,
          unresolved > 0 ? `${chalk.dim('Unresolved:')}  ${unresolved}` : null,
          details || null,
          dryRun ? chalk.yellow('\n⚠ Dry run — no changes written') : null,
        ]
          .filter(Boolean)
          .join('\n'),
        'Toolchain Sync',
      )

      p.outro(
        dryRun
          ? chalk.yellow('Run without --dry-run to write changes')
          : updated > 0
            ? chalk.green(`Updated ${updated} toolchain version(s)`)
            : chalk.green('All toolchain versions are up to date'),
      )
    }

    return updated
  }

  /**
   * Scan molecule leaf packages and return the most common devDep version for each target dep.
   */
  private scanMoleculeDevDeps(moleculeDir: string, targetDeps: string[]): Record<string, string> {
    const packagesDir = join(moleculeDir, 'packages')
    if (!existsSync(packagesDir)) return {}

    const versionCounts: Record<string, Record<string, number>> = {}
    for (const dep of targetDeps) {
      versionCounts[dep] = {}
    }

    const scanDir = (dir: string, depth: number): void => {
      if (depth > 5) return
      try {
        const entries = readdirSync(dir, { withFileTypes: true })
        const pkgJsonPath = join(dir, 'package.json')
        if (entries.some((e) => e.name === 'package.json') && existsSync(pkgJsonPath)) {
          const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
          if (pkg.name?.startsWith('@molecule/')) {
            const devDeps = pkg.devDependencies ?? {}
            for (const dep of targetDeps) {
              if (devDeps[dep]) {
                versionCounts[dep][devDeps[dep]] = (versionCounts[dep][devDeps[dep]] ?? 0) + 1
              }
            }
          }
        }
        for (const entry of entries) {
          if (
            entry.isDirectory() &&
            !entry.name.startsWith('.') &&
            entry.name !== 'node_modules' &&
            entry.name !== 'dist'
          ) {
            scanDir(join(dir, entry.name), depth + 1)
          }
        }
      } catch (_error) {
        // safe to skip: directory may be inaccessible (permissions, broken symlink, etc.)
      }
    }

    scanDir(packagesDir, 0)

    const result: Record<string, string> = {}
    for (const dep of targetDeps) {
      const counts = versionCounts[dep]
      let maxCount = 0
      let maxVersion = ''
      for (const [version, count] of Object.entries(counts)) {
        if (count > maxCount) {
          maxCount = count
          maxVersion = version
        }
      }
      if (maxVersion) result[dep] = maxVersion
    }
    return result
  }

  /**
   * Scan molecule leaf packages and return the most common exact version
   * for each target dep, looking in both dependencies and devDependencies.
   * Skips peerDependencies (which use semver ranges) and non-exact versions.
   */
  private scanMoleculeExactDeps(moleculeDir: string, targetDeps: string[]): Record<string, string> {
    const packagesDir = join(moleculeDir, 'packages')
    if (!existsSync(packagesDir)) return {}

    const versionCounts: Record<string, Record<string, number>> = {}
    for (const dep of targetDeps) {
      versionCounts[dep] = {}
    }

    const isExactVersion = (version: string): boolean => /^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)

    const scanDir = (dir: string, depth: number): void => {
      if (depth > 5) return
      try {
        const entries = readdirSync(dir, { withFileTypes: true })
        const pkgJsonPath = join(dir, 'package.json')
        if (entries.some((e) => e.name === 'package.json') && existsSync(pkgJsonPath)) {
          const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
          if (pkg.name?.startsWith('@molecule/')) {
            const allDeps: Record<string, string> = {
              ...pkg.dependencies,
              ...pkg.devDependencies,
            }
            for (const dep of targetDeps) {
              const version = allDeps[dep]
              if (version && isExactVersion(version)) {
                versionCounts[dep][version] = (versionCounts[dep][version] ?? 0) + 1
              }
            }
          }
        }
        for (const entry of entries) {
          if (
            entry.isDirectory() &&
            !entry.name.startsWith('.') &&
            entry.name !== 'node_modules' &&
            entry.name !== 'dist'
          ) {
            scanDir(join(dir, entry.name), depth + 1)
          }
        }
      } catch (_error) {
        // safe to skip: directory may be inaccessible (permissions, broken symlink, etc.)
      }
    }

    scanDir(packagesDir, 0)

    const result: Record<string, string> = {}
    for (const dep of targetDeps) {
      const counts = versionCounts[dep]
      let maxCount = 0
      let maxVersion = ''
      for (const [version, count] of Object.entries(counts)) {
        if (count > maxCount) {
          maxCount = count
          maxVersion = version
        }
      }
      if (maxVersion) result[dep] = maxVersion
    }
    return result
  }

  /**
   * Sync framework dependency versions in registry.json from molecule package.json files.
   *
   * @returns Number of versions updated.
   */
  private syncFrameworks(dryRun: boolean, standalone = true): number {
    const spinner = p.spinner()
    spinner.start('Syncing framework versions...')

    const registry = getRawRegistry()
    const registryPath = getRegistryPath()

    const __dir = dirname(fileURLToPath(import.meta.url))
    const moleculeDir = process.env.MOLECULE_PACKAGES_DIR
      ? join(process.env.MOLECULE_PACKAGES_DIR, '..')
      : join(__dir, '..', '..', '..', 'molecule')

    const allTargetDeps = new Set<string>()
    for (const fwConfig of Object.values(registry.appFrameworks ?? {})) {
      const fw = fwConfig as {
        dependencies?: Record<string, string>
        devDependencies?: Record<string, string>
      }
      for (const dep of Object.keys(fw.dependencies ?? {})) allTargetDeps.add(dep)
      for (const dep of Object.keys(fw.devDependencies ?? {})) allTargetDeps.add(dep)
    }
    for (const fwConfig of Object.values(registry.apiFrameworks ?? {})) {
      const fw = fwConfig as {
        dependencies?: Record<string, string>
        devDependencies?: Record<string, string>
      }
      for (const dep of Object.keys(fw.dependencies ?? {})) allTargetDeps.add(dep)
      for (const dep of Object.keys(fw.devDependencies ?? {})) allTargetDeps.add(dep)
    }

    const refVersions = this.scanMoleculeExactDeps(moleculeDir, [...allTargetDeps])

    let updated = 0
    let unchanged = 0
    let unresolved = 0
    const changes: string[] = []

    const processDeps = (
      frameworkType: string,
      frameworkName: string,
      depSection: 'dependencies' | 'devDependencies',
      deps: Record<string, string>,
    ): void => {
      for (const [pkg, currentVersion] of Object.entries(deps)) {
        const refVersion = refVersions[pkg]
        const label = `${frameworkType}.${frameworkName}.${depSection}`
        if (!refVersion) {
          unresolved++
          changes.push(
            `${chalk.dim('?')} ${label}.${chalk.dim(pkg)}: ${currentVersion} ${chalk.dim('(no reference — update manually)')}`,
          )
          continue
        }
        if (refVersion !== currentVersion) {
          deps[pkg] = refVersion
          updated++
          changes.push(
            `${chalk.yellow('↑')} ${label}.${chalk.cyan(pkg)}: ${currentVersion} → ${chalk.green(refVersion)}`,
          )
        } else {
          unchanged++
        }
      }
    }

    for (const [fwName, fwConfig] of Object.entries(registry.appFrameworks ?? {})) {
      const fw = fwConfig as {
        dependencies?: Record<string, string>
        devDependencies?: Record<string, string>
      }
      if (fw.dependencies) processDeps('appFrameworks', fwName, 'dependencies', fw.dependencies)
      if (fw.devDependencies)
        processDeps('appFrameworks', fwName, 'devDependencies', fw.devDependencies)
    }

    for (const [fwName, fwConfig] of Object.entries(registry.apiFrameworks ?? {})) {
      const fw = fwConfig as {
        dependencies?: Record<string, string>
        devDependencies?: Record<string, string>
      }
      if (fw.dependencies) processDeps('apiFrameworks', fwName, 'dependencies', fw.dependencies)
      if (fw.devDependencies)
        processDeps('apiFrameworks', fwName, 'devDependencies', fw.devDependencies)
    }

    if (!dryRun && updated > 0) {
      writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n', 'utf-8')
    }

    const details = changes.length > 0 ? '\n' + changes.join('\n') : ''

    spinner.stop(
      updated > 0 ? `Frameworks: ${updated} updated` : chalk.dim('Frameworks: up to date'),
    )

    if (standalone) {
      p.note(
        [
          `${chalk.cyan('Registry:')}    ${registryPath}`,
          `${chalk.yellow('Updated:')}     ${updated}`,
          `${chalk.dim('Unchanged:')}   ${unchanged}`,
          unresolved > 0 ? `${chalk.dim('Unresolved:')}  ${unresolved}` : null,
          details || null,
          dryRun ? chalk.yellow('\n⚠ Dry run — no changes written') : null,
        ]
          .filter(Boolean)
          .join('\n'),
        'Framework Sync',
      )

      p.outro(
        dryRun
          ? chalk.yellow('Run without --dry-run to write changes')
          : updated > 0
            ? chalk.green(`Updated ${updated} framework dependency version(s)`)
            : chalk.green('All framework dependency versions are up to date'),
      )
    }

    return updated
  }

  /**
   * Scan actual TypeScript source exports for every package in the registry
   * and update the exports arrays to match reality.
   *
   * @returns Number of packages with updated exports.
   */
  private async refreshExports(dryRun: boolean, standalone = true): Promise<number> {
    const spinner = p.spinner()
    spinner.start('Scanning source exports...')

    const registry = getRawRegistry()
    const registryPath = getRegistryPath()
    const __dir = dirname(fileURLToPath(import.meta.url))
    const moleculeDir = process.env.MOLECULE_PACKAGES_DIR
      ? join(process.env.MOLECULE_PACKAGES_DIR, '..')
      : join(__dir, '..', '..', '..', 'molecule')

    const packageNames = Object.keys(registry.packages)
    const bondSetterNames = bondSetterScope(registry.packages)

    let updated = 0
    let unchanged = 0
    let failed = 0

    for (const name of packageNames) {
      const entry = registry.packages[name]
      const fullPath = join(moleculeDir, entry.path)
      const srcPath = join(fullPath, 'src')

      try {
        const scanned = await scanExports(srcPath)
        const oldExports = entry.exports ?? []

        const oldSorted = [...oldExports].sort()
        const newSorted = [...scanned].sort()

        let changed = false
        if (JSON.stringify(oldSorted) !== JSON.stringify(newSorted)) {
          entry.exports = scanned
          changed = true
        }

        // bondSetter — the setter a provider bond calls to register itself
        // (app-http → setClient, api-logger → setLogger, api-emails →
        // setTransport). Consumers used to pick it by export ORDER, which broke
        // the moment a core grew a second setter: app-http's setAuthGate made
        // every fresh scaffold shipping app-http-axios emit `setAuthGate(provider)`
        // — a TS2345 in the scaffold's own app/src/bonds/ file. Scope and rule
        // live in scanner.ts (bondSetterScope / scanBondSetter).
        //
        // Only touched when the package's `src/` is actually present: a sync run
        // in a checkout without the molecule sibling (or scoped to nothing) must
        // never ERASE values it cannot re-derive. An absent candidate in a
        // package whose source IS present does clear the field — a stale setter
        // name is a wrong import, and the legacy heuristics are the safe landing.
        if (existsSync(srcPath) && bondSetterNames.has(name)) {
          const setter = await scanBondSetter(srcPath, entry.exports ?? [])
          if (setter && entry.bondSetter !== setter) {
            entry.bondSetter = setter
            changed = true
          } else if (!setter && entry.bondSetter) {
            delete entry.bondSetter
            changed = true
          }
        }

        // sqlCapabilities — the provider/resource compatibility contract a
        // `database` provider publishes. Derived from the bond's own
        // `src/capabilities.ts` (never a hand-maintained table), so the CLI
        // preflight, the registry and the bond cannot disagree. The scan reads
        // source, not an import: the declaration carries notes the refusal text
        // shows verbatim, and a re-export (MotherDuck → DuckDB) is followed to
        // the sibling package's source.
        if (entry.category === 'database' && entry.type === 'provider' && existsSync(srcPath)) {
          const capabilities = scanSqlCapabilities(srcPath, (moduleName) => {
            const target = registry.packages[moduleName]
            return target ? join(moleculeDir, target.path, 'src') : null
          })
          if (
            capabilities &&
            JSON.stringify(entry.sqlCapabilities) !== JSON.stringify(capabilities)
          ) {
            entry.sqlCapabilities = capabilities
            changed = true
          }
        }

        // runtimeDependencies mirrors the package's OWN package.json dependencies.
        // This is the data that lets molecule-dev derive "which third-party libs does
        // molecule wrap?" (pg → api-database-postgresql, stripe → api-payments-stripe,
        // …) WITHOUT hand-curating a map — the executor's install/plan guards read it,
        // and every new bond extends the coverage automatically just by declaring its
        // deps. Previously only 12 entries were populated (hand-written); now the scan
        // keeps all of them in sync.
        try {
          const pkgJson = JSON.parse(readFileSync(join(fullPath, 'package.json'), 'utf-8')) as {
            dependencies?: Record<string, string>
            peerDependencies?: Record<string, string>
            peerDependenciesMeta?: Record<string, { optional?: boolean }>
          }
          // Peers count: a middleware bond declares its host lib (express) as a peer,
          // and that IS the third-party lib it wraps.
          const deps = [
            ...new Set([
              ...Object.keys(pkgJson.dependencies ?? {}),
              ...Object.keys(pkgJson.peerDependencies ?? {}),
            ]),
          ].sort()
          const oldDeps = [...(entry.runtimeDependencies ?? [])].sort()
          if (JSON.stringify(oldDeps) !== JSON.stringify(deps)) {
            entry.runtimeDependencies = deps
            changed = true
          }
          // REQUIRED @molecule peers, recorded in the registry so scaffolding can
          // expand the selection WITHOUT a molecule source checkout — production
          // has none, and the silent empty-peers fallback there shipped a custom
          // app whose oauth-buttons import of oauth-logos never installed
          // (preflight sandbox-boot failure, 2026-08-07). Optional peers are
          // feature add-ons and stay out, same rule as resolveTransitivePeers.
          const peerMeta = pkgJson.peerDependenciesMeta ?? {}
          const moleculePeers = Object.keys(pkgJson.peerDependencies ?? {})
            .filter((n) => n.startsWith('@molecule/') && peerMeta[n]?.optional !== true)
            .sort()
          // ALWAYS an array — an explicit [] means "scanned, no required peers",
          // which the resolver must distinguish from "field absent, never
          // scanned" (that case falls back to reading the manifest and warns).
          const oldPeers = entry.moleculePeers
          if (!oldPeers || JSON.stringify([...oldPeers].sort()) !== JSON.stringify(moleculePeers)) {
            entry.moleculePeers = moleculePeers
            changed = true
          }
        } catch (_error) {
          // safe to skip: package.json unreadable — exports scan above already
          // succeeded, so keep whatever runtimeDependencies the entry had.
        }

        if (changed) updated++
        else unchanged++
      } catch (_error) {
        // safe to skip: package has no src/ dir or scanExports failed; counted in `failed` and reported to user
        failed++
      }
    }

    if (!dryRun && updated > 0) {
      registry.packages = Object.fromEntries(
        Object.entries(registry.packages).sort(([a], [b]) => a.localeCompare(b)),
      )
      writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n', 'utf-8')
    }

    spinner.stop(updated > 0 ? `Exports: ${updated} updated` : chalk.dim('Exports: up to date'))

    if (standalone) {
      p.note(
        [
          `${chalk.cyan('Registry:')}   ${registryPath}`,
          `${chalk.yellow('Updated:')}    ${updated} packages`,
          `${chalk.dim('Unchanged:')}  ${unchanged} packages`,
          failed > 0 ? `${chalk.red('Skipped:')}    ${failed} packages (no src/)` : null,
          dryRun ? chalk.yellow('\n⚠ Dry run — no changes written') : null,
        ]
          .filter(Boolean)
          .join('\n'),
        'Export Scan Summary',
      )

      p.outro(
        dryRun
          ? chalk.yellow('Run without --dry-run to write changes')
          : updated > 0
            ? chalk.green(`Updated exports for ${updated} packages`)
            : chalk.green('All exports are up to date'),
      )
    }

    return updated
  }

  /**
   * Re-scan every package's `setup/` + `src/__setup__/` SQL and update the
   * registry `tables` and `setupSql` fields. `tables` was previously written
   * only at `mlcl init`, so it drifted: many resource packages had `__setup__`
   * SQL on disk but an empty/absent `tables` entry, which made
   * `copySqlSetupScripts()` skip their DDL — custom/assembled projects then
   * 500'd on those resource endpoints because the table was never created.
   *
   * `setupSql` carries the exact bytes of each declared file, and
   * `setupSqlVersion` the package version those bytes were read from (its own
   * `package.json`, in the same scan). The registry already distributes the table
   * METADATA; bundling the SQL itself is what lets a `--skip-install` scaffold on
   * a host with no molecule checkout copy (and preflight) the real DDL before any
   * install exists. The version tag is what makes that safe: the bundle is usable
   * ONLY by a selection that pins exactly that version, so a stale CLI cannot
   * write one release's schema beside another release's code. The two are scanned
   * from the same directory in one pass, so they cannot disagree, and a version
   * bump alone is reported as drift (a re-scan is required).
   *
   * This keeps both in sync the same way `--scan-exports` keeps `exports` in
   * sync (and lets `--check` catch future drift in CI).
   *
   * @param dryRun - When true, report changes without writing.
   * @param standalone - When true, print a standalone summary + outro.
   * @returns Number of packages whose `tables`/`setupSql` changed.
   */
  private async refreshTables(dryRun: boolean, standalone = true): Promise<number> {
    const spinner = p.spinner()
    spinner.start('Scanning SQL setup tables...')

    const registry = getRawRegistry()
    const registryPath = getRegistryPath()
    const __dir = dirname(fileURLToPath(import.meta.url))
    const moleculeDir = process.env.MOLECULE_PACKAGES_DIR
      ? join(process.env.MOLECULE_PACKAGES_DIR, '..')
      : join(__dir, '..', '..', '..', 'molecule')

    const packageNames = Object.keys(registry.packages)

    let updated = 0
    let unchanged = 0
    let failed = 0
    const held: string[] = []
    const unresolved: string[] = []

    for (const name of packageNames) {
      const entry = registry.packages[name]
      const fullPath = join(moleculeDir, entry.path)

      try {
        const scanned = await scanForTables(fullPath)
        const newTables = scanned.map((t) => ({
          name: t.name,
          sqlFile: relative(fullPath, t.sqlFile),
        }))
        const newBundle = await scanSetupSqlBundle(fullPath)
        // The bytes and the version they belong to are ONE value: a bundle is
        // only usable by a selection that pins exactly this version, so a
        // version bump without a re-scan is drift even when no byte changed.
        //
        // The decision itself is the shared pin-aware rule (`planSetupSqlEntrySync`),
        // the SAME one `registry.test.ts` applies: a package whose checkout is
        // ahead of its registry pin is HELD — kept as the pinned release
        // recorded it, never retagged from a release the pin does not name. A
        // version-only bump used to count as drift here while the test skipped
        // it, so no registry state passed both (P18 r11 review, R11-1).
        const plan = planSetupSqlEntrySync({
          name,
          entry,
          sibling: { tables: newTables, bundle: newBundle, version: readPackageVersion(fullPath) },
          pinned: getMoleculeVersion(name),
        })
        if (plan.kind === 'update') {
          entry.tables = plan.tables
          if (plan.setupSql) {
            entry.setupSql = plan.setupSql
            entry.setupSqlVersion = plan.setupSqlVersion!
          } else {
            delete entry.setupSql
            delete entry.setupSqlVersion
          }
          updated++
        } else if (plan.kind === 'in-sync') {
          unchanged++
        } else if (plan.kind === 'held') {
          held.push(plan.detail)
        } else {
          unresolved.push(plan.detail)
        }
      } catch (_error) {
        // safe to skip: package dir missing or scan failed; counted as failed
        failed++
      }
    }

    if (!dryRun && updated > 0) {
      registry.packages = Object.fromEntries(
        Object.entries(registry.packages).sort(([a], [b]) => a.localeCompare(b)),
      )
      writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n', 'utf-8')
    }

    spinner.stop(updated > 0 ? `Tables: ${updated} updated` : chalk.dim('Tables: up to date'))

    // A held package is named, never silently ignored: it is the state a
    // held/blocked/off-map release leaves, and the operator needs to see that
    // the entry was NOT re-scanned. `--check` (which runs this non-standalone)
    // must say so too.
    if (!standalone) {
      for (const detail of held) p.log.info(`Held (sibling ahead of the pin): ${detail}`)
      for (const detail of unresolved) p.log.error(detail)
    }

    if (standalone) {
      p.note(
        [
          `${chalk.cyan('Registry:')}     ${registryPath}`,
          `${chalk.yellow('Updated:')}      ${updated} packages`,
          `${chalk.dim('Unchanged:')}    ${unchanged} packages`,
          held.length > 0
            ? `${chalk.cyan('Held:')}         ${held.join('; ')} ${chalk.dim('(kept at the pin)')}`
            : null,
          unresolved.length > 0 ? `${chalk.red('Unresolved:')}   ${unresolved.join('; ')}` : null,
          failed > 0 ? `${chalk.red('Skipped:')}      ${failed} packages` : null,
          dryRun ? chalk.yellow('\n⚠ Dry run — no changes written') : null,
        ]
          .filter(Boolean)
          .join('\n'),
        'Table Scan Summary',
      )

      p.outro(
        unresolved.length > 0
          ? chalk.red(
              `${unresolved.length} package(s) cannot be synced from this checkout — see Unresolved above`,
            )
          : dryRun
            ? chalk.yellow('Run without --dry-run to write changes')
            : updated > 0
              ? chalk.green(`Updated tables for ${updated} packages`)
              : chalk.green('All tables are up to date'),
      )
    }

    if (unresolved.length > 0 && !dryRun) this.exit(1)

    // Unresolved counts as drift for `--check` (the caller sums this value),
    // and as work this command cannot do in write mode (it exits non-zero).
    return updated + unresolved.length
  }

  /**
   * Re-derive every route-scanned package's declarative `routes` from its
   * `src/routes.ts` (via the scanner, which also drops middlewares that are not
   * `requestHandlerMap` keys) and update the registry `routes` field.
   *
   * `routes` was written once at `mlcl init` and only ever hand-edited after
   * that, so it drifted three ways: a stale hand edit (project's `authenticate`
   * — the GLOBAL auth marker, not a handler-map key — emitted as
   * `Project.authenticate`, TS2339 in every scaffold and an undefined handler
   * at boot), routes added to a resource later (device `pushPublicKey`, user
   * `billingPortal`), and 47 of 53 route-eligible entries carrying no `routes`
   * at all. That last one is the production bug: `scanPackage` prefers the
   * registry copy and falls back to scanning `src/`, but a published package
   * ships only `dist/`, so an npm-installed resource with no registry routes
   * scaffolds with NO routes. The registry has to carry them — the same way it
   * carries `exports`, `tables` and `moleculePeers` — and this keeps them in
   * sync so `--check` and the pre-commit drift gate can catch the next drift.
   *
   * Scope is exactly what `scanPackage` scans routes for (`ROUTE_SCANNED_TYPES`);
   * a package with no `src/` is skipped. An entry whose scan yields nothing
   * loses the field rather than gaining an empty array.
   *
   * @param dryRun - When true, report changes without writing.
   * @param standalone - When true, print a standalone summary + outro.
   * @returns Number of packages whose `routes` changed.
   */
  private async refreshRoutes(dryRun: boolean, standalone = true): Promise<number> {
    const spinner = p.spinner()
    spinner.start('Scanning resource routes...')

    const registry = getRawRegistry()
    const registryPath = getRegistryPath()
    const __dir = dirname(fileURLToPath(import.meta.url))
    const moleculeDir = process.env.MOLECULE_PACKAGES_DIR
      ? join(process.env.MOLECULE_PACKAGES_DIR, '..')
      : join(__dir, '..', '..', '..', 'molecule')

    let updated = 0
    let unchanged = 0
    let skipped = 0
    const changes: string[] = []

    for (const [name, entry] of Object.entries(registry.packages)) {
      if (!ROUTE_SCANNED_TYPES.has(entry.type)) continue
      const srcPath = join(moleculeDir, entry.path, 'src')
      if (!existsSync(srcPath)) {
        skipped++
        continue
      }

      const scanned = await scanForRoutes(srcPath)
      if (routesSignature(entry.routes) === routesSignature(scanned)) {
        unchanged++
        continue
      }

      changes.push(
        `${chalk.yellow('↻')} ${chalk.cyan(name)}: ${entry.routes?.length ?? 0} → ${scanned.length} route(s)`,
      )
      if (scanned.length > 0) entry.routes = scanned
      else delete entry.routes
      updated++
    }

    if (!dryRun && updated > 0) {
      registry.packages = Object.fromEntries(
        Object.entries(registry.packages).sort(([a], [b]) => a.localeCompare(b)),
      )
      writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n', 'utf-8')
    }

    spinner.stop(updated > 0 ? `Routes: ${updated} updated` : chalk.dim('Routes: up to date'))

    if (standalone) {
      p.note(
        [
          `${chalk.cyan('Registry:')}   ${registryPath}`,
          `${chalk.yellow('Updated:')}    ${updated} packages`,
          `${chalk.dim('Unchanged:')}  ${unchanged} packages`,
          skipped > 0 ? `${chalk.red('Skipped:')}    ${skipped} packages (no src/)` : null,
          changes.length > 0 ? '\n' + changes.join('\n') : null,
          dryRun ? chalk.yellow('\n⚠ Dry run — no changes written') : null,
        ]
          .filter(Boolean)
          .join('\n'),
        'Route Scan Summary',
      )

      p.outro(
        dryRun
          ? chalk.yellow('Run without --dry-run to write changes')
          : updated > 0
            ? chalk.green(`Updated routes for ${updated} packages`)
            : chalk.green('All routes are up to date'),
      )
    }

    return updated
  }

  /**
   * Validate intentHints across the registry:
   * - Each hint must be lowercase (letters, digits, spaces, hyphens, slashes).
   * - No package may declare more than 8 hints.
   * - A hint may not appear on more than one package unless ALL owning packages
   *   share the same multi-select category (legitimate multi-provider case).
   * - COVERAGE IS BLOCKING for matcher-eligible packages: every core, provider,
   *   feature, resource, and middleware package must have at least one hint. A
   *   package with zero hints is INVISIBLE to molecule-dev's intent matcher
   *   (matchIntents skips it), so the executor is never told it exists — this is
   *   how a live 2FA build hand-rolled an express+db bootstrap while api-database
   *   and 116 other CORE packages had no hints at all. Exempt: locale bonds
   *   (auto-included companions), ui.hidden, and the framework/infrastructure
   *   types (selected by framework config / auto-wiring, never by intent).
   *
   * @returns Number of blocking violations (0 = pass).
   */
  private checkIntentHints(): number {
    const spinner = p.spinner()
    spinner.start('Validating intent hints...')

    const registry = getRawRegistry()
    const packages = registry.packages

    const violations: string[] = []
    const hintOwners = new Map<string, string[]>()

    let hintedCount = 0
    let totalHints = 0
    const uncovered: string[] = []
    // Types never surfaced by intent: framework bindings, wiring infrastructure,
    // and locale bonds (auto-included companions).
    const exemptTypes = new Set(['framework', 'infrastructure', 'locales'])

    for (const [name, entry] of Object.entries(packages)) {
      const hints = entry.intentHints ?? []

      if (hints.length === 0) {
        const isHidden = entry.ui?.hidden === true
        if (!isHidden && !exemptTypes.has(entry.type)) {
          uncovered.push(name)
          violations.push(
            `${chalk.red('✗')} ${chalk.cyan(name)}: no intentHints — matcher-invisible ` +
              `(type ${entry.type}); author hints or mark ui.hidden`,
          )
        }
        continue
      }

      hintedCount++
      totalHints += hints.length

      if (hints.length > 8) {
        violations.push(`${chalk.red('✗')} ${chalk.cyan(name)}: ${hints.length} hints (cap is 8)`)
      }

      for (const hint of hints) {
        if (hint !== hint.toLowerCase() || !/^[\da-z][\d a-z/-]*[\da-z]$/.test(hint)) {
          violations.push(
            `${chalk.red('✗')} ${chalk.cyan(name)}: invalid hint ${chalk.dim(JSON.stringify(hint))} ` +
              `(lowercase letters/digits/spaces/-//only)`,
          )
        }
        const owners = hintOwners.get(hint) ?? []
        owners.push(name)
        hintOwners.set(hint, owners)
      }
    }

    for (const [hint, owners] of hintOwners) {
      if (owners.length < 2) continue
      const categories = new Set(owners.map((n) => packages[n].category))
      const allMultiSelect = owners.every((n) => packages[n].multiSelect === true)
      if (categories.size === 1 && allMultiSelect) continue
      violations.push(
        `${chalk.red('✗')} duplicate hint ${chalk.dim(JSON.stringify(hint))} on: ${owners.join(', ')}`,
      )
    }

    spinner.stop(
      violations.length > 0
        ? chalk.red(`Intent hints: ${violations.length} violation(s)`)
        : chalk.dim(`Intent hints: ${hintedCount} package(s) hinted, ${totalHints} total hint(s)`),
    )

    p.note(
      [
        `${chalk.cyan('Hinted packages:')}   ${hintedCount}`,
        `${chalk.cyan('Total hints:')}       ${totalHints}`,
        `${chalk.cyan('Uncovered (blocking):')} ${uncovered.length}`,
        violations.length > 0 ? '\n' + violations.join('\n') : null,
      ]
        .filter(Boolean)
        .join('\n'),
      'Intent Hint Validation',
    )

    p.outro(
      violations.length > 0
        ? chalk.red(`${violations.length} violation(s) — fix before merging`)
        : chalk.green('Intent hints valid'),
    )

    return violations.length
  }
}
