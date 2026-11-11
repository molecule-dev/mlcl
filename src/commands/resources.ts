import { relative, resolve } from 'node:path'

import { Command, Flags } from '@oclif/core'

import { readDeclaredPackages } from '../lib/capability-map.js'
import { writeContractResourceModules } from '../lib/contract-resource-modules.js'
import { getRawRegistry } from '../lib/registry.js'

/**
 * Write the app's resource modules from the API contract the project serves.
 *
 * Run it once the contract exists (a supplied OpenAPI file, or one the project keeps) and again
 * whenever it changes: files this command wrote and nobody edited are rewritten or removed with
 * the contract, and an edited file is left as it is.
 */
export default class Resources extends Command {
  static override description =
    'Generate typed app resource modules (list, detail, writes on the shared query cache) from an OpenAPI contract'

  static override examples = [
    '<%= config.bin %> resources --contract specs/openapi.yml',
    '<%= config.bin %> resources --contract api/openapi.json --project ./my-app --json',
  ]

  static override flags = {
    contract: Flags.string({
      char: 'c',
      description: 'The OpenAPI 3 file (YAML or JSON), relative to the project',
      required: true,
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
    const contract = resolve(projectRoot, flags.contract)
    const result = await writeContractResourceModules(
      projectRoot,
      // Named from the project, also when it sits beside it (`../fixtures/openapi.yml`): the
      // generated files repeat this path, and it has to mean the same on every machine.
      relative(projectRoot, contract),
      getRawRegistry(),
      await readDeclaredPackages(projectRoot),
    )
    const summary = {
      written: result.written.map((module) => ({
        path: module.path,
        export: module.exportName,
        type: module.typeName,
        covers: module.operations,
      })),
      removed: result.removed,
      kept: result.kept,
      skipped: result.skipped,
      ...(result.reason ? { reason: result.reason } : {}),
    }
    if (flags.json) {
      this.log(JSON.stringify(summary, null, 2))
    } else {
      for (const module of summary.written)
        this.log(`wrote ${module.path} (${module.export}: ${module.covers.join(', ')})`)
      for (const path of summary.removed) this.log(`removed ${path} (no longer in the contract)`)
      for (const path of summary.kept) this.log(`kept ${path} (edited since it was generated)`)
      for (const skip of summary.skipped) this.log(`no module for ${skip.path}: ${skip.reason}`)
      if (result.reason) this.log(`nothing generated: ${result.reason}`)
    }
    if (result.reason) this.exit(1)
  }
}
