/** The rule as a flagship's own config and a custom scaffold deliver it, through mlcl check. */
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'

import { ESLint } from 'eslint'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { runCheckLocal } from '../check.js'
import { getMoleculeVersion } from '../registry.js'
import { createAppProject } from '../scaffold.js'

const require = createRequire(import.meta.url)
const execFileAsync = promisify(execFile)
const shared = new URL('../../../templates/shared/', import.meta.url)
const ruleId = 'molecule-local/no-empty-interactive-target'
// This functional case runs two native CLI checks; its deadline covers both budgets.
const nativeCheckBudgetMs = 60_000
let root: string

// The generated project resolves its lint tooling from the link in its parent directory.
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'empty-interactive-target-'))
  await symlink(
    dirname(dirname(require.resolve('eslint/package.json'))),
    join(root, 'node_modules'),
  )
})

afterAll(async () => rm(root, { recursive: true, force: true }))

const control = (markup: string): string =>
  `export function Control({ act, label, props }) {\n  return ${markup}\n}`

describe('empty interactive targets', () => {
  it('checks a representative non-benchmark template through its own lint config', async () => {
    const app = new URL('../../../templates/apps/note-taking/app/', import.meta.url)
    const templateEngine = new ESLint({
      cwd: new URL('.', app).pathname,
      overrideConfigFile: new URL('eslint.config.js', app).pathname,
      overrideConfig: {
        languageOptions: { parserOptions: { tsconfigRootDir: new URL('.', app).pathname } },
      },
    })
    const results = await templateEngine.lintFiles(['src/**/*.{ts,tsx}'])
    expect(results.length).toBeGreaterThan(10)
    expect(
      results.flatMap((result) =>
        result.messages.filter((row) => row.fatal || row.ruleId === ruleId),
      ),
    ).toEqual([])
    const [mutant] = await templateEngine.lintText(
      control('<i role="button" onClick={act} className="missing-custom-glyph" />'),
      { filePath: new URL('src/Control.tsx', app).pathname },
    )
    expect(mutant.messages.filter((row) => row.ruleId === ruleId)).toHaveLength(1)
  })

  it(
    'delivers the rule to a custom scaffold and mlcl check rejects it before a browser walk',
    async () => {
      const app = join(root, 'generated-app')
      await createAppProject(app, 'equipment-console', 'react')
      // The rule comes from @molecule/eslint-config, which the scaffold's config imports and its
      // manifest declares at the registry pin; no rule module is copied into the project.
      expect(await readFile(join(app, 'eslint.config.js'), 'utf8')).toBe(
        await readFile(new URL('eslint.config.js.tpl', shared), 'utf8'),
      )
      expect(existsSync(join(app, 'eslint-rules'))).toBe(false)
      const manifest = JSON.parse(await readFile(join(app, 'package.json'), 'utf8'))
      expect(manifest.devDependencies['@molecule/eslint-config']).toBe(
        getMoleculeVersion('@molecule/eslint-config'),
      )

      await execFileAsync('git', ['init', '-q', app])
      await execFileAsync('git', ['add', '--', '.'], { cwd: app })
      const source =
        'export function Control({ act }: { act: () => void }) { return <i role="button" tabIndex={0} aria-label="Dismiss" className="missing-glyph" onClick={act} onKeyDown={act} /> }\n'
      await writeFile(join(app, 'src/Control.tsx'), source)
      const result = await runCheckLocal(
        app,
        { steps: ['lint'] },
        { budgetMs: nativeCheckBudgetMs },
      )
      expect('error' in result).toBe(false)
      if ('error' in result) throw new Error(result.error)
      expect(result.ok, JSON.stringify(result)).toBe(false)
      expect(result.report).toContain('FAIL lint')
      expect(result.results[0].errors.join('\n')).toContain('drawing')
      expect(result.results[0].errors.join('\n')).toContain('Control.tsx')
      await writeFile(
        join(app, 'src/Control.tsx'),
        source.replace(/<i .*\/>/, '<button onClick={act}>Dismiss</button>'),
      )
      const fixed = await runCheckLocal(app, { steps: ['lint'] }, { budgetMs: nativeCheckBudgetMs })
      expect('error' in fixed).toBe(false)
      if ('error' in fixed) throw new Error(fixed.error)
      expect(fixed.ok).toBe(true)
    },
    2 * nativeCheckBudgetMs + 10_000,
  )
})
