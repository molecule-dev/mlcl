import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

import { createJWTAuthClient } from '@molecule/app-auth'
import { createAuthPlugin, useAuth } from '@molecule/app-vue'

import { buildCapabilityMap, renderCapabilityMap } from '../capability-map.js'
import { synthesizeAppProjectFiles } from '../injector.js'
import { getRawRegistry, loadRegistry } from '../registry.js'
import { addPackages, createAppProject, ensureAgentsMd } from '../scaffold.js'

const registry = getRawRegistry()
let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'framework-capability-'))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('framework-scoped session guidance', () => {
  it('delivers Vue session instructions through the real bare app scaffold', async () => {
    await createAppProject(root, 'directory-app', 'vue')
    await addPackages(root, ['@molecule/app-auth', '@molecule/app-vue'])
    const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
    const packages = Object.keys(manifest.dependencies)
    for (const file of synthesizeAppProjectFiles([], packages, root, loadRegistry())) {
      if (!file.content) continue
      await mkdir(join(file.targetPath, '..'), { recursive: true })
      await writeFile(file.targetPath, file.content)
    }
    await ensureAgentsMd(root, packages)
    expect(manifest.dependencies['@molecule/app-vue']).toBeDefined()
    expect(manifest.dependencies['@molecule/app-react']).toBeUndefined()
    for (const relative of ['AGENTS.md', 'src/bonds/auth-default.ts', 'src/config.ts']) {
      const content = await readFile(join(root, relative), 'utf8')
      expect(content, relative).not.toContain('@molecule/app-react')
      expect(content, relative).not.toContain('AuthProvider')
    }
    for (const relative of ['AGENTS.md', 'src/bonds/auth-default.ts']) {
      const content = await readFile(join(root, relative), 'utf8')
      expect(content, relative).toContain('`useAuth()` from `@molecule/app-vue`')
      expect(content, relative).toContain('state.value.status')
      expect(content, relative).toContain('createAuthPlugin')
    }
  })

  it('marks copied session state as a second store in a non-flagship React bond', async () => {
    await createAppProject(root, 'directory-app', 'react')
    await addPackages(root, ['@molecule/app-auth', '@molecule/app-react'])
    const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
    const files = synthesizeAppProjectFiles(
      [],
      Object.keys(manifest.dependencies),
      root,
      loadRegistry(),
    )
    const auth = files.find((file) => file.targetPath === join(root, 'src/bonds/auth-default.ts'))
    expect(auth?.content).toContain('Sharing `tokenKey`')
    expect(auth?.content).toContain('copied user/status')
    expect(auth?.content).toContain('view/debug adapters read the bonded client')
    expect(auth?.content).toContain('`useAuth()` from `@molecule/app-react`')

    const index = files.find((file) => file.targetPath === join(root, 'src/bonds/index.ts'))
    expect(index).toBeDefined()
    expect(index?.content).not.toContain('Sharing `tokenKey`')
  })

  it('renders a directory account through the installed Vue binding', async () => {
    interface DirectoryAccount {
      handle: string
    }
    const client = createJWTAuthClient<DirectoryAccount>({ storage: 'memory', autoRefresh: false })
    client.setSession({ accessToken: 'session-1', user: { handle: 'reader-1' } })
    const app = createSSRApp({
      setup() {
        const { state, user } = useAuth<DirectoryAccount>()
        return () => h('p', `${state.value.status}:${user.value?.handle}`)
      },
    })
    app.use(createAuthPlugin(client))
    expect(await renderToString(app)).toBe('<p>authenticated:reader-1</p>')
    client.destroy()
  })

  it.each([
    ['@molecule/app-react', 'useAuth'],
    ['@molecule/app-vue', 'useAuth'],
    ['@molecule/app-svelte', 'createAuthStores'],
    ['@molecule/app-solid', 'createAuth'],
    ['@molecule/app-angular', 'MoleculeAuthService'],
    ['@molecule/app-react-native', 'useAuth'],
  ])('uses the declared %s binding and an exported session API', (binding, symbol) => {
    const map = renderCapabilityMap(
      buildCapabilityMap(registry, [
        { name: '@molecule/app-auth', workspace: 'app' },
        { name: binding, workspace: 'app' },
      ]),
    )
    expect(map).toContain(symbol)
    expect(map).toContain(binding)
    if (!binding.includes('react')) expect(map).not.toContain('@molecule/app-react')
    expect(registry.packages[binding]!.exports).toContain(
      symbol === 'useAuth' && binding.endsWith('native') ? '*' : symbol,
    )
  })

  it('keeps framework guidance in its declaring workspace', () => {
    const map = renderCapabilityMap(
      buildCapabilityMap(registry, [
        { name: '@molecule/app-auth', workspace: 'app' },
        { name: '@molecule/app-vue', workspace: 'app' },
        { name: '@molecule/app-react', workspace: 'api' },
      ]),
    )
    expect(map).toContain('@molecule/app-vue')
    expect(map).not.toContain('@molecule/app-react')
  })
})

