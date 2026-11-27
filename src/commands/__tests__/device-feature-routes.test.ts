/**
 * The generated API uses device sessions independently of its device-management routes.
 * Exercise the real create, add and inject commands with the packages available to mlcl in CI.
 *
 * @module
 */
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const exec = promisify(execFile)
const ROOT = join(import.meta.dirname, '..', '..', '..')
const modules = dirname(dirname(fileURLToPath(import.meta.resolve('vitest/package.json'))))
const device = '@molecule/api-resource-device'
const user = '@molecule/api-resource-user'
const settings = '@molecule/app-settings-panel-react'
const push = '@molecule/api-push-notifications-web-push'
const database = '@molecule/api-database-sqlite'
const routerFile = 'src/App/router.ts'
const panelFile = 'app/src/components/SettingsPanel.tsx'
const pushKeyPath = '/devices/push/public-key'
const management = [
  ['get', '/devices'],
  ['get', '/devices/:id'],
  ['patch', '/devices/:id'],
  ['delete', '/devices/:id'],
] as const

let scratch: string
beforeAll(async () => {
  scratch = await mkdtemp(join(tmpdir(), 'mlcl-device-features-'))
})
afterAll(async () => {
  await rm(scratch, { recursive: true, force: true })
})

async function cli(cwd: string, ...args: string[]): Promise<void> {
  await exec(process.execPath, [join(ROOT, 'bin', 'run.js'), ...args], {
    cwd,
    timeout: 120_000,
    maxBuffer: 4 * 1024 * 1024,
  })
}

async function create(
  name: string,
  packages: string[] = [user],
  framework?: string,
): Promise<string> {
  const project = join(scratch, name)
  await cli(
    ROOT,
    'create',
    project,
    '--type',
    framework ? 'full-stack' : 'api',
    ...(framework ? ['--framework', framework] : []),
    '--packages',
    [database, ...packages].join(','),
    '--no-interactive',
    '--skip-install',
    '--require-inject',
  )
  await symlink(modules, join(project, 'node_modules'))
  return project
}

async function inject(api: string, ...args: string[]): Promise<void> {
  await cli(api, 'inject', '--no-install', '--no-test', '--no-ai', ...args)
}

function expectManagement(router: string, mounted: boolean): void {
  for (const [method, path] of management) {
    const routes = router.match(
      new RegExp('router\\.' + method + '\\(\\s*\x60' + path + '\x60', 'g'),
    )
    expect(routes?.length ?? 0, `${method.toUpperCase()} ${path}`).toBe(mounted ? 1 : 0)
  }
  const entry = router.split('\n').find((line) => line.includes(device) && line.startsWith('//   '))
  expect(entry?.includes('GET /devices, GET/PATCH/DELETE /devices/:id') ?? false).toBe(mounted)
}

