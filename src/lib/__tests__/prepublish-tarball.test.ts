import { spawn, spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

const ROOT = path.resolve(import.meta.dirname, '../../..')
const GATE = path.join(ROOT, 'scripts/prepublish-verify.mjs')
const scratch = path.resolve(ROOT, '../fixtures')
const fixtures: string[] = []
const sha = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex')

afterEach(() => {
  fixtures.splice(0).forEach((dir) => fs.rmSync(dir, { recursive: true, force: true }))
})

function fixture(): {
  dir: string
  env: NodeJS.ProcessEnv
  run: (args: string[], env?: NodeJS.ProcessEnv) => SpawnSyncReturns<string>
} {
  fs.mkdirSync(scratch, { recursive: true })
  const dir = fs.mkdtempSync(path.join(scratch, 'npm-'))
  fixtures.push(dir)
  fs.mkdirSync(path.join(dir, 'scripts'))
  fs.mkdirSync(path.join(dir, 'bin'))
  fs.mkdirSync(path.join(dir, 'dist'))
  fs.copyFileSync(GATE, path.join(dir, 'scripts/prepublish-verify.mjs'))
  fs.writeFileSync(path.join(dir, 'LICENSE'), 'Apache-2.0\n')
  fs.writeFileSync(path.join(dir, 'README.md'), 'A public fixture.\n')
  fs.writeFileSync(path.join(dir, 'bin/run.js'), 'export const value = 1\n')
  fs.writeFileSync(
    path.join(dir, 'hooks.cjs'),
    `
const fs = require('node:fs');
const hook = process.argv[2];
fs.appendFileSync('lifecycle.log', hook + '\\n');
if (hook === 'prepack') fs.writeFileSync('oclif.manifest.json', process.env.MANIFEST_TEXT || '{}');
if (hook === 'postpack') fs.rmSync('oclif.manifest.json');
`,
  )
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({
      name: 'mlcl',
      version: '0.0.0',
      type: 'module',
      files: ['bin', 'dist', 'oclif.manifest.json'],
      scripts: {
        prepack: 'node hooks.cjs prepack',
        postpack: 'node hooks.cjs postpack',
        prepublishOnly: 'node hooks.cjs gate && node scripts/prepublish-verify.mjs',
      },
    }),
  )
  const userConfig = path.join(dir, '.npmrc')
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NPM_CONFIG_USERCONFIG: userConfig,
    NPM_CONFIG_CACHE: path.join(dir, '.cache'),
    MLCL_ALLOW_PUBLISH: '1',
  }
  delete env.MLCL_ALLOW_DEEP_HISTORY
  fs.writeFileSync(userConfig, 'registry=http://127.0.0.1:1\n')
  const run = (args: string[], extra: NodeJS.ProcessEnv = {}): SpawnSyncReturns<string> =>
    spawnSync(args[0], args.slice(1), {
      cwd: dir,
      env: { ...env, ...extra },
      encoding: 'utf8',
      timeout: 30_000,
    })
  expect(run(['git', 'init', '-q']).status).toBe(0)
  expect(
    run([
      'git',
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.invalid',
      'commit',
      '--allow-empty',
      '-qm',
      'fixture',
    ]).status,
  ).toBe(0)
  return { dir, env, run }
}

function pack(f: ReturnType<typeof fixture>, env: NodeJS.ProcessEnv = {}): string {
  const packed = f.run(['npm', 'pack', '--json'], env)
  expect(packed.status, String(packed.stderr)).toBe(0)
  return path.join(f.dir, 'mlcl-0.0.0.tgz')
}

function verify(f: ReturnType<typeof fixture>, tarball: string): SpawnSyncReturns<string> {
  return f.run([process.execPath, 'scripts/prepublish-verify.mjs', '--tarball', tarball])
}