describe('framework-scoped HTTP guidance', () => {
  it.each([
    ['Vue', ['@molecule/app-vue']],
    ['no framework', []],
  ])('keeps HTTP guidance framework-neutral with %s', (_label, framework) => {
    const text = renderCapabilityMap(
      buildCapabilityMap(registry, [
        { name: '@molecule/app-http', workspace: 'app' },
        ...framework.map((name) => ({ name, workspace: 'app' })),
      ]),
    )
    expect(text).toContain('withCredentials: true')
    expect(text).toContain('setAuthTokenSource')
    expect(text).toContain('setAuthGate')
    expect(text).not.toContain('@molecule/app-bonds-default-react')
    expect(text).not.toContain('createDefaultHttpClientWithAuthBearer')
  })

  it('adds React composition only when its default binding is declared', () => {
    const text = renderCapabilityMap(
      buildCapabilityMap(registry, [
        { name: '@molecule/app-http', workspace: 'app' },
        { name: '@molecule/app-react', workspace: 'app' },
        { name: '@molecule/app-bonds-default-react', workspace: 'app' },
      ]),
    )
    expect(text).toContain('setAuthTokenSource')
    expect(text).toContain('createDefaultHttpClientWithAuthBearer')
    expect(text).toContain('@molecule/app-bonds-default-react')
  })
})

describe('shared auth guidance stays API neutral', () => {
  it('sweeps registry decision guidance and embedded setup comments too', () => {
    const text = Object.values(registry.packages)
      .flatMap((entry) => [
        ...(entry.defaultBondSetup?.header ?? []),
        ...(entry.decisionGuide?.configuration ?? []),
        ...(entry.intentHints ?? []),
        entry.description,
        ...Object.values(entry.setupSql ?? {}),
      ])
      .join('\n')
    expect(text).not.toMatch(
      new RegExp(
        ['Real' + 'World', 'jwt' + 'Token', 'con' + 'duit', 'followed user'].join('|'),
        'i',
      ),
    )
  })

  it('sweeps every flagship config comment and the authored shared config', async () => {
    const templates = join(import.meta.dirname, '../../../templates')
    const files = [join(templates, 'app/shared/config.ts.tpl')]
    for (const name of await readdir(join(templates, 'apps'))) {
      const path = join(templates, 'apps', name, 'app/src/config.ts')
      try {
        await readFile(path)
        files.push(path)
      } catch (_error) {
        /* non-app template */
      }
    }
    expect(files.length).toBeGreaterThan(150)
    const forbidden = new RegExp(
      ['Real' + 'World', 'jwt' + 'Token', 'con' + 'duit', 'followed user'].join('|'),
      'i',
    )
    for (const file of files) {
      const source = await readFile(file, 'utf8')
      const comments = source.match(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g)?.join('\n') ?? ''
      expect(comments, file).not.toMatch(forbidden)
    }
  })
})
