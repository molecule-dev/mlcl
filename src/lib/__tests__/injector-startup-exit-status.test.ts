import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { synthesizeProjectFiles } from '../injector.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const modules = dirname(dirname(createRequire(import.meta.url).resolve('express/package.json')))

async function generatedServer(): Promise<string> {
  const files = await synthesizeProjectFiles([], [], '/unused-project', undefined, 'express')
  const server = files.find((file) => file.targetPath.endsWith('/src/server.ts'))
  expect(server).toBeDefined()
  return String(server!.content)
}

async function runServer(source: string, bonds: string): Promise<ReturnType<typeof spawnSync>> {
  const root = await mkdtemp(join(tmpdir(), 'startup-exit-status-'))
  try {
    await mkdir(join(root, 'bonds'))
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ type: 'module', scripts: { start: 'node server.js' } }),
    )
    // The directory that actually holds `express` (hoisted to the workspace root in the
    // polyrepo checkout, local to mlcl in a standalone clone).
    await symlink(modules, join(root, 'node_modules'), 'dir')
    await writeFile(
      join(root, 'server.js'),
      ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      }).outputText,
    )
    await writeFile(join(root, 'bonds/index.js'), bonds)
    return spawnSync('npm', ['run', 'start'], {
      cwd: root,
      encoding: 'utf8',
      timeout: 5000,
      env: { ...process.env, NODE_OPTIONS: '' },
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

describe('generated API fatal error exit status', () => {
  it('npm start reports failure for a rejected boot with a missing-package stack', async () => {
    const result = await runServer(
      await generatedServer(),
      'export async function setupBonds() { await import("missing-startup-provider") }',
    )
    expect(result.error).toBeUndefined()
    expect(String(result.stderr)).toContain('ERR_MODULE_NOT_FOUND')
    expect(String(result.stderr)).toContain('/bonds/index.js')
    expect(result.status).toBe(1)
  }, 15_000)

  it('reports an uncaught callback failure as a failure', async () => {
    const source = (await generatedServer()).replace(
      / {2}create\(\)/,
      '  setTimeout(() => { throw new Error("callback failed") }, 0)',
    )
    const result = await runServer(source, 'export async function setupBonds() {}')
    expect(result.error).toBeUndefined()
    expect(String(result.stderr)).toContain('callback failed')
    expect(result.status).toBe(1)
  }, 15_000)

  it('keeps a handled rejection successful', async () => {
    const source = (await generatedServer()).replace(
      / {2}create\(\)/,
      '  Promise.reject(new Error("handled")).catch(() => {})',
    )
    const result = await runServer(source, 'export async function setupBonds() {}')
    expect(result.error).toBeUndefined()
    expect(result.status).toBe(0)
    expect(String(result.stderr)).not.toContain('handled')
  }, 15_000)

  it.each(['podcast', 'online-store', 'property-listing', 'photo-sharing'])(
    '%s keeps Node fatal behavior',
    async (template) => {
      const source = await readFile(
        join(repo, 'templates/apps', template, 'api/src/server.ts'),
        'utf8',
      )
      const ast = ts.createSourceFile('server.ts', source, ts.ScriptTarget.ES2022, true)
      const handlers = ast.statements
        .filter((statement) => statement.getText(ast).startsWith('process.on('))
        .map((statement) => statement.getText(ast))
        .join('\n')
      const result = await runServer(
        `const logger = console\n${handlers}\nimport("missing-startup-provider")`,
        '',
      )
      expect(result.error).toBeUndefined()
      expect(String(result.stderr)).toContain('ERR_MODULE_NOT_FOUND')
      expect(result.status).toBe(1)
    },
    15_000,
  )

  it('the base server template keeps Node fatal behavior', async () => {
    const source = await readFile(join(repo, 'templates/api/server.ts.tpl'), 'utf8')
    const ast = ts.createSourceFile('server.ts', source, ts.ScriptTarget.ES2022, true)
    const handlers = ast.statements
      .filter((statement) => statement.getText(ast).startsWith('process.on('))
      .map((statement) => statement.getText(ast))
      .join('\n')
    const result = await runServer(
      `const appendFileSync = () => {}\nconst ERROR_LOG = "unused"\n${handlers}\nimport("missing-startup-provider")`,
      '',
    )
    expect(result.error).toBeUndefined()
    expect(String(result.stderr)).toContain('ERR_MODULE_NOT_FOUND')
    expect(result.status).toBe(1)
  }, 15_000)
})
