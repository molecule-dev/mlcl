// @vitest-environment jsdom
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { JSDOM } from 'jsdom'
import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthClient } from '@molecule/app-auth'

import { synthesizeAppProjectFiles } from '../injector.js'
import { loadRegistry } from '../registry.js'

const packageRoot = join(import.meta.dirname, '../../..')
let root: string
let client: AuthClient | undefined
let browser: JSDOM
beforeEach(async () => {
  // Inside the package, so Node and TypeScript resolve the generated bond's imports
  // as the package does: from its own node_modules or a workspace's hoisted ones.
  await mkdir(join(packageRoot, '.tmp'), { recursive: true })
  root = await mkdtemp(join(packageRoot, '.tmp', 'auth-bond-storage-'))
  browser = new JSDOM('', { url: 'https://storage.test' })
  vi.stubGlobal('window', browser.window)
  vi.stubGlobal('document', browser.window.document)
  vi.stubGlobal('localStorage', browser.window.localStorage)
})
afterEach(async () => {
  client?.destroy()
  client = undefined
  browser.window.close()
  vi.unstubAllGlobals()
  await rm(root, { recursive: true, force: true })
})

async function generatedClient(storage?: 'memory'): Promise<AuthClient> {
  const files = synthesizeAppProjectFiles([], ['@molecule/app-auth'], root, loadRegistry())
  const bond = files.find((file) => file.targetPath.endsWith('bonds/auth-default.ts'))!
  await mkdir(join(root, 'src/bonds'), { recursive: true })
  await writeFile(
    join(root, 'src/config.js'),
    `export const authConfig = { autoRefresh: false, ${storage ? "storage: 'memory'" : ''} }`,
  )
  const compiled = ts.transpileModule(bond.content!, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText
  const path = join(root, 'src/bonds/auth-default.js')
  await writeFile(path, compiled)
  const module = (await import(pathToFileURL(path).href)) as { authClient: AuthClient }
  client = module.authClient
  return client
}

describe('generated auth bond respects storage configuration', () => {
  it('keeps an explicit cookie-session memory store out of Web Storage', async () => {
    const auth = await generatedClient('memory')
    auth.setSession({ accessToken: 'session-memory', user: { id: 'account-1' } })
    expect(auth.getAccessToken()).toBe('session-memory')
    expect(localStorage.length).toBe(0)
  })

  it('typechecks a generated bond when the inferred config has no storage property', async () => {
    const files = synthesizeAppProjectFiles([], ['@molecule/app-auth'], root, loadRegistry())
    const bond = files.find((file) => file.targetPath.endsWith('bonds/auth-default.ts'))!
    await mkdir(join(root, 'src/bonds'), { recursive: true })
    await writeFile(join(root, 'src/config.ts'), 'export const authConfig = { autoRefresh: false }')
    await writeFile(bond.targetPath, bond.content!)
    const program = ts.createProgram([bond.targetPath], {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      noEmit: true,
      skipLibCheck: true,
      strict: true,
      types: [],
    })
    const diagnostics = ts
      .getPreEmitDiagnostics(program)
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    expect(diagnostics).toEqual([])
  })

  it('retains browser persistence when no storage choice is configured', async () => {
    const auth = await generatedClient()
    auth.setSession({ accessToken: 'session-browser', user: { id: 'account-1' } })
    expect(localStorage.getItem('molecule:auth:accessToken')).toBe('session-browser')
  })
})
