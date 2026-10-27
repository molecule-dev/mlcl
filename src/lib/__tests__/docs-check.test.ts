import type * as ChildProcessModule from 'node:child_process'
import { fork } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { checkDocs } from '../docs-check.js'
import { generateDocs } from '../docs-sync.js'
import type { Registry } from '../schema.js'

vi.mock('node:child_process', async (original) => {
  const actual = await original<typeof ChildProcessModule>()
  return { ...actual, fork: vi.fn(actual.fork) }
})
const realFork = (await vi.importActual<typeof ChildProcessModule>('node:child_process')).fork
let root: string
let registry: Registry
const pids: number[] = []

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'docs-check-'))
  registry = { packages: {} } as Registry
  for (const name of ['alpha', 'beta']) {
    const relative = `packages/api/core/${name}`
    await mkdir(join(root, relative, 'src'), { recursive: true })
    await writeFile(
      join(root, relative, 'package.json'),
      JSON.stringify({ name: `@molecule/api-${name}`, version: '1.0.0' }),
    )
    await writeFile(
      join(root, relative, 'src/index.ts'),
      `/** Generic ${name}. @module */\nexport const value = '${name}'\n`,
    )
    registry.packages[`@molecule/api-${name}`] = {
      path: relative,
      type: 'core',
      stack: 'api',
      category: name,
    }
  }
  const worker = join(root, 'worker.mjs')
  await writeFile(
    worker,
    `
import fs from 'node:fs';
process.once('message', request => {
  if (Object.keys(request.registry.packages).length !== 2) process.exit(29);
  const mode = fs.readFileSync(request.moleculeDir + '/mode', 'utf8');
  if (mode === 'pending') { setInterval(() => {}, 1000); return; }
  if (mode === 'fail' && request.packageNames[0].endsWith('alpha')) process.exit(23);
  if (mode === 'fail') { setInterval(() => {}, 1000); return; }
  const checked = mode === 'missing' ? [] : mode === 'duplicate' ? [request.packageNames[0], request.packageNames[0]] : request.packageNames;
  process.send({checked, different: mode === 'stale' ? request.packageNames : []}, () => process.disconnect());
});
`,
  )
  await writeFile(join(root, 'mode'), 'good')
  vi.mocked(fork).mockImplementation((_file, args, options) => {
    const child = realFork(worker, args, options)
    if (child.pid) pids.push(child.pid)
    return child
  })
})

afterEach(async () => {
  expect(pids.splice(0).every((pid) => !existsSync(`/proc/${pid}`))).toBe(true)
  vi.clearAllMocks()
  await rm(root, { recursive: true, force: true })
})

describe('isolated README checks', () => {
  it('keeps default and one-package jobs2 extraction in process and detects actual stale bytes', async () => {
    const docs = await generateDocs(registry, root)
    for (const doc of docs) await writeFile(doc.readmePath, doc.md)
    expect(await checkDocs(registry, root)).toEqual({
      checked: Object.keys(registry.packages),
      different: [],
    })
    const first = Object.keys(registry.packages)[0]
    await writeFile(docs[0].readmePath, 'KNOWN_BAD_STALE_README')
    expect((await checkDocs(registry, root, [first], { jobs: 2 })).different).toEqual([first])
    expect(fork).not.toHaveBeenCalled()
  })

  it('uses exactly two children and preserves full registry context and registry order', async () => {
    const result = await checkDocs(registry, root, undefined, { jobs: 2 })
    expect(result).toEqual({ checked: Object.keys(registry.packages), different: [] })
    expect(fork).toHaveBeenCalledTimes(2)
    expect(pids).toHaveLength(2)
  })

  it('propagates stale names returned by either child', async () => {
    await writeFile(join(root, 'mode'), 'stale')
    expect((await checkDocs(registry, root, undefined, { jobs: 2 })).different).toEqual(
      Object.keys(registry.packages),
    )
  })

  it.each(['missing', 'duplicate'])(
    'refuses %s coverage instead of certifying partial work',
    async (mode) => {
      await writeFile(join(root, 'mode'), mode)
      await expect(checkDocs(registry, root, undefined, { jobs: 2 })).rejects.toThrow('coverage')
    },
  )

  it('rejects a failed real Node child and closes its unfinished peer', async () => {
    await writeFile(join(root, 'mode'), 'fail')
    await expect(checkDocs(registry, root, undefined, { jobs: 2 })).rejects.toThrow('23')
  })

  it('aborts and awaits both real children before rejection', async () => {
    await writeFile(join(root, 'mode'), 'pending')
    const controller = new AbortController()
    const result = checkDocs(registry, root, undefined, { jobs: 2, signal: controller.signal })
    controller.abort(new Error('cancelled by caller'))
    await expect(result).rejects.toThrow('cancelled by caller')
  })

  it('refuses an already aborted call before starting a child', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      checkDocs(registry, root, undefined, { jobs: 2, signal: controller.signal }),
    ).rejects.toThrow()
    expect(fork).not.toHaveBeenCalled()
    expect(await readFile(join(root, 'mode'), 'utf8')).toBe('good')
  })
})
