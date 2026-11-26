import { execFile, spawn } from 'node:child_process'
import { once } from 'node:events'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const checkout = fileURLToPath(new URL('../../../', import.meta.url))
const require = createRequire(import.meta.url)
const stamp = 'dist/.build-started'
const lock = 'dist.build-lock'
const backup = 'dist.old-build'
const oldOutput = '{\n  "release": "old"\n}\n'
const newOutput = '{\n  "release": "new"\n}\n'
const command = `
import { Command } from '@oclif/core'
import { release } from '../index.js'
export default class Report extends Command {
  static enableJsonFlag = true
  async run() {
    await this.parse(Report)
    return { release }
  }
}
`

let root: string

function file(name: string, content: string): void {
  const path = join(root, name)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'mlcl-cli-build-'))
  file(
    'package.json',
    JSON.stringify({
      name: 'mlcl-build-fixture',
      version: '1.0.0',
      type: 'module',
      oclif: { commands: './dist/commands' },
    }),
  )
  file(
    'tsconfig.json',
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        rootDir: 'src',
        sourceMap: true,
        strict: true,
        skipLibCheck: true,
        types: [],
      },
      include: ['src'],
    }),
  )
  for (const name of ['@oclif/core', 'typescript']) {
    const local = join(root, 'node_modules', name)
    mkdirSync(dirname(local), { recursive: true })
    symlinkSync(dirname(require.resolve(`${name}/package.json`)), local, 'junction')
  }
  cpSync(join(checkout, 'bin'), join(root, 'bin'), { recursive: true })
  cpSync(join(checkout, 'scripts/build.mjs'), join(root, 'scripts/build.mjs'))
  file('dist/index.js', "export const release = 'old'\n")
  file('dist/commands/report.js', command)
  file(stamp, String(Date.now() - 60_000))
  file('src/index.ts', "export const release = 'new'\n")
  file('src/commands/report.ts', command)

  // Observe the real compiler subprocess. Pause it only when testing two overlapping launches.
  file(
    'observe.mjs',
    `
import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
if (process.argv[1] === ${JSON.stringify(require.resolve('typescript/bin/tsc'))}) {
  fs.appendFileSync('compiles', 'compile\\n')
  if (process.env.MLCL_TEST_PAUSE_COMPILER) {
    const deadline = Date.now() + 15_000
    while (!fs.existsSync('release-compiler')) {
      if (Date.now() > deadline) throw new Error('test did not release the compiler')
      await delay(25)
    }
  }
}
if (process.env.MLCL_TEST_FAIL_DIST_SWAP) {
  const rename = fs.renameSync
  fs.renameSync = (from, to) => {
    if (to === resolve('dist') && from !== resolve(${JSON.stringify(backup)}))
      throw new Error('test: could not install compiled dist')
    rename(from, to)
  }
  syncBuiltinESMExports()
}
`,
  )
})

afterEach(() => rmSync(root, { recursive: true, force: true }))

interface Invocation {
  done: Promise<{ stdout: string; stderr: string }>
  stderr: () => string
}

function cli(env: NodeJS.ProcessEnv = {}): Invocation {
  let diagnostics = ''
  const done = new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = execFile(
      process.execPath,
      ['bin/run.js', 'report', '--json'],
      {
        cwd: root,
        env: {
          ...process.env,
          NODE_OPTIONS: `--import=${pathToFileURL(join(root, 'observe.mjs')).href}`,
          // TypeScript colours its diagnostics for any non-empty FORCE_COLOR, '0' included;
          // NO_COLOR is the switch it checks first.
          FORCE_COLOR: undefined,
          NO_COLOR: '1',
          ...env,
        },
        timeout: 25_000,
      },
      (error, stdout, stderr) => {
        if (error) reject(new Error(stderr || error.message, { cause: error }))
        else resolve({ stdout, stderr })
      },
    )
    child.stderr?.on('data', (chunk: Buffer) => {
      diagnostics += chunk.toString()
    })
  })
  return { done, stderr: () => diagnostics }
}

