/** Exercise the verification surface every harness receives, not a prompt. */
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { ESLint, type Linter } from 'eslint'
import { afterEach, describe, expect, it } from 'vitest'

import { runCheckLocal } from '../check.js'
import { synthesizeAppProjectFiles } from '../injector.js'
import { loadRegistry } from '../registry.js'
import {
  addPackages,
  copyTemplateInstance,
  createApiProject,
  createAppProject,
  readTemplateSetupSqlVersions,
} from '../scaffold.js'

const ROOT = join(import.meta.dirname, '../../..')
const RULE = 'molecule-local/prefer-declared-clients'
const execFileAsync = promisify(execFile)
const dirs: string[] = []

async function directory(): Promise<string> {
  const temp = process.env.TMPDIR ?? join(ROOT, '.tmp')
  await mkdir(temp, { recursive: true })
  const dir = await mkdtemp(join(temp, 'declared-clients-'))
  dirs.push(dir)
  return dir
}

afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true })
})

async function findings(app: string, source: string, rule = RULE): Promise<Linter.LintMessage[]> {
  const config = join(
    app,
    existsSync(join(app, 'eslint.config.js')) ? 'eslint.config.js' : 'eslint.config.mjs',
  )
  expect(existsSync(config), 'the scaffold must deliver its verification config').toBe(true)
  const eslint = new ESLint({
    cwd: app,
    overrideConfigFile: config,
    overrideConfig: { languageOptions: { parserOptions: { tsconfigRootDir: app } } },
  })
  const [result] = await eslint.lintText(source, { filePath: join(app, 'src/stock.tsx') })
  expect(result.messages.filter((message) => message.fatal)).toEqual([])
  return result.messages.filter((message) => message.ruleId === rule)
}

const localClients = `import { createContext, useState } from 'react'
const SessionContext = createContext(null)
export function SessionProvider() {
  const [user, setUser] = useState(null)
  return <SessionContext.Provider value={{user, setUser}} />
}
export function saveToken(token: string) { localStorage.setItem('stock.token', token) }
export function loadStock() {
  const token = localStorage.getItem('stock.token')
  return fetch('/stock/items', {headers: {Authorization: 'Token ' + token}})
}
`

