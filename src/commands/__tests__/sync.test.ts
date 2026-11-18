/**
 * `mlcl sync` against a local HTTP mock: what leaves the machine. A project's .gitignore says
 * which files are not source, secrets that are gitignored by convention must never be uploaded,
 * and one huge file must not be read whole into the request.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { Command, Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Sync, { isSecretPath, sandboxAppDir, visibleFromGit } from '../sync.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

describe('isSecretPath', () => {
  it.each([
    'api/.keys/development/jwt_private_key.pem',
    'server.key',
    '.npmrc',
    'app/.envrc',
    'api/.dev.vars',
    '.mol-scratch/x.txt',
    'debug.log',
    'id_ed25519',
    '.ssh/config',
  ])('refuses %s', (rel) => expect(isSecretPath(rel)).toBe(true))

  it.each(['src/index.ts', 'README.md', '.env.example', 'public/robots.txt', 'src/keyboard.ts'])(
    'allows %s',
    (rel) => expect(isSecretPath(rel)).toBe(false),
  )
})

describe('visibleFromGit', () => {
  const none = (): boolean => false

  it('covers every file under a directory git lists as one entry (nested repo, submodule)', () => {
    const visible = visibleFromGit(['src/a.ts', 'vendor-lib/', 'sub'], (entry) => entry === 'sub')
    expect(visible('src/a.ts')).toBe(true)
    expect(visible('vendor-lib/index.js')).toBe(true)
    expect(visible('sub/deep/file.txt')).toBe(true)
    expect(visible('other/file.txt')).toBe(false)
    expect(visible('vendor-lib-x/file.txt')).toBe(false)
  })

  it('compares names normalised, so a decomposed name from macOS still matches', () => {
    const decomposed = 'caf\u0065\u0301.txt'
    const composed = 'caf\u00e9.txt'
    expect(visibleFromGit([decomposed], none)(composed)).toBe(true)
    expect(visibleFromGit([composed], none)(decomposed)).toBe(true)
  })
})

describe('sync — what gets uploaded', () => {
  let server: Server
  let dir: string
  const sent: string[] = []
  const execs: string[] = []
  // What the sandbox's /etc/mol/app-root holds ('': a root-layout project with no marker).
  let appRoot = ''

  beforeEach(async () => {
    sent.length = 0
    execs.length = 0
    appRoot = ''
    vi.spyOn(Command.prototype, 'log').mockImplementation(() => {})
    server = createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' })
      if ((req.url ?? '').endsWith('/sandbox/exec')) {
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', () => {
          execs.push((JSON.parse(body) as { command: string }).command)
          res.end(JSON.stringify({ stdout: appRoot ? appRoot + '\n' : '', exitCode: 0 }))
        })
        return
      }
      sent.push(decodeURIComponent((req.url ?? '').replace(/^.*\/files\//, '')))
      res.end('{}')
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    process.env.MOLECULE_API_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}`
    process.env.MOLECULE_TOKEN = 'tok_test'
    dir = mkdtempSync(join(tmpdir(), 'mlcl-sync-'))
    // A no-git fixture must remain outside an enclosing checkout's git
    // discovery, including when the test runner's TMPDIR lives in that checkout.
    vi.stubEnv('GIT_CEILING_DIRECTORIES', dirname(dir))
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    delete process.env.MOLECULE_API_URL
    delete process.env.MOLECULE_TOKEN
    rmSync(dir, { recursive: true, force: true })
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  const write = (rel: string, content: string): void => {
    const full = join(dir, rel)
    mkdirSync(join(full, '..'), { recursive: true })
    writeFileSync(full, content)
  }

  const run = async (...extra: string[]): Promise<void> => {
    const config = await Config.load(MLCL_ROOT)
    await new Sync([dir, '--project', 'p1', ...extra], config).run()
  }

  it('writes under the app directory the sandbox records, never over the workspace root', async () => {
    // 2026-11-18: a sync with no --dest wrote a project's package.json over /workspace/package.json,
    // the platform-owned root that lists the baked dependencies, and the deploy built my-app anyway.
    appRoot = '/workspace/my-app'
    write('package.json', '{}\n')
    write('app/index.html', '<p>hi</p>\n')
    await run()
    expect(execs).toEqual(['cat /etc/mol/app-root 2>/dev/null || true'])
    expect(sent.sort()).toEqual(['my-app/app/index.html', 'my-app/package.json'])
  })

  it('--dest wins without asking the sandbox, and --dest . writes at the workspace root', async () => {
    appRoot = '/workspace/my-app'
    write('src/index.ts', 'export {}\n')
    await run('--dest', 'other')
    await run('--dest', '.')
    expect(execs).toEqual([])
    expect(sent).toEqual(['other/src/index.ts', 'src/index.ts'])
  })

  it('follows .gitignore in a git repository and never sends credentials or oversized files', async () => {
    execFileSync('git', ['init', '-q'], { cwd: dir })
    write('.gitignore', 'generated/\n')
    write('src/index.ts', 'export {}\n')
    write('generated/out.ts', 'x')
    write('api/.keys/dev/jwt.pem', 'PRIVATE')
    write('.npmrc', '//registry:_authToken=abc')
    write('big.txt', 'a'.repeat(2 * 1024 * 1024))
    await run()
    expect(sent.sort()).toEqual(['.gitignore', 'src/index.ts'])
  })

  it('sends the files of a nested repository instead of dropping them', async () => {
    execFileSync('git', ['init', '-q'], { cwd: dir })
    write('src/index.ts', 'export {}\n')
    write('vendor-lib/lib.js', 'module.exports = 1\n')
    execFileSync('git', ['init', '-q'], { cwd: join(dir, 'vendor-lib') })
    await run()
    expect(sent.sort()).toEqual(['src/index.ts', 'vendor-lib/lib.js'])
  })

  it('without a git repository still refuses credential files', async () => {
    write('src/index.ts', 'export {}\n')
    write('.envrc', 'export TOKEN=abc')
    write('server.key', 'PRIVATE')
    write('.env', 'A=1')
    await run()
    expect(sent).toEqual(['src/index.ts'])
  })
})

describe('sandboxAppDir', () => {
  const answering = (stdout?: string) => async () => ({ stdout, exitCode: 0 })

  it('reads the app directory from the marker', async () => {
    await expect(sandboxAppDir('p1', answering('/workspace/my-app\n'))).resolves.toBe('my-app')
    await expect(sandboxAppDir('p1', answering('/workspace/shop/'))).resolves.toBe('shop')
  })

  it('treats no marker, or one naming /workspace, as a root-layout project', async () => {
    await expect(sandboxAppDir('p1', answering(''))).resolves.toBe('')
    await expect(sandboxAppDir('p1', answering(undefined))).resolves.toBe('')
    await expect(sandboxAppDir('p1', answering('/workspace\n'))).resolves.toBe('')
  })

  it('refuses a marker outside the workspace or one that climbs out of it', async () => {
    for (const root of ['/etc', '/workspace/a/b', '/workspace/..', 'relative'])
      await expect(sandboxAppDir('p1', answering(root))).rejects.toThrow(/pass --dest/)
  })
})
