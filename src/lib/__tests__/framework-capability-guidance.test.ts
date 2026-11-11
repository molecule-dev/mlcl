import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createElement } from 'react'
import { renderToString as renderReactToString } from 'react-dom/server'
import { Route, Routes } from 'react-router'
import * as ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

import { createJWTAuthClient } from '@molecule/app-auth'
import {
  MemoryRouter,
  useConsumedSearchParam,
  useListRoute,
  useMoleculeQuery,
} from '@molecule/app-routing-react-router'
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

describe('framework-scoped URL list guidance', () => {
  const routing = (bindings: string[], workspace = 'app'): string =>
    renderCapabilityMap(
      buildCapabilityMap(registry, [
        { name: '@molecule/app-routing', workspace: 'app' },
        ...bindings.map((name) => ({ name, workspace })),
      ]),
    )

  it('names useListRoute when React Router is the declared binding', () => {
    const text = routing(['@molecule/app-routing-react-router'])
    expect(text).toContain('`const pages = useListRoute()`')
    expect(text).toContain('`requiresAuth: true`')
    expect(text).toContain('`canLoad`')
    expect(text).toContain('return to page one when a filter or tab changes')
    // The hook's default page size is 20; a page that shows another count must say so, or the
    // request offset, the request limit and the footer disagree.
    expect(text).toContain('Pass `pageSize` (default 20)')
    expect(text).toContain('`offset` is `(page - 1) * pageSize`')
    expect(registry.packages['@molecule/app-routing-react-router']!.exports).toEqual(
      expect.arrayContaining(['useListRoute', 'ListRouteOptions', 'ListRouteResult']),
    )
  })

  it.each([
    ['Vue Router', ['@molecule/app-routing-vue-router']],
    ['Next', ['@molecule/app-routing-next']],
    ['no binding', []],
  ])('keeps URL list guidance framework-neutral with %s', (_label, bindings) => {
    const text = routing(bindings)
    expect(text).toContain('keep the page, filters and tab in the URL only')
    expect(text).toContain('an unavailable session is not signed out')
    expect(text).not.toContain('useListRoute')
    expect(text).not.toContain('@molecule/app-routing-react-router')
  })

  it('keeps React Router guidance in its declaring workspace', () => {
    expect(routing(['@molecule/app-routing-react-router'], 'api')).not.toContain('useListRoute')
  })

  it('names the binding hooks for one-off query values and address credentials', () => {
    const text = routing(['@molecule/app-routing-react-router'])
    expect(text).toContain('`useMoleculeQuery()`')
    expect(text).toContain('`useConsumedSearchParam(name)`')
    expect(registry.packages['@molecule/app-routing-react-router']!.exports).toEqual(
      expect.arrayContaining(['useMoleculeQuery', 'useConsumedSearchParam']),
    )
  })

  it.each([
    ['/category/books', '/category/:slug', '/category/books?page=2', { slug: 'books' }],
    ['/?view=mine', '/', '/?view=mine&page=2', {}],
  ])('delivers an executable minimal pagination recipe on %s', (url, path, href, params) => {
    const text = routing(['@molecule/app-routing-react-router'])
    const minimal = text.match(/`(const pages = useListRoute\(\))`/)?.[1]
    expect(minimal, 'pagination must not require filters or selections').toBeDefined()
    expect(text).toContain('`filters` and `selections` are optional')
    expect(text).toContain(href)
    expect(text).toContain('page last')
    const recipe = new Function('useListRoute', minimal + '; return pages') as (
      hook: typeof useListRoute,
    ) => ReturnType<typeof useListRoute>
    let actual: ReturnType<typeof useListRoute> | undefined
    function Page(): null {
      actual = recipe(useListRoute)
      return null
    }
    renderReactToString(
      createElement(
        MemoryRouter,
        { initialEntries: [url] },
        createElement(Routes, null, createElement(Route, { path, element: createElement(Page) })),
      ),
    )
    expect(actual?.href({ page: 2 })).toBe(href)
    expect(actual?.params).toEqual(params)
    expect(actual?.filters).toEqual({})
    expect(actual?.selection).toBeUndefined()
  })

  it('delivers type-correct protected list guidance for an app-owned session state', () => {
    const text = routing(['@molecule/app-routing-react-router'])
    const status = text.match(/`(const routeAuthStatus = [^`]+)`/)?.[1]
    const list = text.match(/`(const list = useListRoute\([^`]+)`/)?.[1]
    expect(
      status,
      'the custom-session adapter must decide restore/failure before signed out',
    ).toBeDefined()
    expect(list, 'the note must carry a complete selections/auth example').toBeDefined()
    const file = join(process.cwd(), 'routing-guidance-example.tsx')
    const code = [
      "import { useListRoute } from '@molecule/app-routing-react-router'",
      'declare const restoring: boolean; declare const failed: boolean; declare const user: unknown',
      status,
      list,
      'if (list.canLoad) { const request = { page: list.page, offset: list.offset }; void request }',
    ].join('\n')
    const options: ts.CompilerOptions = {
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      jsx: ts.JsxEmit.ReactJSX,
    }
    const host = ts.createCompilerHost(options)
    const read = host.getSourceFile.bind(host)
    host.getSourceFile = (name, version, onError, fresh) =>
      name === file
        ? ts.createSourceFile(file, code, version, true, ts.ScriptKind.TSX)
        : read(name, version, onError, fresh)
    const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([file], options, host))
    expect(
      diagnostics.map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      ),
    ).toEqual([])
    const adapt = new Function(
      'restoring',
      'failed',
      'user',
      status + '; return routeAuthStatus',
    ) as (restoring: boolean, failed: boolean, user: unknown) => string
    expect(adapt(true, false, null)).toBe('loading')
    expect(adapt(false, true, null)).toBe('unavailable')
    expect(adapt(false, false, {})).toBe('authenticated')
    expect(adapt(false, false, null)).toBe('unauthenticated')

    const recipe = new Function('useListRoute', 'routeAuthStatus', list + '; return list') as (
      hook: typeof useListRoute,
      status: string,
    ) => ReturnType<typeof useListRoute>
    let actual: ReturnType<typeof useListRoute> | undefined
    function Orders(): null {
      actual = recipe(useListRoute, 'authenticated')
      return null
    }
    renderReactToString(
      createElement(
        MemoryRouter,
        { initialEntries: ['/orders?view=mine&page=4'] },
        createElement(Orders),
      ),
    )
    expect(actual?.href({ page: 2 })).toBe('/orders?view=mine&page=2')
    expect(actual?.href({ selection: 'all' })).toBe('/orders')
  })

  it('delivers query and consumed-token recipes inside an ordinary router', () => {
    const text = routing(['@molecule/app-routing-react-router'])
    expect(text).not.toContain('requires `MoleculeRouterProvider`')
    const credential = text.match(/`(const \[token\] = useConsumedSearchParam\('[^']+'\))`/)?.[1]
    expect(
      credential,
      'a tuple must be destructured before submitting the credential',
    ).toBeDefined()
    const consume = new Function('useConsumedSearchParam', credential + '; return token') as (
      hook: typeof useConsumedSearchParam,
    ) => string
    const QueryPage = (): ReturnType<typeof createElement> => {
      const query = useMoleculeQuery()
      const token = consume(useConsumedSearchParam)
      return createElement('span', null, `${query.q}:${token}`)
    }
    const rendered = renderReactToString(
      createElement(
        MemoryRouter,
        { initialEntries: ['/search?q=orders&token=callback-value'] },
        createElement(QueryPage),
      ),
    )
    expect(rendered).toContain('orders:callback-value')
  })
})