describe('the exact prepared npm tarball', () => {
  it('verifies postpack-removed files and sends the same bytes through real npm publication without repeating lifecycle hooks', async () => {
    const f = fixture()
    const tarball = pack(f)
    const bytes = fs.readFileSync(tarball)
    expect(fs.existsSync(path.join(f.dir, 'oclif.manifest.json'))).toBe(false)
    const checked = verify(f, tarball)
    expect(checked.status, String(checked.stdout) + String(checked.stderr)).toBe(0)
    expect(fs.readFileSync(path.join(f.dir, 'lifecycle.log'), 'utf8')).toBe('prepack\npostpack\n')
    // Publishing the approved tarball must not re-read or repack this later edit.
    fs.writeFileSync(path.join(f.dir, 'README.md'), '/home/z/changed-after-approval')
    let received: Buffer | undefined
    const server = createServer((req, res) => {
      const chunks: Buffer[] = []
      req.on('data', (chunk: Buffer) => chunks.push(chunk))
      req.on('end', () => {
        if (req.method === 'PUT') {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
          const entry = Object.values(body._attachments)[0] as { data: string }
          received = Buffer.from(entry.data, 'base64')
          res.writeHead(201, { 'content-type': 'application/json' }).end('{"ok":true}')
        } else
          res.writeHead(404, { 'content-type': 'application/json' }).end('{"error":"not_found"}')
      })
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    try {
      const address = server.address()
      if (typeof address !== 'object' || address === null) throw new Error('No loopback listener')
      const registry = `http://127.0.0.1:${address.port}`
      fs.writeFileSync(
        f.env.NPM_CONFIG_USERCONFIG!,
        `registry=${registry}\n//127.0.0.1:${address.port}/:_authToken=local-fixture\n`,
      )
      const result = await new Promise<{ code: number | null; output: string }>(
        (resolve, reject) => {
          const child = spawn(
            'npm',
            [
              'publish',
              tarball,
              '--registry',
              registry,
              '--access',
              'public',
              '--fetch-retries=0',
              '--fetch-timeout=5000',
            ],
            { cwd: f.dir, env: f.env, timeout: 15_000 },
          )
          let output = ''
          child.stdout.on('data', (chunk) => {
            output += String(chunk)
          })
          child.stderr.on('data', (chunk) => {
            output += String(chunk)
          })
          child.on('error', reject)
          child.on('exit', (code) => resolve({ code, output }))
        },
      )
      expect(result.code, result.output).toBe(0)
      expect(received).toEqual(bytes)
      expect(sha(received!)).toBe(sha(bytes))
      expect(fs.readFileSync(path.join(f.dir, 'lifecycle.log'), 'utf8')).toBe('prepack\npostpack\n')
    } finally {
      server.closeAllConnections()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  }, 30_000)

  it.each([
    ['personal path', '/home/z/private'],
    ['private repository', 'gitlab.com/molecule-dev/private'],
    ['private key', ['-----BEGIN ', 'PRIVATE KEY-----\nnot-a-real-key'].join('')],
    [
      'credentialed service',
      ['postgres://person', ':private-value@database.example.net/db'].join(''),
    ],
  ])('refuses %s in the archive even after the working file is cleaned', (_name, content) => {
    const f = fixture()
    fs.writeFileSync(path.join(f.dir, 'README.md'), content)
    const tarball = pack(f)
    fs.writeFileSync(path.join(f.dir, 'README.md'), 'Now clean\n')
    expect(verify(f, tarball).status).not.toBe(0)
  })

  it('does not skip bad generated metadata removed by postpack', () => {
    const f = fixture()
    const tarball = pack(f, { MANIFEST_TEXT: '/home/z/private' })
    expect(fs.existsSync(path.join(f.dir, 'oclif.manifest.json'))).toBe(false)
    expect(verify(f, tarball).status).not.toBe(0)
  })

  it('checks required files inside the archive, not the working tree', () => {
    const f = fixture()
    fs.rmSync(path.join(f.dir, 'LICENSE'))
    const tarball = pack(f)
    fs.writeFileSync(path.join(f.dir, 'LICENSE'), 'Restored after pack')
    expect(verify(f, tarball).status).not.toBe(0)
  })

  it('retains forbidden archive-path guards', () => {
    const f = fixture()
    const manifestPath = path.join(f.dir, 'package.json')
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    manifest.files.push('.env')
    fs.writeFileSync(manifestPath, JSON.stringify(manifest))
    fs.writeFileSync(path.join(f.dir, '.env'), 'FIXTURE_ONLY=true')
    expect(verify(f, pack(f)).status).not.toBe(0)
  })

  it('retains the explicit authorization guard for bare folder publication', () => {
    const f = fixture()
    const result = f.run(['npm', 'publish', '--dry-run'], { MLCL_ALLOW_PUBLISH: '' })
    expect(result.status).not.toBe(0)
    expect(String(result.stderr)).toContain('publish is intentionally deferred')
  })

  it('retains the history guard', () => {
    const f = fixture()
    expect(
      f.run(
        [
          'git',
          '-c',
          'user.name=Fixture',
          '-c',
          'user.email=fixture@example.invalid',
          'commit',
          '--amend',
          '--allow-empty',
          '--no-edit',
          '--date=2020-01-01T00:00:00Z',
        ],
        { GIT_COMMITTER_DATE: '2020-01-01T00:00:00Z' },
      ).status,
    ).toBe(0)
    expect(verify(f, pack(f)).status).not.toBe(0)
  })
})