describe('device-management routes', () => {
  it('uses the device service for login and logout in an API without management routes', async () => {
    const api = await create('session-api')
    const probe = join(api, 'device-session.mts')
    await writeFile(
      probe,
      `import assert from 'node:assert/strict'
import { once } from 'node:events'
import { findById } from '@molecule/api-database'
import { create } from './src/server.js'

process.env.SQLITE_PATH = ':memory:'
const server = await create(0)
try {
  if (!server.listening) await once(server, 'listening')
  const address = server.address()
  assert(address && typeof address !== 'string')
  const request = (path: string, options?: RequestInit) =>
    fetch('http://127.0.0.1:' + address.port + '/api' + path, options)
  const post = (path: string, body: object) =>
    request(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })

  const credentials = { email: 'device@example.com', password: 'Device-test-password-42!' }
  const signup = await post('/users', { ...credentials, username: 'device-test' })
  assert.equal(signup.status, 201, 'signup')
  await signup.text()

  const login = await post('/users/log-in', { ...credentials, deviceName: 'Login test device' })
  assert.equal(login.status, 200, 'login')
  const { accessToken } = await login.json()
  const { deviceId } = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString())
  assert.equal((await findById('devices', deviceId))?.name, 'Login test device')
  const headers = { authorization: 'Bearer ' + accessToken }
  assert.equal((await request('/users/me', { headers })).status, 200)

  const devices = await request('/devices', { headers })
  await devices.text()
  const logout = await request('/users/logout', { method: 'POST', headers })
  assert.equal(logout.status, 200, 'logout')
  assert.equal(await findById('devices', deviceId), null, 'login device was deleted')
  assert.equal((await request('/users/me', { headers })).status, 401, 'logged-out token was rejected')
  assert.equal(devices.status, 404, 'device management is absent')
} finally {
  server.closeAllConnections()
  server.close()
}
`,
    )
    await exec(process.execPath, ['--env-file-if-exists=.env', '--import', 'tsx', probe], {
      cwd: api,
      timeout: 30_000,
    })
    expectManagement(await readFile(join(api, routerFile), 'utf8'), false)
  }, 150_000)

  it('adds routes from the app settings package and keeps the flagship blog router', async () => {
    const flagship = join(scratch, 'flagship-blog')
    await cli(ROOT, 'create', flagship, '--template', 'blog', '--skip-install')
    const flagshipRouter = await readFile(join(flagship, 'api', routerFile), 'utf8')
    expect(flagshipRouter).toContain('mountDefaultDeviceRoutes(router, Device)')
    const routerBody = flagshipRouter.replace(
      /^\/\* @molecule\/capability-recipes:start[^]*?\* @molecule\/capability-recipes:end \*\/\n\n/,
      '',
    )
    expect(routerBody).toBe(
      await readFile(join(ROOT, 'templates/apps/blog/api', routerFile), 'utf8'),
    )

    const project = await create('settings-stack', [user], 'react')
    const router = join(project, 'api', routerFile)
    const before = await readFile(router, 'utf8')
    await cli(project, 'add', settings, '--inject', '--no-install')

    const after = await readFile(router, 'utf8')
    expectManagement(before, false)
    expectManagement(after, true)
    expect(after).not.toContain(pushKeyPath)
    expect(await readFile(join(project, panelFile), 'utf8')).toContain('DevicesSection')
  }, 180_000)

  it('adds the management and public-key routes when an API adds push', async () => {
    const api = await create('push-api')
    const router = join(api, routerFile)
    const before = await readFile(router, 'utf8')
    await cli(api, 'add', push, '--inject', '--no-install')

    expectManagement(before, false)
    const after = await readFile(router, 'utf8')
    expectManagement(after, true)
    expect(after).toContain(pushKeyPath)
  }, 150_000)

  it('adds the public-key route to a router that already imports the device handler map', async () => {
    const api = await create('managed-push-api', [user, device])
    const router = join(api, routerFile)
    expectManagement(await readFile(router, 'utf8'), true)
    await cli(api, 'add', push, '--inject', '--no-install')

    const after = await readFile(router, 'utf8')
    expect(after).toContain(pushKeyPath)
    expect(after.match(/\/\/ {3}@molecule\/api-resource-device /g)).toHaveLength(1)
    expect(after.match(/requestHandlerMap as Device/g)).toHaveLength(1)
    expectManagement(after, true)
  }, 150_000)

  it('uses the same feature for React Native Web settings at create and after an explicit add', async () => {
    const plain = await create('rnw-plain', [user], 'react-native-web')
    const enabled = await create('rnw-managed', [user, device], 'react-native-web')
    const before = await readFile(join(plain, panelFile), 'utf8')
    expectManagement(await readFile(join(enabled, 'api', routerFile), 'utf8'), true)
    expect(await readFile(join(enabled, panelFile), 'utf8')).toContain("('/devices')")

    await cli(plain, 'add', device, '--inject', '--no-install')

    expect(before).not.toContain("('/devices')")
    expect(await readFile(join(plain, panelFile), 'utf8')).toContain("('/devices')")
    expectManagement(await readFile(join(plain, 'api', routerFile), 'utf8'), true)
  }, 180_000)

  it('records an explicit add of the already declared auth peer for a later inject', async () => {
    const api = await create('add-device-api')
    const manifest = join(api, 'package.json')
    const before = JSON.parse(await readFile(manifest, 'utf8'))
    expect(before.dependencies[device]).toBeDefined()

    await cli(api, 'add', device, '--no-install')
    const selected = JSON.parse(await readFile(manifest, 'utf8'))
    expect(selected.molecule.selectedFeatures ?? []).toContain('devices')
    const router = join(api, routerFile)
    expectManagement(await readFile(router, 'utf8'), false)
    await inject(api)
    expectManagement(await readFile(router, 'utf8'), true)
  }, 150_000)

  it('keeps the legacy mounts and an app route on ordinary and forced reinjection', async () => {
    const api = await create('legacy-api', [device])
    const manifest = join(api, 'package.json')
    const legacy = JSON.parse(await readFile(manifest, 'utf8'))
    delete legacy.molecule.selectedFeatures
    await writeFile(manifest, JSON.stringify(legacy, null, 2) + '\n')
    const router = join(api, routerFile)
    const appRoute = "router.get('/local-only', (_req, res) => res.sendStatus(204))"
    await writeFile(router, (await readFile(router, 'utf8')) + '\n' + appRoute + '\n')

    await inject(api)
    expectManagement(await readFile(router, 'utf8'), true)
    await cli(api, 'add', user, '--no-install')
    await inject(api, '--force')

    const after = await readFile(router, 'utf8')
    expect(after).toContain(appRoute)
    expect(after).toContain('router.use(resourceUserRouter)')
    expectManagement(after, true)
  }, 150_000)
})
