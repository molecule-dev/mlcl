/** Real dev commands must recover when an import failed before tsx learned its dependency. */
import { type ChildProcess, spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { createApiProject, getTemplatesDir } from '../scaffold.js'

const require = createRequire(import.meta.url)
const modules = dirname(dirname(require.resolve('tsx/package.json')))
const fixtures: Array<{ dir: string; child?: ChildProcess }> = []

afterEach(async () => {
  for (const { dir, child } of fixtures.splice(0)) {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit')
      // This is the exact child spawned below, with exec replacing sh. tsx owns its server.
      child.kill('SIGTERM')
      await exited
    }
    await rm(dir, { recursive: true, force: true })
  }
})

/** Start a non-benchmark inventory API using a command mlcl actually ships. */
async function startInventory(template = false): Promise<{
  dir: string
  output: () => string
  write: (file: string, content: string) => Promise<void>
}> {
  const dir = await mkdtemp(join(tmpdir(), 'mlcl-api-watch-'))
  const fixture = { dir } as (typeof fixtures)[number]
  fixtures.push(fixture)
  await createApiProject(dir, 'inventory-api')
  if (template) {
    const file = join(getTemplatesDir(), 'apps', '3d-model-viewer', 'api', 'package.json')
    const manifest = JSON.parse(await readFile(file, 'utf8')) as { scripts: { dev: string } }
    const own = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8')) as {
      scripts: { dev: string }
    }
    own.scripts.dev = manifest.scripts.dev
    await writeFile(join(dir, 'package.json'), JSON.stringify(own))
  }
  await symlink(modules, join(dir, 'node_modules'), 'dir')
  const write = async (file: string, content: string): Promise<void> => {
    await mkdir(dirname(join(dir, file)), { recursive: true })
    await writeFile(join(dir, file), content)
  }
  await write('.env', 'CATALOG=inventory\n')
  await write('migrations/000_inventory.sql', '-- initial schema\n')
  await write('src/handlers/index.ts', "export default 'before'\n")
  await write(
    'src/server.ts',
    `import { createServer } from 'node:http'
const { default: item } = await import('./handlers/index.js')
const server = createServer((_req, res) => res.end(process.env.CATALOG + ':' + item))
server.listen(0, '127.0.0.1', () => {
  console.log('READY:' + server.address().port + ':' + item)
})
`,
  )
  const manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8')) as {
    scripts: { dev: string }
  }
  // Execute the shipped shell quoting, with exec so termination reaches the watcher itself.
  const child = spawn('/bin/sh', ['-c', `exec ${manifest.scripts.dev}`], {
    cwd: dir,
    env: {
      ...process.env,
      PATH: `${join(modules, '.bin')}:${process.env.PATH ?? ''}`,
      // tsx's IPC socket has a ~108-byte pathname cap. A relative temp root keeps it
      // inside this fixture even when its absolute review/CI path is much longer.
      TMPDIR: '.',
      CHOKIDAR_USEPOLLING: '1',
      CHOKIDAR_INTERVAL: '100',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  fixture.child = child
  let output = ''
  child.stdout?.on('data', (data: Buffer) => (output += data.toString()))
  child.stderr?.on('data', (data: Buffer) => (output += data.toString()))
  await expect.poll(() => output, { timeout: 5000 }).toMatch(/READY:\d+:before/)
  // The child can answer before the parent registers its just-discovered files.
  // Allow that initial subscription to settle before testing a later save.
  await new Promise((resolve) => setTimeout(resolve, 500))
  return { dir, output: () => output, write }
}

/** Ask the most recent server, so the result proves actual recovery rather than a log alone. */
async function response(output: string): Promise<string> {
  const ready = [...output.matchAll(/READY:(\d+):[^\n]+/g)].at(-1)
  if (!ready) return 'no listener'
  try {
    return await (await fetch(`http://127.0.0.1:${ready[1]}/inventory`)).text()
  } catch (_error) {
    // Expected during the restart window. The polling assertion reports a persistent outage.
    return 'no listener'
  }
}

describe('the shipped API watcher', () => {
  for (const template of [false, true]) {
    it(`recovers a newly imported module after an export repair (${template ? 'template' : 'custom'})`, async () => {
      const api = await startInventory(template)
      await api.write('src/handlers/catalog.ts', "export const item = 'after'\n")
      await api.write(
        'src/handlers/index.ts',
        "import item from './catalog.js'\nexport default item\n",
      )
      await expect
        .poll(api.output, { timeout: 5000 })
        .toContain("does not provide an export named 'default'")
      await api.write('src/handlers/catalog.ts', "export default 'after'\n")
      await expect.poll(() => response(api.output()), { timeout: 5000 }).toBe('inventory:after')
    })
  }

  it('reloads loaded source and migrations while retaining the .env contract', async () => {
    const api = await startInventory()
    await api.write('src/handlers/index.ts', "export default 'updated'\n")
    await expect.poll(() => response(api.output()), { timeout: 5000 }).toBe('inventory:updated')
    const ready = (): number => [...api.output().matchAll(/READY:/g)].length
    const before = ready()
    await api.write('migrations/001_inventory.sql', '-- inventory migration\n')
    await expect.poll(ready, { timeout: 5000 }).toBeGreaterThan(before)
    expect(await response(api.output())).toBe('inventory:updated')
  })

  it('does not restart for tests, documentation or emitted output', async () => {
    const api = await startInventory()
    const before = api.output()
    await api.write('src/__tests__/inventory.ts', 'throw new Error("must not load")\n')
    await api.write('src/handlers/catalog.test.ts', 'throw new Error("must not load")\n')
    await api.write('src/handlers/catalog.spec.ts', 'throw new Error("must not load")\n')
    await api.write('dist/server.js', 'throw new Error("must not load")\n')
    await api.write('README.md', 'Inventory API\n')
    // More than ten polling intervals plus tsx's debounce: negative assertions need a window.
    await new Promise((resolve) => setTimeout(resolve, 1500))
    expect(api.output()).toBe(before)
    expect(await response(api.output())).toBe('inventory:before')
  })
})
