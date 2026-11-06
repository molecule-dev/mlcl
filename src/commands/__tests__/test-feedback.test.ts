import { once } from 'node:events'
import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { Command, Config } from '@oclif/core'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { shellQuote } from '@molecule/api-ai-tools'

import TestFeedback from '../test-feedback.js'

const require = createRequire(import.meta.url)
const cli = require.resolve('@playwright/test/cli')
const cliRoot = join(import.meta.dirname, '../../..')
let root: string, source: string, server: ReturnType<typeof createServer>, requests: number
let stop: (() => void) | undefined, watching: Promise<void> | undefined
const initialCwd = process.cwd()

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'native-cli-feedback-'))
  source = join(root, 'src/note.html')
  await mkdir(join(root, 'src'))
  await mkdir(join(root, 'e2e'))
  await symlink(dirname(dirname(dirname(cli))), join(root, 'node_modules'), 'dir')
  await writeFile(join(root, 'package.json'), '{"type":"module"}')
  await writeFile(source, '<main><p>entry</p></main>')
  requests = 0
  server = createServer(async (_req, res) => {
    requests++
    res.setHeader('content-type', 'text/html')
    res.end(await readFile(source, 'utf8'))
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const port = (server.address() as { port: number }).port
  await writeFile(
    join(root, 'playwright.config.mjs'),
    `export default {testDir:'./e2e',timeout:5000,expect:{timeout:600},use:{baseURL:'http://127.0.0.1:${port}'}}`,
  )
  await writeFile(
    join(root, 'e2e/note.spec.ts'),
    `import {test,expect} from '@playwright/test';\ntest('note paragraph',async({page})=>{await page.goto('/');await expect(page.locator('p').filter({hasText:'entry'})).toBeVisible()})`,
  )
  vi.spyOn(Command.prototype, 'log').mockImplementation(() => undefined)
  vi.spyOn(Command.prototype, 'warn').mockImplementation(() => undefined)
})
afterEach(async () => {
  stop?.()
  await watching
  stop = undefined
  watching = undefined
  process.chdir(initialCwd)
  vi.restoreAllMocks()
  await new Promise<void>((resolve) => server.close(() => resolve()))
  await rm(root, { recursive: true, force: true })
}, 130_000)

async function command(extra: string[] = []): Promise<TestFeedback> {
  const config = await Config.load(cliRoot)
  process.chdir(root)
  return new TestFeedback(
    [
      '--suite',
      'e2e',
      '--sources',
      'src/note.html',
      '--command',
      `${shellQuote(process.execPath)} ${shellQuote(cli)} test --config playwright.config.mjs`,
      '--json',
      ...extra,
    ],
    config,
  )
}

it('watches a physical HTML component file and delivers a native failure while the caller keeps building', async () => {
  const original = process.on.bind(process)
  vi.spyOn(process, 'on').mockImplementation((event, listener) => {
    if ((event === 'SIGTERM' || event === 'SIGINT') && listener.name === 'stop') {
      stop = listener as () => void
      return process
    }
    return original(event, listener)
  })
  const cmd = await command(['--watch'])
  watching = cmd.run()
  await vi.waitFor(() => expect(stop).toBeTypeOf('function'))
  await vi.waitFor(
    async () => {
      expect(await readdir(join(root, '.mol/test-feedback'))).toEqual([])
      expect(requests).toBeGreaterThan(0)
    },
    { timeout: 15000 },
  )
  expect(Command.prototype.log).not.toHaveBeenCalled()
  expect(Command.prototype.warn).not.toHaveBeenCalled()
  await writeFile(source, '<main><div>entry</div></main>')
  await vi.waitFor(() => expect(Command.prototype.log).toHaveBeenCalled(), { timeout: 10000 })
  const result = JSON.parse(vi.mocked(Command.prototype.log).mock.calls[0][0] as string)
  expect(result.failures[0]).toMatchObject({
    spec: expect.stringContaining('note.spec.ts'),
    line: 2,
    sourceFiles: [source],
  })
  expect(result.failures[0].locator).toContain("locator('p').filter({ hasText: 'entry' })")
  expect(result.failures[0].rendered).toContain('entry')
}, 40_000)

it('one-shot diagnosis returns a nonzero status for an actual native failure', async () => {
  await writeFile(source, '<main><div>entry</div></main>')
  const cmd = await command()
  await expect(cmd.run()).rejects.toThrow(/EEXIT: 1/)
  expect(Command.prototype.log).toHaveBeenCalledTimes(1)
}, 20_000)

it('does not drive the app or emit a note when no supplied spec exists', async () => {
  await rm(join(root, 'e2e/note.spec.ts'))
  await (await command()).run()
  expect(requests).toBe(0)
  expect(Command.prototype.log).not.toHaveBeenCalled()
  expect(Command.prototype.warn).not.toHaveBeenCalled()
})
