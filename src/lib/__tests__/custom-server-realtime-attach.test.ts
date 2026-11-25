/**
 * The custom API servers mlcl writes (the injector's generated `server.ts` and
 * `templates/api/server.ts.tpl`) attach a deferred realtime provider to their own HTTP server.
 * Both used to start listening first, then import `@molecule/api-realtime` inside a catch-all:
 * a realtime package that was installed but failed to load (a missing file in its build) booted a
 * server with no realtime and no error, and a provider was attached to a server already taking
 * connections. These run each server under Node against a fixture `node_modules`.
 */
import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../ai.js', () => ({
  isAIAvailable: () => false,
  generateCode: vi.fn(async () => '// AI-generated router'),
}))

import { synthesizeProjectFiles } from '../injector.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const express = dirname(createRequire(import.meta.url).resolve('express/package.json'))

/** The realtime package a fixture installs, if any. */
type Realtime = 'absent' | 'broken' | 'provider'

const REALTIME_SOURCE: Record<Exclude<Realtime, 'absent'>, string> = {
  // An installed package whose build lost a file: its import fails with ERR_MODULE_NOT_FOUND.
  broken: `import './dist/missing.js'\nexport const hasProvider = () => false\n`,
  // A bonded provider that records whether the server was already listening when attached.
  provider: [
    `import { writeFileSync } from 'node:fs'`,
    `export const hasProvider = () => true`,
    `export const getProvider = () => ({`,
    `  attachHttpServer(server) {`,
    `    writeFileSync('attached.json', JSON.stringify({ listening: server.listening }))`,
    `    process.exit(0)`,
    `  },`,
    `})`,
    ``,
  ].join('\n'),
}

async function freePort(): Promise<number> {
  const server = net.createServer()
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
  const { port } = server.address() as net.AddressInfo
  await new Promise<void>((done) => server.close(() => done()))
  return port
}

async function generatedServer(): Promise<string> {
  const files = await synthesizeProjectFiles([], [], '/unused-project', undefined, 'express')
  const server = files.find((file) => file.targetPath.endsWith('/src/server.ts'))
  expect(server).toBeDefined()
  return String(server!.content)
}

const SOURCES: Array<[string, () => Promise<string>]> = [
  ['the generated server', generatedServer],
  ['the base server template', () => readFile(join(repo, 'templates/api/server.ts.tpl'), 'utf8')],
]

/**
 * Run a server source with `realtime` installed (or not). Its bonds end the process 1.5 s after
 * boot, so a server that starts exits 0 on its own.
 */
async function runServer(
  source: string,
  realtime: Realtime,
): Promise<SpawnSyncReturns<string> & { attached: { listening: boolean } | null }> {
  const root = await mkdtemp(join(tmpdir(), 'custom-server-realtime-'))
  try {
    await writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module' }))
    await mkdir(join(root, 'node_modules', '@molecule'), { recursive: true })
    await symlink(express, join(root, 'node_modules', 'express'), 'dir')
    if (realtime !== 'absent') {
      const pkg = join(root, 'node_modules', '@molecule', 'api-realtime')
      await mkdir(pkg)
      await writeFile(
        join(pkg, 'package.json'),
        JSON.stringify({ name: '@molecule/api-realtime', type: 'module', exports: './index.js' }),
      )
      await writeFile(join(pkg, 'index.js'), REALTIME_SOURCE[realtime])
    }
    await mkdir(join(root, 'bonds'))
    await writeFile(
      join(root, 'bonds', 'index.js'),
      'export async function setupBonds() { setTimeout(() => process.exit(0), 1500) }\n',
    )
    await mkdir(join(root, 'App'))
    await writeFile(
      join(root, 'App', 'router.js'),
      "import express from 'express'\nexport const router = express.Router()\n",
    )
    await writeFile(
      join(root, 'server.js'),
      ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      }).outputText,
    )
    const result = spawnSync(process.execPath, ['server.js'], {
      cwd: root,
      encoding: 'utf8',
      timeout: 10_000,
      env: { ...process.env, NODE_OPTIONS: '', PORT: String(await freePort()), HTTPS: '' },
    })
    const attached = await readFile(join(root, 'attached.json'), 'utf8').catch(() => null)
    return {
      ...result,
      attached: attached ? (JSON.parse(attached) as { listening: boolean }) : null,
    }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

describe.each(SOURCES)('%s and an optional realtime package', (_label, source) => {
  it('stops startup when an installed realtime package fails to load', async () => {
    // OLD MUSTFAIL: the catch-all read the failure as "not installed", and the server booted
    // without realtime (exit 0 from the bonds' timer, nothing on stderr).
    const result = await runServer(await source(), 'broken')
    expect(result.error).toBeUndefined()
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('dist/missing.js')
  }, 20_000)

  it('attaches a bonded provider before the server listens', async () => {
    // OLD MUSTFAIL: the server listened first and imported the package after, so connections
    // were accepted before the realtime routes existed.
    const result = await runServer(await source(), 'provider')
    expect(result.error).toBeUndefined()
    expect(result.attached).toEqual({ listening: false })
  }, 20_000)

  it('counterexample: boots without realtime when the package is not installed', async () => {
    const result = await runServer(await source(), 'absent')
    expect(result.error).toBeUndefined()
    expect(result.stderr).toBe('')
    expect(result.stdout).toMatch(/(?:Server running|server) on port \d+/)
    expect(result.status).toBe(0)
  }, 20_000)
})
