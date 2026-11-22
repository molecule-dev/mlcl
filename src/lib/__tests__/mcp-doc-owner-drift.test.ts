/**
 * The MCP package's package-doc modules are generated copies of mlcl's (`src/lib/package-doc-*.ts`):
 * `mcp/` builds and deploys alone, so it cannot import the CLI. A committed copy that differs from
 * the generator's output means a change reached `mlcl docs` and not the MCP tools, or the reverse.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

describe('MCP package-doc copies', () => {
  it('match their owners in src/lib', async () => {
    const { DOC_MODULES, docModulePaths, renderGeneratedDocModule } = (await import(
      join(MLCL_ROOT, 'scripts', 'generate-mcp-package-docs.mjs')
    )) as {
      DOC_MODULES: string[]
      docModulePaths: (file: string) => { owner: string; generated: string }
      renderGeneratedDocModule: (file: string, source: string) => string
    }
    expect(DOC_MODULES.length).toBe(3)
    for (const file of DOC_MODULES) {
      const { owner, generated } = docModulePaths(file)
      expect(
        readFileSync(generated, 'utf8'),
        `run node scripts/generate-mcp-package-docs.mjs (${file})`,
      ).toBe(renderGeneratedDocModule(file, readFileSync(owner, 'utf8')))
    }
  })
})
