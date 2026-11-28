/**
 * The custom API server mlcl writes serves HTTPS for local development when `HTTPS` is set,
 * with a self-signed certificate from the optional CommonJS package `pem`. It loaded `pem` with a
 * bare `require`, which an ES module (every scaffolded API is `"type": "module"`) does not have,
 * so setting `HTTPS` threw "require is not defined" from mlcl 2.0.0 on (four flagship servers
 * carried the same copy; found by a blind review of harness smoke run 4, 2026-11-28). These run
 * the generated server under Node against a fixture `node_modules`, and hold every template's ES
 * module sources to `createRequire`.
 */
import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
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

/**
 * Run the generated server with `HTTPS=1`, with a fixture `pem` installed or not. The fixture is
 * CommonJS, as the real package is, and refuses to make a certificate, so a server that loaded it
 * stops with that refusal.
 */
async function runHttpsServer(pem: boolean): Promise<SpawnSyncReturns<string>> {
  const root = await mkdtemp(join(tmpdir(), 'custom-server-https-'))
  try {
    await writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module' }))
    await mkdir(join(root, 'node_modules'))
    await symlink(express, join(root, 'node_modules', 'express'), 'dir')
    if (pem) {
      const pkg = join(root, 'node_modules', 'pem')
      await mkdir(pkg)
      await writeFile(join(pkg, 'package.json'), JSON.stringify({ name: 'pem', main: 'index.js' }))
      await writeFile(
        join(pkg, 'index.js'),
        "exports.createCertificate = (_options, callback) => callback(new Error('fixture pem was called'))\n",
      )
    }
    await mkdir(join(root, 'bonds'))
    await writeFile(join(root, 'bonds', 'index.js'), 'export async function setupBonds() {}\n')
    await mkdir(join(root, 'App'))
    await writeFile(
      join(root, 'App', 'router.js'),
      "import express from 'express'\nexport const router = express.Router()\n",
    )
    await writeFile(
      join(root, 'server.js'),
      ts.transpileModule(await generatedServer(), {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      }).outputText,
    )
    return spawnSync(process.execPath, ['server.js'], {
      cwd: root,
      encoding: 'utf8',
      timeout: 10_000,
      env: { ...process.env, NODE_OPTIONS: '', PORT: String(await freePort()), HTTPS: '1' },
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

describe('the generated server with HTTPS set', () => {
  it('loads the CommonJS pem package from its ES module', async () => {
    // OLD MUSTFAIL: "ReferenceError: require is not defined in ES module scope".
    const result = await runHttpsServer(true)
    expect(result.error).toBeUndefined()
    expect(result.stderr).not.toContain('require is not defined')
    expect(result.stderr).toContain('fixture pem was called')
    expect(result.status).not.toBe(0)
  }, 20_000)

  it('names the package to install when pem is missing', async () => {
    const result = await runHttpsServer(false)
    expect(result.error).toBeUndefined()
    expect(result.stderr).toContain('Install it with `npm install pem`, or unset HTTPS.')
    expect(result.status).not.toBe(0)
  }, 20_000)
})

describe('template ES module sources', () => {
  it('load CommonJS through createRequire, never a bare require', () => {
    const offenders: string[] = []
    const visit = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '__tests__') continue
        const path = join(dir, entry.name)
        if (entry.isDirectory()) visit(path)
        else if (/\.(ts|tsx)(\.tpl)?$/.test(entry.name)) {
          const lines = readFileSync(path, 'utf8').split('\n')
          lines.forEach((line, index) => {
            if (/(^|[^.\w])require\(/.test(line) && !line.trimStart().startsWith('//'))
              offenders.push(`${path.slice(repo.length + 1)}:${index + 1}`)
          })
        }
      }
    }
    const apps = join(repo, 'templates', 'apps')
    for (const app of readdirSync(apps))
      for (const side of ['api', 'app']) {
        const src = join(apps, app, side, 'src')
        try {
          visit(src)
        } catch (_error) {
          continue // A template without that side.
        }
      }
    visit(join(repo, 'templates', 'api'))
    expect(offenders).toEqual([])
  })
})
