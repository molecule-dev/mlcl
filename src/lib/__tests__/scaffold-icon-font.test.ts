/** The registry icon-font rule as a custom scaffold delivers it, through mlcl check. */
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'

import { afterEach, describe, expect, it } from 'vitest'

import { runCheckLocal } from '../check.js'
import { createAppProject } from '../scaffold.js'

const require = createRequire(import.meta.url)
const execFileAsync = promisify(execFile)
const roots: string[] = []
// This functional case runs two native CLI checks; its deadline covers both budgets.
const nativeCheckBudgetMs = 60_000
const icon =
  '<i className="ion-trash-a" role="button" tabIndex={0} aria-label="Remove equipment" onClick={act} onKeyDown={act} />'
const component = (markup = icon): string =>
  `export function Control({ act }: { act: () => void }) {\n  return ${markup}\n}\n`
const bond = `import { setFont } from '@molecule/app-fonts'\nimport { font } from '@molecule/app-fonts-ionicons'\nsetFont(font)\n`

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('registry icon fonts in the scaffold lint contract', () => {
  it(
    'ships the same error to a custom non-benchmark project and mlcl check',
    async () => {
      const root = await mkdtemp(join(tmpdir(), 'scaffold-icon-font-'))
      roots.push(root)
      await symlink(
        dirname(dirname(require.resolve('eslint/package.json'))),
        join(root, 'node_modules'),
      )
      const app = join(root, 'equipment-console')
      await createAppProject(app, 'equipment-console', 'react')
      await execFileAsync('git', ['init', '-q', app])
      await execFileAsync('git', ['add', '--', '.'], { cwd: app })
      await writeFile(
        join(app, 'src/Control.tsx'),
        component(
          '<button onClick={act}><i className="ion-trash-a" aria-hidden="true" />Remove equipment</button>',
        ),
      )
      const result = await runCheckLocal(
        app,
        { steps: ['lint'] },
        { budgetMs: nativeCheckBudgetMs },
      )
      expect('error' in result).toBe(false)
      if ('error' in result) throw new Error(result.error)
      expect(result.ok).toBe(false)
      expect(result.report).toContain('FAIL lint')
      expect(result.results[0].errors.join('\n')).toContain('@molecule/app-fonts-ionicons')
      await writeFile(join(app, 'src/bonds/icon-font.ts'), bond)
      const index = join(app, 'src/bonds/index.ts')
      await writeFile(index, "import './icon-font.js'\n\n" + (await readFile(index, 'utf8')))
      const fixed = await runCheckLocal(app, { steps: ['lint'] }, { budgetMs: nativeCheckBudgetMs })
      expect('error' in fixed).toBe(false)
      if ('error' in fixed) throw new Error(fixed.error)
      expect(fixed.ok, fixed.report).toBe(true)
    },
    2 * nativeCheckBudgetMs + 10_000,
  )
})
