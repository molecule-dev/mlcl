import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'

const ai = vi.hoisted(() => ({ enabled: false }))
vi.mock('../ai.js', () => ({
  isAIAvailable: () => ai.enabled,
  generateCode: vi.fn(async () => '// AI-generated router'),
}))

import { generateCode } from '../ai.js'
import { synthesizeProjectFiles } from '../injector.js'
import { createApiProject } from '../scaffold.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const modules = dirname(dirname(createRequire(import.meta.url).resolve('express/package.json')))

async function generatedServer(): Promise<string> {
  const files = await synthesizeProjectFiles([], [], '/unused-project', undefined, 'express')
  const server = files.find((file) => file.targetPath.endsWith('/src/server.ts'))
  expect(server).toBeDefined()
  return String(server!.content)
}

async function runServer(
  source: string,
  bonds: string,
  unwritableLog = false,
): Promise<ReturnType<typeof spawnSync> & { errorLog: string }> {
  const root = await mkdtemp(join(tmpdir(), 'startup-exit-status-'))
  try {
    await mkdir(join(root, 'bonds'))
    if (unwritableLog) await mkdir(join(root, '.api-errors.log'))
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ type: 'module', scripts: { start: 'node server.js' } }),
    )
    // The directory that actually holds `express` (hoisted to the workspace root in the
    // polyrepo checkout, local to mlcl in a standalone clone).
    await symlink(modules, join(root, 'node_modules'), 'dir')
    await writeFile(
      join(root, 'server.js'),
      ts.transpileModule(
        source.replaceAll('/workspace/.api-errors.log', join(root, '.api-errors.log')),
        {
          compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
        },
      ).outputText,
    )
    await writeFile(join(root, 'bonds/index.js'), bonds)
    const result = spawnSync('npm', ['run', 'start'], {
      cwd: root,
      encoding: 'utf8',
      timeout: 5000,
      env: { ...process.env, NODE_OPTIONS: '' },
    })
    return {
      ...result,
      errorLog: await readFile(join(root, '.api-errors.log'), 'utf8').catch(() => ''),
    }
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
    expect(result.errorLog).toContain('missing-startup-provider')
    expect(result.errorLog).toContain('/bonds/index.js')
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
    expect(result.errorLog).toContain('callback failed')
  }, 15_000)

  it('keeps fatal logging and exit status when AI routing is enabled', async () => {
    ai.enabled = true
    try {
      vi.mocked(generateCode).mockClear()
      const result = await runServer(
        await generatedServer(),
        'export async function setupBonds() { await import("missing-ai-startup-provider") }',
      )
      expect(generateCode).toHaveBeenCalled()
      expect(result.error).toBeUndefined()
      expect(result.status).toBe(1)
      expect(result.errorLog).toContain('missing-ai-startup-provider')
    } finally {
      ai.enabled = false
    }
  }, 15_000)

  it('still fails when the IDE log cannot be written', async () => {
    const result = await runServer(
      await generatedServer(),
      'export async function setupBonds() { await import("missing-startup-provider") }',
      true,
    )
    expect(result.error).toBeUndefined()
    expect(result.status).toBe(1)
    expect(String(result.stderr)).toContain('missing-startup-provider')
    expect(String(result.stderr)).not.toContain('EISDIR')
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
    expect(result.errorLog).toBe('')
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
        .filter((statement) => /^(?:process\.on\(|const ERROR_LOG\b)/.test(statement.getText(ast)))
        .map((statement) => statement.getText(ast))
        .join('\n')
      const result = await runServer(
        `import { appendFileSync } from 'node:fs'\nconst logger = console\n${handlers}\nimport("missing-startup-provider")`,
        '',
      )
      expect(result.error).toBeUndefined()
      expect(String(result.stderr)).toContain('ERR_MODULE_NOT_FOUND')
      expect(result.status).toBe(1)
      expect(result.errorLog).toContain('missing-startup-provider')
    },
    15_000,
  )

  it('the base server template keeps Node fatal behavior', async () => {
    const source = await readFile(join(repo, 'templates/api/server.ts.tpl'), 'utf8')
    const ast = ts.createSourceFile('server.ts', source, ts.ScriptTarget.ES2022, true)
    const handlers = ast.statements
      .filter((statement) => /^(?:process\.on\(|const ERROR_LOG\b)/.test(statement.getText(ast)))
      .map((statement) => statement.getText(ast))
      .join('\n')
    const result = await runServer(
      `import { appendFileSync } from 'node:fs'\n${handlers}\nimport("missing-startup-provider")`,
      '',
    )
    expect(result.error).toBeUndefined()
    expect(String(result.stderr)).toContain('ERR_MODULE_NOT_FOUND')
    expect(result.status).toBe(1)
    expect(result.errorLog).toContain('missing-startup-provider')
  }, 15_000)

  it('the API scaffold writes a server that reports a rejected boot to the IDE', async () => {
    const root = await mkdtemp(join(tmpdir(), 'scaffold-startup-exit-'))
    try {
      await createApiProject(root, 'startup-fixture')
      const result = await runServer(
        await readFile(join(root, 'src/server.ts'), 'utf8'),
        'export async function setupBonds() { await import("missing-scaffold-provider") }',
      )
      expect(result.error).toBeUndefined()
      expect(result.status).toBe(1)
      expect(result.errorLog).toContain('missing-scaffold-provider')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }, 15_000)
})
