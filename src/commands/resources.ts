import { relative, resolve } from 'node:path'

import { Command, Flags } from '@oclif/core'

import { writeAppResourceModule } from '../lib/app-resource-modules.js'
import { readDeclaredPackages, resourceModuleCallsFromSource } from '../lib/capability-map.js'
import { writeContractResourceModules } from '../lib/contract-resource-modules.js'
import { getRawRegistry } from '../lib/registry.js'

/**
 * Write app resource clients from a declared API package or OpenAPI contract.
 *
 * Run it once the contract exists (a supplied OpenAPI file, or one the project keeps) and again
 * whenever it changes. The generated block in the app's scaffold ESLint config records
 * the covered routes and requires the generated files. App edits to clients are preserved.
 */
export default class Resources extends Command {
  static override description =
    'Generate typed app resource clients from a declared API package or an OpenAPI contract'

  static override examples = [
    '<%= config.bin %> resources --package @molecule/api-resource-project',
    '<%= config.bin %> resources --contract specs/openapi.yml',
    '<%= config.bin %> resources --contract api/openapi.json --project ./my-app --json',
  ]

  static override flags = {
    contract: Flags.string({
      char: 'c',
      description: 'The OpenAPI 3 file (YAML or JSON), relative to the project',
      exactlyOne: ['contract', 'package'],
    }),
    package: Flags.string({
      description: 'The declared API resource package the app needs a client for',
      exactlyOne: ['contract', 'package'],
    }),
    project: Flags.string({
      char: 'p',
      description: 'The project root (default: the current directory)',
      default: '.',
    }),
    json: Flags.boolean({ description: 'Output machine-readable JSON', default: false }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Resources)
    const projectRoot = resolve(flags.project)
    const registry = getRawRegistry()
    const declared = await readDeclaredPackages(projectRoot)
    const result =
      flags.contract !== undefined
        ? await writeContractResourceModules(
            projectRoot,
            // Keep the contract path portable, including files beside the project.
            relative(projectRoot, resolve(projectRoot, flags.contract)),
            registry,
            declared,
          )
        : {
            ...(await writeAppResourceModule(projectRoot, registry, declared, flags.package!)),
            removed: [],
            skipped: [],
          }
    const summary = {
      written: result.written.map((module) => {
        const calls = resourceModuleCallsFromSource(module.path, module.source)
        return {
          path: module.path,
          resource: module.exportName,
          export: calls.find((name) => name.startsWith('use')) ?? calls[0],
          calls,
          type: module.typeName,
          covers: module.operations,
          ...('view' in module && module.view ? { view: module.view.path } : {}),
        }
      }),
      removed: result.removed,
      kept: result.kept,
      skipped: result.skipped,
      ...(result.reason ? { reason: result.reason } : {}),
    }
    if (flags.json) {
      this.log(JSON.stringify(summary, null, 2))
    } else {
      for (const module of summary.written) {
        this.log(`wrote ${module.path} (${module.resource}: ${module.covers.join(', ')})`)
        if (module.view) this.log(`record view at ${module.view}`)
      }
      for (const path of summary.removed) this.log(`removed ${path} (no longer in the contract)`)
      for (const path of summary.kept) this.log(`kept existing ${path}`)
      for (const skip of summary.skipped) this.log(`no module for ${skip.path}: ${skip.reason}`)
      if (result.reason) this.log(`nothing generated: ${result.reason}`)
    }
    if (result.reason) this.exit(1)
  }
}
