/** Exercise the verification surface every harness receives, not a prompt. */
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { ESLint, type Linter } from 'eslint'
import { afterEach, describe, expect, it } from 'vitest'

import { runCheckLocal } from '../check.js'
import {
  addPackages,
  copyTemplateInstance,
  createAppProject,
  readTemplateSetupSqlVersions,
} from '../scaffold.js'

const ROOT = join(import.meta.dirname, '../../..')
const RULE = 'molecule-local/prefer-declared-clients'
const execFileAsync = promisify(execFile)
const dirs: string[] = []

async function directory(): Promise<string> {
  await mkdir(join(ROOT, '.tmp'), { recursive: true })
  const dir = await mkdtemp(join(ROOT, '.tmp/declared-clients-'))
  dirs.push(dir)
  return dir
}

afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true })
})

async function findings(app: string, source: string): Promise<Linter.LintMessage[]> {
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
  return result.messages.filter((message) => message.ruleId === RULE)
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
  it.each(['react', 'vue', 'react-native'])(
    'the bare %s scaffold rejects a second client with configuration repair text',
    async (framework) => {
      const app = join(await directory(), 'app')
      await createAppProject(app, 'stockroom', framework)
      await addPackages(app, ['@molecule/app-auth', '@molecule/app-http'])
      const messages = await findings(app, localClients)
      expect(messages.map((message) => message.messageId).sort()).toEqual([
        'credential',
        'http',
        'session',
      ])
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
    expect(messages.map((message) => message.messageId).sort()).toEqual([
      'credential',
      'http',
      'session',
    ])
    expect(await readFile(join(app, 'eslint-rules/prefer-declared-clients.mjs'), 'utf8')).toBe(
      await readFile(join(ROOT, 'templates/shared/prefer-declared-clients.mjs'), 'utf8'),
    )
    // The API has its own manifest: the app's declarations cannot redirect backend code.
    expect(await findings(join(project, 'api'), localClients)).toEqual([])
  })

  it('a generated project without the declarations may own its clients', async () => {
    const app = join(await directory(), 'app')
    await createAppProject(app, 'stockroom', 'react')
    expect(await findings(app, localClients)).toEqual([])
  })

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
    // Keep this integration about the new write, exactly as changed-file lint runs.
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
