/**
 * `mlcl sandbox exec` against a local HTTP mock: the command line the sandbox shell receives, and
 * the exit status a script sees. Arguments were joined with spaces, so `-- sh -c 'cd app && x'`
 * ran `cd` alone and `x` at the workspace root, and a failing command still exited 0 (2026-11-18).
 */
import { createServer, type Server } from 'node:http'
import { join } from 'node:path'

import { Command, Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import SandboxExecCmd, { commandLine, shellQuote } from '../sandbox/exec.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

describe('commandLine', () => {
  it('sends one argument as the whole command line, as written', () => {
    expect(commandLine(['cd my-app && npm test'])).toBe('cd my-app && npm test')
    expect(commandLine(['npm'])).toBe('npm')
  })

  it('quotes each of several arguments so the shell sees exactly those words', () => {
    expect(commandLine(['sh', '-c', 'cd my-app && npm test'])).toBe("sh -c 'cd my-app && npm test'")
    expect(commandLine(['npm', 'test'])).toBe('npm test')
    expect(commandLine(['echo', "it's", ''])).toBe(`echo 'it'\\''s' ''`)
  })

  it('leaves plain words alone and quotes shell syntax', () => {
    expect(shellQuote('/workspace/my-app')).toBe('/workspace/my-app')
    expect(shellQuote('--name=x')).toBe('--name=x')
    expect(shellQuote('$HOME')).toBe("'$HOME'")
    expect(shellQuote('a;b')).toBe("'a;b'")
  })
})

describe('sandbox exec — what runs and how it exits', () => {
  let server: Server
  const commands: string[] = []
  let answer: { stdout?: string; stderr?: string; exitCode?: number } = {}

  beforeEach(async () => {
    commands.length = 0
    answer = { stdout: 'ok', exitCode: 0 }
    vi.spyOn(Command.prototype, 'log').mockImplementation(() => {})
    server = createServer((req, res) => {
      let body = ''
      req.on('data', (chunk) => (body += chunk))
      req.on('end', () => {
        commands.push((JSON.parse(body) as { command: string }).command)
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(answer))
      })
    })
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
    process.env.MOLECULE_API_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}`
    process.env.MOLECULE_TOKEN = 'tok_test'
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    delete process.env.MOLECULE_API_URL
    delete process.env.MOLECULE_TOKEN
    await new Promise<void>((r) => server.close(() => r()))
  })

  const run = async (...argv: string[]): Promise<void> => {
    const config = await Config.load(MLCL_ROOT)
    await new SandboxExecCmd(['--project', 'p1', '--', ...argv], config).run()
  }

  it('keeps the quoting of an sh -c script', async () => {
    await run('sh', '-c', 'cd /workspace/my-app && npm run build')
    expect(commands).toEqual(["sh -c 'cd /workspace/my-app && npm run build'"])
  })

  it('exits with the command’s non-zero exit code', async () => {
    answer = { stdout: '', stderr: 'boom', exitCode: 3 }
    await expect(run('false')).rejects.toMatchObject({ oclif: { exit: 3 } })
  })

  it('a command that succeeds exits normally (counterexample)', async () => {
    await expect(run('true')).resolves.toBeUndefined()
    expect(commands).toEqual(['true'])
  })
})
