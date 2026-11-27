/**
 * A showcase's dev server is started on the port its comparisons go to.
 *
 * `startShowcaseServer` starts Vite through npx, with `--no` so that a Vite the showcase does not have is refused
 * instead of downloaded. On npm 11.20 a flag written right after the package name is npm's own to read: the launch
 * that `--no` was added in (mlcl 04bf6c5be9, `npx --no vite --port 5899 --strictPort`) handed Vite only the number,
 * so every showcase listened on Vite's default port and every comparison failed on a refused connection
 * (2026-11-27).
 *
 * The first test runs the real function with stand-ins for npm and npx on PATH and reads the arguments npx is
 * given. The second gives that shape to the real npx, with a stand-in for vite, and reads what the tool receives.
 *
 * VISUAL_TEST_IMPL names another module with `startShowcaseServer` and `stopShowcaseServers`, to judge: the
 * known-bad proof runs a copy that launches Vite the way 04bf6c5be9 committed it.
 *
 * @module
 */

import { execFileSync } from 'node:child_process'
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as VisualTest from '../visual-test.js'

const implementation = (await import(
  process.env.VISUAL_TEST_IMPL ?? '../visual-test.js'
)) as typeof VisualTest

const PORT = 5899
/** What npx is given, and what Vite then receives. */
const NPX_ARGUMENTS = ['--no', '--', 'vite', '--port', String(PORT), '--strictPort']
const VITE_ARGUMENTS = ['--port', String(PORT), '--strictPort']

/** A stand-in on PATH that writes its arguments to `RECORD_FILE` and then does what is asked of it. */
const STAND_IN = `#!/usr/bin/env node
const { appendFileSync } = require('node:fs')
appendFileSync(process.env.RECORD_FILE, JSON.stringify(process.argv.slice(2)) + '\\n')
`

let scratch: string

beforeEach(async () => {
  scratch = await mkdtemp(join(tmpdir(), 'showcase-server-'))
})

afterEach(async () => {
  vi.unstubAllEnvs()
  await rm(scratch, { recursive: true, force: true })
})

/**
 * Writes an executable stand-in into a directory on PATH.
 *
 * @param dir - The directory of the stand-ins.
 * @param name - The command it stands in for.
 * @param behavior - What it does after recording its arguments.
 */
async function standIn(dir: string, name: string, behavior: string): Promise<void> {
  await mkdir(dir, { recursive: true })
  const file = join(dir, name)
  await writeFile(file, STAND_IN + behavior)
  await chmod(file, 0o755)
}

/** The arguments each stand-in was given, oldest first. */
async function recorded(): Promise<string[][]> {
  return (await readFile(join(scratch, 'arguments'), 'utf8'))
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as string[])
}

describe('showcase dev server', () => {
  it('is started through npx on its port, with -- between npx and Vite', async () => {
    const path = process.env.PATH
    const bin = join(scratch, 'bin')
    // npm's install succeeds at once; npx reads as a Vite that is ready and keeps running until it is stopped.
    await standIn(bin, 'npm', 'process.exit(0)\n')
    await standIn(
      bin,
      'npx',
      "console.log('  VITE v8.3.5  ready in 40 ms')\nsetInterval(() => {}, 1000)\n",
    )
    vi.stubEnv('PATH', `${bin}${delimiter}${path}`)
    vi.stubEnv('RECORD_FILE', join(scratch, 'arguments'))
    vi.stubEnv('MOLECULE_SHOWCASE_PACKAGES', 'npm')
    // The showcase directory `createShowcaseProject` would have written.
    const showcase = join(scratch, 'showcase')
    await mkdir(showcase)

    const project = await implementation.startShowcaseServer(showcase, 'react', PORT)
    expect(project.url).toBe(`http://localhost:${PORT}`)
    implementation.stopShowcaseServers([project])
    await new Promise((done) => project.process.once('exit', done))

    expect(await recorded()).toEqual([expect.arrayContaining(['install']), NPX_ARGUMENTS])
  })

  it('npx hands --port and --strictPort to the tool, not to itself', async () => {
    const project = join(scratch, 'project')
    // What npx needs to find to run a project's own tool without downloading it: the tool's package and its bin.
    await mkdir(join(project, 'node_modules', 'vite'), { recursive: true })
    await writeFile(
      join(project, 'node_modules', 'vite', 'package.json'),
      '{"name":"vite","version":"0.0.0","bin":{"vite":"../.bin/vite"}}',
    )
    await standIn(join(project, 'node_modules', '.bin'), 'vite', '')

    execFileSync('npx', NPX_ARGUMENTS, {
      cwd: project,
      env: { ...process.env, RECORD_FILE: join(scratch, 'arguments') },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    expect(await recorded()).toEqual([VITE_ARGUMENTS])
  })
})
