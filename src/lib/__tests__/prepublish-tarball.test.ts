import { spawn, spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { brotliCompressSync } from 'node:zlib'

import ts from 'typescript'
import { afterEach, describe, expect, it } from 'vitest'

import { singlePackResult } from '../npm-pack-json.js'
import { decodeTemplateTree } from '../template-tree.js'

const ROOT = path.resolve(import.meta.dirname, '../../..')
const GATE = path.join(ROOT, 'scripts/prepublish-verify.mjs')
const scratch = tmpdir()
const fixtures: string[] = []
const sha = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex')

afterEach(() => {
  fixtures.splice(0).forEach((dir) => fs.rmSync(dir, { recursive: true, force: true }))
})

function fixture(oldHistory = false): {
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
  fs.mkdirSync(path.join(dir, 'build-inputs'))
  fs.mkdirSync(path.join(dir, 'templates/apps'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'templates/apps/registry.json'), '{"templates":{}}')
  for (const file of [
    'npm-pack-json',
    'template-dotfiles',
    'template-locales',
    'template-package',
    'template-tree',
  ]) {
    const source = fs.readFileSync(path.join(ROOT, 'src/lib', `${file}.ts`), 'utf8')
    fs.writeFileSync(
      path.join(dir, 'build-inputs', `${file}.js`),
      ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      }).outputText,
    )
  }
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
if (hook === 'prepack') {
  fs.writeFileSync('oclif.manifest.json', process.env.MANIFEST_TEXT || '{}');
  fs.mkdirSync('dist/lib', {recursive:true});
  for (const file of fs.readdirSync('build-inputs')) fs.copyFileSync('build-inputs/'+file, 'dist/lib/'+file);
}
if (hook === 'postpack') fs.rmSync('oclif.manifest.json');
`,
  )
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({
      name: 'mlcl',
      version: '0.0.0',
      type: 'module',
      files: ['bin', 'dist', 'oclif.manifest.json', 'templates'],
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
      env: {
        ...env,
        ...(oldHistory
          ? { GIT_AUTHOR_DATE: '2020-01-01T00:00:00Z', GIT_COMMITTER_DATE: '2020-01-01T00:00:00Z' }
          : {}),
        ...extra,
      },
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

function listedTemplate(f: ReturnType<typeof fixture>, slug: string): string {
  fs.writeFileSync(
    path.join(f.dir, 'templates/apps/registry.json'),
    JSON.stringify({ templates: { [slug]: { label: 'Fixture' } } }),
  )
  const dir = path.join(f.dir, 'templates/apps', slug)
  fs.mkdirSync(dir)
  fs.writeFileSync(path.join(dir, 'template.json'), '{"label":"Fixture"}')
  fs.writeFileSync(path.join(dir, 'CATALOG.md'), '# Fixture\n')
  for (const filename of ['eslint.config.js.tpl', 'prefer-generated-resource-clients.mjs']) {
    const shared = path.join(f.dir, 'templates/shared')
    fs.mkdirSync(shared, { recursive: true })
    fs.writeFileSync(path.join(shared, filename), 'export default []\n')
  }
  return dir
}

function writeListedTree(dir: string, files: Record<string, string>): void {
  fs.writeFileSync(
    path.join(dir, 'tree.json.br'),
    brotliCompressSync(
      Buffer.from(
        JSON.stringify({
          schema: 1,
          files: Object.fromEntries(
            Object.entries(files).map(([rel, text]) => [rel, { mode: 0o644, text }]),
          ),
        }),
      ),
    ),
  )
}

const listingFiles = { 'template.json': '{"label":"Fixture"}', 'CATALOG.md': '# Fixture\n' }
const appFiles = {
  ...listingFiles,
  'app/package.json': '{"name":"fixture-app"}',
  'dotfiles.json': '{"schema":1,"files":{".gitignore":".env*"}}',
}

/** Run the production template-tree scripts from inside npm's own lifecycle. */
function hookTemplatePacking(f: ReturnType<typeof fixture>, hideNpmFromPath = false): void {
  fs.copyFileSync(
    path.join(ROOT, 'scripts/template-trees.mjs'),
    path.join(f.dir, 'scripts/template-trees.mjs'),
  )
  const file = path.join(f.dir, 'package.json')
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (hideNpmFromPath) {
    fs.writeFileSync(
      path.join(f.dir, 'no-npm-on-path.mjs'),
      "process.env.PATH = import.meta.dirname + '/empty-bin'\n" +
        "await import('./scripts/template-trees.mjs')\n",
    )
  }
  const entry = hideNpmFromPath ? 'no-npm-on-path.mjs' : 'scripts/template-trees.mjs'
  manifest.scripts.prepack += ` && node ${entry} pack`
  manifest.scripts.postpack = `node scripts/template-trees.mjs clean && ${manifest.scripts.postpack}`
  fs.writeFileSync(file, JSON.stringify(manifest))
}

function writeTemplateApp(dir: string): void {
  for (const [rel, data] of Object.entries(appFiles)) {
    const file = path.join(dir, rel)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, data)
  }
}

function unpackedTree(
  f: ReturnType<typeof fixture>,
  tgz: string,
): ReturnType<typeof decodeTemplateTree> {
  const unpacked = path.join(f.dir, 'unpacked')
  fs.mkdirSync(unpacked)
  expect(f.run(['tar', '-xzf', tgz, '-C', unpacked]).status).toBe(0)
  const archive = path.join(unpacked, 'package/templates/apps/fixture/tree.json.br')
  return decodeTemplateTree(fs.readFileSync(archive), archive)
}

describe('the exact prepared npm tarball', () => {
  it('checks a fresh folder whose prepack must first build the inspection helpers', () => {
    const f = fixture()
    expect(fs.existsSync(path.join(f.dir, 'dist/lib/template-locales.js'))).toBe(false)
    const checked = f.run([process.execPath, 'scripts/prepublish-verify.mjs'])
    expect(checked.status, String(checked.stdout) + String(checked.stderr)).toBe(0)
  })

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
    const f = fixture(true)
    expect(verify(f, pack(f)).status).not.toBe(0)
  })

  it.each([true, false])(
    'blocks a registered template without a tree (metadata present: %s)',
    (kept) => {
      const f = fixture()
      const dir = listedTemplate(f, 'fixture')
      if (!kept) fs.rmSync(dir, { recursive: true })
      const checked = verify(f, pack(f))
      expect(checked.status).toBe(1)
      expect(checked.stderr).toContain('flagship fixture missing tree.json.br')
    },
  )

  it('blocks a tree missing the shipped app workspace and checks the packaged index', () => {
    const f = fixture()
    const dir = listedTemplate(f, 'fixture')
    writeListedTree(dir, listingFiles)
    const missing = verify(f, pack(f))
    expect(missing.status).toBe(1)
    expect(missing.stderr).toContain('flagship fixture tree missing app/package.json')

    writeListedTree(dir, appFiles)
    const valid = verify(f, pack(f))
    expect(valid.status, valid.stderr).toBe(0)
    fs.rmSync(path.join(f.dir, 'templates/apps/registry.json'))
    const noIndex = verify(f, pack(f))
    expect(noIndex.status).toBe(1)
    expect(noIndex.stderr).toContain('cannot inspect packed template index')
  })

  it('sweeps the physical listing when the inner file has the same path', () => {
    const f = fixture()
    const dir = listedTemplate(f, 'fixture')
    writeListedTree(dir, appFiles)
    fs.writeFileSync(path.join(dir, 'CATALOG.md'), '# Fixture\n\n/home/z/private\n')
    const checked = verify(f, pack(f))
    expect(checked.status).toBe(1)
    expect(checked.stderr).toContain('templates/apps/fixture/CATALOG.md: personal home path')
    expect(checked.stderr).toContain('flagship fixture has different copies of CATALOG.md')
  })

  it('checks the dotfile manifest schema the scaffold requires', () => {
    const f = fixture()
    const dir = listedTemplate(f, 'fixture')
    writeListedTree(dir, {
      ...appFiles,
      'dotfiles.json': '{"schema":2,"files":{".gitignore":".env*"}}',
    })
    const checked = verify(f, pack(f))
    expect(checked.status).toBe(1)
    expect(checked.stderr).toContain('packed dotfiles.json unusable: fixture')
  })

  it('checks every path in a nested dotfiles manifest against the scaffold rules', () => {
    const f = fixture()
    const dir = listedTemplate(f, 'fixture')
    writeListedTree(dir, {
      ...appFiles,
      'dotfiles.json': '{"schema":1,"files":{".gitignore":".env*","app/readme.txt":"unexpected"}}',
    })
    const checked = verify(f, pack(f))
    expect(checked.status).toBe(1)
    expect(checked.stderr).toContain('app/readme.txt, which is not a template dot file')
  })

  it('uses the running npm executable for the nested pack during prepack', () => {
    const f = fixture()
    writeTemplateApp(listedTemplate(f, 'fixture'))
    hookTemplatePacking(f, true)
    const tgz = pack(f)
    expect(unpackedTree(f, tgz)).toHaveProperty('app/package.json')
    expect(verify(f, tgz).status).toBe(0)
  })

  it('retains the modes in npm’s original tarball', () => {
    const f = fixture()
    const dir = listedTemplate(f, 'fixture')
    writeTemplateApp(dir)
    const rel = 'app/run.sh'
    fs.writeFileSync(path.join(dir, rel), '#!/bin/sh\n', { mode: 0o555 })
    const raw = f.run(['npm', 'pack', '--dry-run', '--json', '--ignore-scripts'])
    expect(raw.status, raw.stderr).toBe(0)
    const file = singlePackResult(raw.stdout).files.find((f) => f.path.endsWith(`/${rel}`))
    expect(file).toMatchObject({ mode: 0o755 })
    hookTemplatePacking(f)
    expect(unpackedTree(f, pack(f))[rel].mode).toBe(0o755)
  })

  it('cleans a partial generated ignore left by an interrupted prepack and repacks', () => {
    const f = fixture()
    const dir = listedTemplate(f, 'fixture')
    writeTemplateApp(dir)
    hookTemplatePacking(f)
    fs.writeFileSync(path.join(dir, 'tree.json.br'), 'partial archive')
    fs.writeFileSync(
      path.join(dir, '.npmignore'),
      '# Written by prepack (src/lib/template-tree.ts)',
    )
    fs.writeFileSync(path.join(dir, '.mlcl-tree-npmignore.tmp'), 'partial pending ignore')
    const tgz = pack(f)
    expect(unpackedTree(f, tgz)).not.toHaveProperty('.mlcl-tree-npmignore.tmp')
    expect(fs.readdirSync(dir)).toEqual(['CATALOG.md', 'app', 'dotfiles.json', 'template.json'])
    expect(verify(f, tgz).status).toBe(0)
  })

  it.each(['archive', 'folder'])(
    'scans credentials inside compressed locale manifests (%s)',
    (mode) => {
      const f = fixture()
      const template = path.join(f.dir, 'templates/apps/fixture')
      fs.mkdirSync(template, { recursive: true })
      const manifestPath = path.join(f.dir, 'package.json')
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      manifest.files.push('templates')
      fs.writeFileSync(manifestPath, JSON.stringify(manifest))
      fs.writeFileSync(
        path.join(template, 'locales.json.br'),
        brotliCompressSync(
          Buffer.from(JSON.stringify({ schema: 1, files: { 'fr/ui.ts': '/home/z/private' } })),
        ),
      )
      const result =
        mode === 'archive'
          ? verify(f, pack(f))
          : f.run([process.execPath, 'scripts/prepublish-verify.mjs'])
      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain('personal home path')
      expect(result.stderr).toContain('app/src/locales/fr/ui.ts')
    },
  )

  it.each(['archive', 'folder'])(
    "scans the files inside a flagship's tree manifest, nested locale manifests included (%s)",
    (mode) => {
      // OLD MUSTFAIL: the gate swept only files npm lists, and a tree manifest is one opaque file.
      const f = fixture()
      const template = path.join(f.dir, 'templates/apps/fixture')
      fs.mkdirSync(template, { recursive: true })
      const manifestPath = path.join(f.dir, 'package.json')
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      manifest.files.push('templates')
      fs.writeFileSync(manifestPath, JSON.stringify(manifest))
      const locales = brotliCompressSync(
        Buffer.from(JSON.stringify({ schema: 1, files: { 'de/ui.ts': '/home/y/private' } })),
      )
      fs.writeFileSync(
        path.join(template, 'tree.json.br'),
        brotliCompressSync(
          Buffer.from(
            JSON.stringify({
              schema: 1,
              files: {
                'app/src/config.ts': { mode: 0o644, text: 'const dir = "/home/z/private"\n' },
                'locales.json.br': { mode: 0o644, base64: locales.toString('base64') },
              },
            }),
          ),
        ),
      )
      const result =
        mode === 'archive'
          ? verify(f, pack(f))
          : f.run([process.execPath, 'scripts/prepublish-verify.mjs'])
      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain(
        'templates/apps/fixture/app/src/config.ts: personal home path',
      )
      expect(result.stderr).toContain(
        'templates/apps/fixture/app/src/locales/de/ui.ts: personal home path',
      )
    },
  )

  it('refuses a tree manifest that leaves its template directory', () => {
    const f = fixture()
    const template = path.join(f.dir, 'templates/apps/fixture')
    fs.mkdirSync(template, { recursive: true })
    const manifestPath = path.join(f.dir, 'package.json')
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    manifest.files.push('templates')
    fs.writeFileSync(manifestPath, JSON.stringify(manifest))
    fs.writeFileSync(
      path.join(template, 'tree.json.br'),
      brotliCompressSync(
        Buffer.from(
          JSON.stringify({
            schema: 1,
            files: { '../../../escape.ts': { mode: 0o644, text: 'x' } },
          }),
        ),
      ),
    )
    const result = verify(f, pack(f))
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain(
      'cannot inspect template tree templates/apps/fixture/tree.json.br',
    )
  })
})
