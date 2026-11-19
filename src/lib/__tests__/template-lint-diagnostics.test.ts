import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

/** Run the real gate with one inventory workspace and a controlled ESLint executable. */
function lintResult(
  program: string,
  report = false,
): SpawnSyncReturns<string> & { paths?: unknown } {
  const root = mkdtempSync(join(tmpdir(), 'template-lint-diagnostics-'))
  roots.push(root)
  const cli = join(root, 'mlcl')
  const app = join(cli, 'templates/apps/stockroom/app')
  mkdirSync(join(app, 'src'), { recursive: true })
  mkdirSync(join(cli, 'templates/shared'), { recursive: true })
  mkdirSync(join(cli, 'scripts'), { recursive: true })
  mkdirSync(join(root, 'dependencies/.bin'), { recursive: true })
  symlinkSync(join(root, 'dependencies'), join(cli, 'node_modules'), 'dir')
  writeFileSync(join(app, 'src/stock.ts'), 'export const quantity = 1\n')
  writeFileSync(join(app, 'eslint.config.js'), 'export default []\n')
  writeFileSync(join(cli, 'templates/shared/eslint.config.js.tpl'), 'export default []\n')
  writeFileSync(join(root, 'dependencies/.bin/eslint'), `#!${process.execPath}\n${program}\n`, {
    mode: 0o755,
  })
  const script = join(cli, 'scripts/verify-template-lint.mjs')
  copyFileSync(join(import.meta.dirname, '../../../scripts/verify-template-lint.mjs'), script)
  const diagnostics = join(root, 'diagnostics.json')
  const args = report ? [script, `--diagnostics-file=${diagnostics}`] : [script]
  const result = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 20_000 })
  return { ...result, paths: report ? JSON.parse(readFileSync(diagnostics, 'utf8')) : undefined }
}

describe('template lint reports the native failure it received', () => {
  it('names a silent ESLint process failure instead of diagnosing dirty source', () => {
    const result = lintResult('process.exitCode = 2')
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('tooling failure')
    expect(result.stderr).toContain('ESLint exited with code 2')
    expect(result.stderr).not.toContain('dirty template')
    expect(result.stderr).not.toContain('Re-run with --fix')
  }, 30_000)

  it('retains the actual source diagnostic and its autofix guidance', () => {
    const result = lintResult(
      `console.log(JSON.stringify([{
        filePath: process.cwd() + '/src/stock.ts',
        messages: [{ line: 4, column: 2, severity: 2, message: 'Unused stock variable' }],
      }])); process.exitCode = 1`,
    )
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('src/stock.ts 4:2 error Unused stock variable')
    expect(result.stderr).toContain('Re-run with --fix')
  }, 30_000)

  it('keeps a clean workspace green', () => {
    const result = lintResult('process.exitCode = 0')
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('1 workspaces, 0 problems')
  }, 30_000)

  it('reports a tooling failure without a file to the cron', () => {
    const result = lintResult('process.exitCode = 2', true)
    expect(result.status).toBe(1)
    expect(result.paths).toEqual([null])
  }, 30_000)
})