describe('declared auth and HTTP reuse in generated verification', () => {
  it('the generated React check keeps writes to the configured session key in the auth bond', async () => {
    const app = join(await directory(), 'app')
    await createAppProject(app, 'member-directory', 'react')
    await addPackages(app, ['@molecule/app-auth', '@molecule/app-http'])
    const bond = synthesizeAppProjectFiles([], ['@molecule/app-auth'], app, loadRegistry()).find(
      (file) => file.targetPath.endsWith('bonds/auth-default.ts'),
    )
    if (!bond || bond.content === undefined) throw new Error('Missing generated auth bond')
    await writeFile(bond.targetPath, bond.content)
    const config = join(app, 'src/config.ts')
    await writeFile(
      config,
      (await readFile(config, 'utf8')).replace(
        'export const authConfig = {',
        "export const authConfig = {\n  tokenKey: 'directory.access',",
      ),
    )
    const manual = `import {authClient} from './bonds/auth-default.js'
const TOKEN_KEY = 'directory.access'
function publish(value: string | null) { authClient.setAccessToken(value) }
export function persist(value: string | null) {
  if (value) window.localStorage.setItem(TOKEN_KEY, value)
  else window.localStorage.removeItem(TOKEN_KEY)
  publish(value)
}`
    const rows = await findings(app, manual)
    expect(rows.map(({ line, messageId, severity }) => [line, messageId, severity])).toEqual([
      [5, 'credential', 2],
      [6, 'credential', 2],
    ])
    expect(rows[0]?.message).toContain('getClient().getAccessToken()')
    expect(
      await findings(app, manual.replace('directory.access', 'directory.import-service')),
    ).toEqual([])
    expect(
      await findings(
        app,
        `import {authClient} from './bonds/auth-default.js'
      export const debug = () => authClient.getAccessToken()
      export const keyExists = () => !!localStorage.getItem('directory.access')`,
      ),
    ).toEqual([])
  })

  it.each(['react', 'vue'])(
    'the generated %s native check rejects a custom store feeding its bonded transport',
    async (framework) => {
      const app = join(await directory(), 'app')
      await createAppProject(app, 'warehouse', framework)
      await addPackages(app, ['@molecule/app-auth', '@molecule/app-http'])
      const source = `import {getClient} from '@molecule/app-http'
export function save(value: string) {
  localStorage.setItem('warehouse-current', value)
  getClient().setAuthToken(value)
}`
      const rows = await findings(app, source)
      expect(rows.map((row) => row.messageId)).toEqual(['credential', 'clientCredential'])
      expect(rows[0].severity).toBe(2)
      expect(rows[0].line).toBe(3)
      expect(
        await findings(
          app,
          `import { getClient as getAuth } from '@molecule/app-auth'
import { setAuthTokenSource } from '@molecule/app-http'
setAuthTokenSource(() => getAuth().getAccessToken())`,
        ),
      ).toEqual([])
    },
  )

  it('the generated React lint rejects a document navigation and accepts the router hook', async () => {
    const app = join(await directory(), 'app')
    await createAppProject(app, 'warehouse', 'react')
    const rule = 'molecule-local/no-in-app-document-navigation'
    const rows = await findings(app, "window.location.assign('/warehouse')", rule)
    expect(rows.map(({ messageId, severity }) => [messageId, severity])).toEqual([
      ['documentNavigation', 2],
    ])
    expect(rows[0].message).toContain('useNavigate()')
    const fixed = `import { useNavigate } from 'react-router'
export function Warehouse() {
  const navigate = useNavigate()
  return <button type="button" onClick={() => navigate('/warehouse')}>Open</button>
}`
    expect(await findings(app, fixed, rule)).toEqual([])
    expect(await findings(app, "location.href = '/api/download'", rule)).toEqual([])
  })

  it.each(['react', 'vue'])(
    'the generated %s inventory accepts a separate account through the package client',
    async (framework) => {
      const app = join(await directory(), 'app')
      await createAppProject(app, 'stockroom', framework)
      await addPackages(app, ['@molecule/app-http'])
      const scoped = `import {createFetchClient} from '@molecule/app-http'
        const operator = createFetchClient({baseURL:'/api',authScheme:'Token'})
        export function seedStock(token: string) {
          operator.setAuthToken(token)
          return operator.post('/stock', {name:'Paper'})
        }`
      expect(await findings(app, scoped)).toEqual([])
      expect(
        (await findings(app, scoped.replace('operator.setAuthToken(token)', ''))).map(
          (message) => message.messageId,
        ),
      ).toEqual(['unbonded'])
    },
  )

  it.each(['react', 'vue', 'react-native'])(
    'the generated %s account config rejects the legacy adapter parameter trap',
    async (framework) => {
      const app = join(await directory(), 'app')
      await createAppProject(app, 'member-directory', framework)
      await addPackages(app, ['@molecule/app-auth'])
      const broken = `import type {AuthClientConfig} from '@molecule/app-auth'
export const authConfig: AuthClientConfig = {
  registerEndpoint: '/members',
  requestBody: data => ({member: data.email}),
}`
      const result = await findings(app, broken)
      expect(result.map((row) => row.messageId)).toEqual(['authRequestBodyOrder'])
      expect(result[0].severity).toBe(2)
      expect(result[0].line).toBe(4)
      expect(await findings(app, broken.replace('requestBody:', 'mapRequestBody:'))).toEqual([])
      expect(
        await findings(
          app,
          broken.replace(
            'data => ({member: data.email})',
            '(kind, payload) => ({member: payload})',
          ),
        ),
      ).toEqual([])
    },
  )

  it('a generated warehouse control rejects an unchanged optimistic update', async () => {
    const app = join(await directory(), 'app')
    await createAppProject(app, 'warehouse', 'react')
    await addPackages(app, ['@molecule/app-react'])
    const broken = `import {useOptimisticValue} from '@molecule/app-react'
      export function WarehouseSwitch({record}) {
        const saved = useOptimisticValue({value: record, commit: save})
        return <button onClick={() => saved.update((current) => ({...current}))} />
      }`
    const result = await findings(app, broken)
    expect(result.map((row) => row.messageId)).toEqual(['unchangedOptimisticValue'])
    expect(result[0].severity).toBe(2)
    expect(result[0].line).toBe(4)
    expect(
      await findings(
        app,
        broken.replace('({...current})', '({...current, enabled: !current.enabled})'),
      ),
    ).toEqual([])
  })

  it('a generated warehouse guide rejects a structured result at its HTML sink', async () => {
    const app = join(await directory(), 'app')
    await createAppProject(app, 'warehouse', 'react')
    await addPackages(app, ['@molecule/app-markdown'])
    const broken = `import {getProvider} from '@molecule/app-markdown'
      export function Guide({text}) {
        return <section dangerouslySetInnerHTML={{__html: getProvider()?.render(text) ?? ''}} />
      }`
    const result = await findings(app, broken)
    expect(result.map((row) => row.messageId)).toEqual(['markdownHtml'])
    expect(result[0].severity).toBe(2)
    expect(result[0].line).toBe(3)
    expect(await findings(app, broken.replace('render(text)', 'render(text).html'))).toEqual([])
  })

  it('the generated query wrapper rejects an extra key nesting and accepts refetch', async () => {
    const app = join(await directory(), 'app')
    await createAppProject(app, 'warehouse', 'react')
    await addPackages(app, ['@molecule/app-query-react'])
    const broken = `import {useQuery} from '@molecule/app-query-react'
      import {getQueryClient} from '@molecule/app-query'
      export function useStock(key: unknown[], load: () => Promise<string[]>) {
        const query = useQuery({key, fetch: load})
        return {...query, reload: () => getQueryClient().invalidate([key])}
      }`
    const result = await findings(app, broken)
    expect(result.map((message) => message.messageId)).toEqual(['nestedQueryKey'])
    expect(result[0].severity).toBe(2)
    expect(result[0].line).toBe(5)
    expect(
      await findings(app, broken.replace('getQueryClient().invalidate([key])', 'query.refetch()')),
    ).toEqual([])
  })

  it('the generated React guard rejects render-time navigation and accepts a declarative redirect', async () => {
    const app = join(await directory(), 'app')
    await createAppProject(app, 'staff-portal', 'react')
    await addPackages(app, ['@molecule/app-auth'])
    const broken = `import {useNavigate} from 'react-router'
      import {useAuth} from '@molecule/app-react'
      export function StaffGate() {
        const {status} = useAuth()
        const navigate = useNavigate()
        if (status === 'unauthenticated') navigate('/sign-in')
        return null
      }`
    const result = await findings(app, broken)
    expect(result.map((message) => message.messageId)).toEqual(['renderNavigation'])
    expect(result[0].severity).toBe(2)
    expect(result[0].line).toBe(6)
    expect(result[0].message).toContain('<Navigate')
    const fixed = `import {Navigate} from 'react-router'
      import {useAuth} from '@molecule/app-react'
      export function StaffGate() {
        const {status} = useAuth()
        if (status === 'unauthenticated') return <Navigate to="/sign-in" replace />
        return null
      }`
    expect(await findings(app, fixed)).toEqual([])
  })

  it('the API scaffold rejects a stale resource slug and accepts its returned record', async () => {
    const api = join(await directory(), 'api')
    await createApiProject(api, 'newsletter')
    await addPackages(api, ['@molecule/api-resource-article'])
    const broken = `import {updateArticle, getArticleBySlug} from '@molecule/api-resource-article'
      export async function rename(slug: string, editor: string, title: string) {
        const saved = await updateArticle(slug, editor, {title})
        if (saved.status !== 'ok') return saved
        return getArticleBySlug(slug, editor)
      }`
    const result = await findings(api, broken)
    expect(result.map((message) => message.messageId)).toEqual(['staleArticleSlug'])
    expect(result[0].severity).toBe(2)
    expect(
      await findings(api, broken.replace('getArticleBySlug(slug, editor)', 'saved.article')),
    ).toEqual([])
  })

  it('the app scaffold rejects an unsubscribed staff snapshot and accepts a subscribed view', async () => {
    const app = join(await directory(), 'app')
    await createAppProject(app, 'staff-portal', 'react')
    await addPackages(app, ['@molecule/app-auth'])
    const broken = `import {useEffect, useState} from 'react'; import {getClient} from '@molecule/app-auth'
      const client = getClient()
      export function useStaff() {
        const [view, setView] = useState(() => ({state: client.getState(), user: client.getUser(), token: client.getAccessToken()}))
        return view
      }`
    expect((await findings(app, broken)).map((message) => message.messageId)).toEqual([
      'authSubscription',
    ])
    const fixed = broken.replace(
      'return view',
      `useEffect(() => client.subscribe(() => setView({state: client.getState(), user: client.getUser(), token: client.getAccessToken()})), []); return view`,
    )
    expect(await findings(app, fixed)).toEqual([])
  })

  it.each(['react', 'vue', 'react-native'])(
    'the bare %s scaffold rejects a second client with configuration repair text',
    async (framework) => {
      const app = join(await directory(), 'app')
      await createAppProject(app, 'stockroom', framework)
      await addPackages(app, ['@molecule/app-auth', '@molecule/app-http'])
      const messages = await findings(app, localClients)
      expect(messages.map((message) => message.messageId).sort()).toEqual(['http'])
      expect(messages.every((message) => message.severity === 2)).toBe(true)
      expect(messages.map((message) => message.message).join('\n')).toContain('tokenKey')
      expect(messages.map((message) => message.message).join('\n')).toContain('authScheme')
    },
  )

  it('the flagship fast path overwrites old lint infrastructure and delivers the same check', async () => {
    const template = join(ROOT, 'templates/apps/inventory-management')
    const project = join(await directory(), 'project')
    await copyTemplateInstance(
      template,
      project,
      'stockroom',
      await readTemplateSetupSqlVersions(template),
    )
    const app = join(project, 'app')
    const messages = await findings(app, localClients)
    expect(messages.map((message) => message.messageId).sort()).toEqual(['http'])
    expect(await readFile(join(app, 'eslint-rules/prefer-declared-clients.mjs'), 'utf8')).toBe(
      await readFile(join(ROOT, 'templates/shared/prefer-declared-clients.mjs'), 'utf8'),
    )
    // The API has its own manifest: the app's declarations cannot redirect backend code.
    expect(await findings(join(project, 'api'), localClients)).toEqual([])
  })

  it('the flagship check rejects restoring bonded auth from a separate browser store', async () => {
    const template = join(ROOT, 'templates/apps/inventory-management')
    const project = join(await directory(), 'project')
    await copyTemplateInstance(
      template,
      project,
      'stockroom',
      await readTemplateSetupSqlVersions(template),
    )
    const app = join(project, 'app')
    const provider = join(app, 'src/stock-session.tsx')
    await execFileAsync('git', ['init', '-q', project])
    await execFileAsync('git', ['add', '--', '.'], { cwd: project })
    await writeFile(
      join(app, 'src/stock-preferences.ts'),
      `const key = 'stock.sort'
export function readPreference() { return localStorage.getItem(key) }
export function savePreference(value: string) { localStorage.setItem(key, value) }
`,
    )
    await writeFile(
      provider,
      `import { authClient } from './bonds/auth-default.js'
import { readPreference } from './stock-preferences.js'

export function restore() {
  const stored = readPreference()
  if (stored) authClient.setAccessToken(stored)
}
`,
    )
    const bad = await runCheckLocal(app, { steps: ['lint'] }, { budgetMs: 20_000 })
    if ('error' in bad) throw new Error(bad.error)
    expect(bad.ok).toBe(false)
    expect(bad.results[0].status).toBe('failed')
    expect(bad.results[0].errors.join('\n')).toMatch(
      /stock-session\.tsx:6: .*tokenKey.*currentUserEndpoint/,
    )

    await writeFile(
      provider,
      `import { useAuth } from '@molecule/app-react'
import { createContext } from 'react'

const Session = createContext<ReturnType<typeof useAuth>['state'] | null>(null)

export function AuthView() {
  const { state } = useAuth()
  return <Session.Provider value={state} />
}
`,
    )
    const good = await runCheckLocal(app, { steps: ['lint'] }, { budgetMs: 20_000 })
    if ('error' in good) throw new Error(good.error)
    expect(good.ok).toBe(true)
    expect(good.results[0].status).toBe('passed')
  })

  it('a generated project without the declarations may own its clients', async () => {
    const app = join(await directory(), 'app')
    await createAppProject(app, 'stockroom', 'react')
    expect(await findings(app, localClients)).toEqual([])
  })

  it.each(['custom', 'flagship'])(
    'the %s scaffold reports missing session actions and accepts canonical publication',
    async (kind) => {
      const project = join(await directory(), 'project')
      const app = join(project, 'app')
      if (kind === 'flagship') {
        const template = join(ROOT, 'templates/apps/inventory-management')
        await copyTemplateInstance(
          template,
          project,
          'staff-portal',
          await readTemplateSetupSqlVersions(template),
        )
      } else {
        await createAppProject(app, 'staff-portal', 'react')
        await addPackages(app, ['@molecule/app-auth', '@molecule/app-http'])
        const bond = synthesizeAppProjectFiles(
          [],
          ['@molecule/app-auth'],
          app,
          loadRegistry(),
        ).find((file) => file.targetPath.endsWith('bonds/auth-default.ts'))
        expect(bond).toBeDefined()
        if (!bond || bond.content === undefined) throw new Error('Missing generated auth bond')
        await writeFile(bond.targetPath, bond.content)
      }
      await writeFile(
        join(app, 'src/config.ts'),
        `export interface StaffProfile { label: string }
        export const authConfig = {
          profileEndpoint: () => '/staff/current', profileUpdateMethod: 'PUT' as const,
        }`,
      )
      const authBond = join(app, 'src/bonds/auth-default.ts')
      const originalBond = await readFile(authBond, 'utf8')
      await writeFile(
        authBond,
        `import type { StaffProfile } from '../config.js'\n${originalBond}\nexport type Profile = StaffProfile\n`,
      )
      const broken = `import {useAuth, useAuthClient, useHttpClient} from '@molecule/app-react'
        import {useNavigate} from 'react-router'
        export function Account() {
          const {user} = useAuth(); const auth = useAuthClient();
          const http = useHttpClient(); const navigate = useNavigate();
          const save = async () => { const answer = await http.put('/staff/current', {}); navigate('/dashboard') };
          const handleLogout = () => navigate('/dashboard');
          return <><form onSubmit={save}/><button onClick={handleLogout}>{user?.name}</button></>
        }`
      const messages = await findings(app, broken)
      expect(messages.map((message) => message.messageId).sort()).toEqual(['logout', 'profile'])
      expect(messages.every((message) => message.severity === 2)).toBe(true)
      const fixed = broken
        .replace("navigate('/dashboard') }", "auth.setUser(answer.data); navigate('/dashboard') }")
        .replace(
          "() => navigate('/dashboard')",
          "async () => { await auth.logout(); navigate('/dashboard') }",
        )
      expect(await findings(app, fixed)).toEqual([])
      if (kind === 'flagship') {
        const rotated = `import { authClient } from './bonds/index.js'\n${fixed.replace(
          'auth.setUser(answer.data)',
          'authClient.setSession({ user: answer.data.user, accessToken: answer.data.token })',
        )}`
        expect(await findings(app, rotated)).toEqual([])
      }
    },
  )

  it('the shared client flow and local inventory response mapping pass', async () => {
    const app = join(await directory(), 'app')
    await createAppProject(app, 'stockroom', 'react')
    await addPackages(app, ['@molecule/app-auth', '@molecule/app-http'])
    expect(
      await findings(
        app,
        `import { getClient } from '@molecule/app-http'
      import { useAuth } from '@molecule/app-react'
      export async function inventory() { return (await getClient().get('/stock/items')).data }
      export function Staff() { const { state } = useAuth(); return <span>{state.user?.name}</span> }`,
      ),
    ).toEqual([])
  })

  it('mlcl check reports the lint error through its existing structured result', async () => {
    const app = join(await directory(), 'app')
    await createAppProject(app, 'stockroom', 'react')
    await addPackages(app, ['@molecule/app-auth', '@molecule/app-http'])
    // Exercise the scaffold config and real lint runner on the file with the new write.
    const manifestPath = join(app, 'package.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      scripts: Record<string, string>
    }
    manifest.scripts.lint = 'eslint src/stock.ts'
    await writeFile(manifestPath, JSON.stringify(manifest))
    // Git metadata and logs belong to this throwaway project, not the parent checkout.
    await execFileAsync('git', ['init', '-q', app])
    await execFileAsync('git', ['add', '--', '.'], { cwd: app })
    await writeFile(
      join(app, 'src/stock.ts'),
      `export function inventory(): Promise<Response> {
      return fetch('/stock/items', { headers: { Authorization: 'Token abc' } })
    }\n`,
    )
    const result = await runCheckLocal(app, { steps: ['lint'] }, { budgetMs: 20_000 })
    expect('error' in result).toBe(false)
    if ('error' in result) throw new Error(result.error)
    expect(result.ok).toBe(false)
    expect(result.report).toContain('FAIL lint')
    expect(result.results[0].status).toBe('failed')
    expect(result.results[0].errors.join('\n')).toContain('@molecule/app-http is declared')
    expect(result.results[0].errors.join('\n')).toContain('authScheme')
    expect(result.results[0].errors.join('\n')).toContain('tokenKey')
  })
})