describe('bin/run.js checkout rebuild', () => {
  it('runs the newly compiled command and keeps rebuild output off stdout', async () => {
    const { stdout, stderr } = await cli().done
    expect(stdout).toBe(newOutput)
    expect(stderr).toMatch(/^mlcl: rebuilding dist\/ because src[\\/][^\r\n]+\.ts changed /)
    expect(readFileSync(join(root, 'compiles'), 'utf8')).toBe('compile\n')
    const mapPath = join(root, 'dist/commands/report.js.map')
    const map: { sources: string[] } = JSON.parse(readFileSync(mapPath, 'utf8'))
    expect(map.sources.map((source) => join(dirname(mapPath), source))).toEqual([
      join(root, 'src/commands/report.ts'),
    ])
  })

  it('waits for the running rebuild and compiles only once for two stale callers', async () => {
    const first = cli({ MLCL_TEST_PAUSE_COMPILER: '1' })
    const second = cli({ MLCL_TEST_PAUSE_COMPILER: '1' })
    const both = Promise.allSettled([first.done, second.done])
    try {
      await expect
        .poll(() => first.stderr() + second.stderr(), { timeout: 8_000 })
        .toContain('waiting for build')
    } finally {
      file('release-compiler', '')
      await both
    }
    const results = await Promise.all([first.done, second.done])
    expect(results.map(({ stdout }) => stdout)).toEqual([newOutput, newOutput])
    expect(readFileSync(join(root, 'compiles'), 'utf8')).toBe('compile\n')
  })

  it('replaces an abandoned lock and runs the current code', async () => {
    const departed = spawn(process.execPath, ['-e', ''])
    await once(departed, 'exit')
    mkdirSync(join(root, lock, `${departed.pid}-test`), { recursive: true })
    const results = await Promise.all([cli().done, cli().done])
    expect(results.map(({ stdout }) => stdout)).toEqual([newOutput, newOutput])
    expect(readFileSync(join(root, 'compiles'), 'utf8')).toBe('compile\n')
    expect(existsSync(join(root, lock))).toBe(false)
  })

  it('prints real TypeScript diagnostics on stderr and runs the intact old build', async () => {
    const oldStamp = readFileSync(join(root, stamp), 'utf8')
    file('src/index.ts', 'export const release: string = 42\n')
    const { stdout, stderr } = await cli().done
    expect(stdout).toBe(oldOutput)
    expect(stderr).toMatch(/src[\\/]index\.ts.*error TS2322/)
    expect(stderr).toMatch(/rebuild failed .*Using the previous build/)
    expect(readFileSync(join(root, stamp), 'utf8')).toBe(oldStamp)
    expect(existsSync(join(root, lock))).toBe(false)
  })

  it('ignores an unusable lock in fresh and published trees but consults it when stale', async () => {
    file(lock, 'This file prevents taking the build lock.')
    const stale = await cli().done
    const freshTime = new Date()
    const past = new Date(freshTime.getTime() - 1_000)
    for (const source of ['src/index.ts', 'src/commands/report.ts']) {
      utimesSync(join(root, source), past, past)
    }
    file(stamp, String(freshTime.getTime()))
    const fresh = await cli().done
    rmSync(join(root, 'src'), { recursive: true })
    rmSync(join(root, 'scripts'), { recursive: true })
    const published = await cli().done
    expect(fresh).toEqual({ stdout: oldOutput, stderr: '' })
    expect(published).toEqual(fresh)
    expect(stale.stdout).toBe(oldOutput)
    expect(stale.stderr).toMatch(/dist\.build-lock/)
    expect(stale.stderr).toContain('rebuild failed')
    expect(existsSync(join(root, 'compiles'))).toBe(false)
  })

  it('restores the previous dist when installing a compiled build fails', async () => {
    const { stdout, stderr } = await cli({ MLCL_TEST_FAIL_DIST_SWAP: '1' }).done
    expect(stdout).toBe(oldOutput)
    expect(stderr).toContain('could not install compiled dist')
    expect(stderr).toMatch(/rebuild failed .*Using the previous build/)
    expect(existsSync(join(root, backup))).toBe(false)
  })

  it('recovers the old dist after an interrupted swap even if the next compile fails', async () => {
    renameSync(join(root, 'dist'), join(root, backup))
    file('src/index.ts', 'export const release: string = 42\n')
    const { stdout, stderr } = await cli().done
    expect(stdout).toBe(oldOutput)
    expect(stderr).toMatch(/src[\\/]index\.ts.*error TS2322/)
    expect(existsSync(join(root, backup))).toBe(false)
  })
})