describe('framework-scoped optimistic value guidance', () => {
  const state = (bindings: string[], workspace = 'app'): string =>
    renderCapabilityMap(
      buildCapabilityMap(registry, [
        { name: '@molecule/app-state', workspace: 'app' },
        ...bindings.map((name) => ({ name, workspace })),
      ]),
    )

  it('names useOptimisticValue when the React binding is declared', () => {
    const text = state(['@molecule/app-react'])
    expect(text).toContain('`createOptimisticValue({ value, commit, equals })`')
    expect(text).toContain(
      '`useOptimisticValue({ value, commit, equals })` from `@molecule/app-react`',
    )
    expect(text).toContain('Never ignore a tap or disable the control while a save is pending')
    expect(registry.packages['@molecule/app-state']!.exports).toEqual(
      expect.arrayContaining([
        'createOptimisticValue',
        'OptimisticValue',
        'OptimisticValueOptions',
      ]),
    )
    expect(registry.packages['@molecule/app-react']!.exports).toEqual(
      expect.arrayContaining(['useOptimisticValue', 'UseOptimisticValueResult']),
    )
  })

  it.each([
    ['Vue', ['@molecule/app-vue']],
    ['no framework', []],
  ])('keeps optimistic value guidance framework-neutral with %s', (_label, bindings) => {
    const text = state(bindings)
    expect(text).toContain('`createOptimisticValue({ value, commit, equals })`')
    expect(text).not.toContain('useOptimisticValue')
    expect(text).not.toContain('@molecule/app-react')
  })

  it('keeps React guidance in its declaring workspace', () => {
    expect(state(['@molecule/app-react'], 'api')).not.toContain('useOptimisticValue')
  })

  it('exposes the optimistic button recipe only when its UI binding is installed', () => {
    const text = state(['@molecule/app-react', '@molecule/app-ui-react'])
    expect(text).toContain('<OptimisticToggleButton')
    expect(text).toContain('value={record.enabled}')
    expect(text).toContain(
      'commit={async (desired) => (await saveEnabled(record.id, desired)).enabled}',
    )
    expect(registry.packages['@molecule/app-ui-react']!.exports).toContain('OptimisticToggleButton')
    expect(state(['@molecule/app-react'])).not.toContain('<OptimisticToggleButton')
    expect(state(['@molecule/app-ui-react'], 'api')).not.toContain('<OptimisticToggleButton')
  })
})

describe('shared auth guidance stays API neutral', () => {
  it('sweeps registry decision guidance and embedded setup comments too', () => {
    const text = Object.values(registry.packages)
      .flatMap((entry) => [
        ...(entry.defaultBondSetup?.header ?? []),
        ...(entry.decisionGuide?.configuration ?? []),
        ...Object.values(entry.decisionGuide?.bindingGuidance ?? {}).flat(),
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
