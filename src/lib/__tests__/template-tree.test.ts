/**
 * Each flagship ships as one tree manifest that a scaffold unpacks into the user's cache. npm
 * unpacks a package file by file: 2.2.13 shipped 29,413 files, 27,638 of them flagship files, and a
 * first `npx mlcl` spent about 20 of its 24 s unpacking them (the harness install eval, r38). These
 * run real `npm pack` over fixture packages.
 */
import { execFileSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { brotliCompressSync } from 'node:zlib'

import { afterEach, describe, expect, it } from 'vitest'

import { singlePackResult } from '../npm-pack-json.js'
import { TEMPLATE_SHARED_ESLINT, templatePackageIssues } from '../template-package.js'
import {
  cleanTemplateTrees,
  decodeTemplateTree,
  mlclCacheDir,
  packTemplateTrees,
  resolveTemplateDir,
  TEMPLATE_TREE_ARCHIVE,
} from '../template-tree.js'

const ROOT = resolve(import.meta.dirname, '../../..')
const scratch: string[] = []
afterEach(() => {
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true })
})

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff, 0xfe])

function write(root: string, file: string, data: string | Buffer, mode?: number): void {
  mkdirSync(dirname(join(root, file)), { recursive: true })
  writeFileSync(join(root, file), data)
  if (mode !== undefined) chmodSync(join(root, file), mode)
}

/** A package like mlcl's: `files: ['templates']` and the real templates/apps/.npmignore. */
function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), 'mlcl-tree-'))
  scratch.push(dir)
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'tree-fixture', version: '1.0.0', files: ['templates'] }),
  )
  mkdirSync(join(dir, 'templates/apps'), { recursive: true })
  copyFileSync(join(ROOT, 'templates/apps/.npmignore'), join(dir, 'templates/apps/.npmignore'))
  write(dir, 'templates/apps/registry.json', '{"templates":{}}\n')
  // A flagship workspace needs the shared ESLint sources the scaffold writes back.
  for (const shared of TEMPLATE_SHARED_ESLINT) write(dir, shared, readFileSync(join(ROOT, shared)))
  const app = 'templates/apps/fixture'
  write(dir, `${app}/template.json`, '{"label":"Fixture"}\n')
  write(dir, `${app}/CATALOG.md`, '# Fixture\n')
  write(dir, `${app}/app/package.json`, '{"name":"fixture-app"}\n')
  write(dir, `${app}/app/src/App.tsx`, 'export const App = () => "été 🌻"\r\n')
  write(dir, `${app}/app/public/logo.png`, PNG)
  write(dir, `${app}/api/scripts/start.sh`, '#!/bin/sh\necho up\n', 0o755)
  // Left out by templates/apps/.npmignore: the manifest must not bring it back.
  write(dir, `${app}/app/eslint.config.js`, 'export default []\n')
  return dir
}

function dryRun(dir: string): string[] {
  const raw = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: dir,
    encoding: 'utf8',
  })
  return singlePackResult(raw)
    .files.map((file) => file.path)
    .sort()
}

function packed(dir: string): {
  root: string
  files: { path: string; size: number }[]
  size: number
  unpackedSize: number
} {
  const pack = singlePackResult(
    execFileSync('npm', ['pack', '--ignore-scripts', '--json'], { cwd: dir, encoding: 'utf8' }),
  )
  const out = join(dir, 'unpacked')
  mkdirSync(out)
  execFileSync('tar', ['-xzf', join(dir, pack.filename), '-C', out])
  return { ...pack, root: join(out, 'package') }
}

/** Every file under `root`: its bytes and mode. */
function snapshot(root: string): Record<string, { data: string; mode: number }> {
  return Object.fromEntries(
    readdirSync(root, { recursive: true, withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => {
        const file = join(e.parentPath, e.name)
        return [
          relative(root, file),
          { data: readFileSync(file).toString('base64'), mode: statSync(file).mode & 0o777 },
        ]
      })
      .sort(([a], [b]) => a.localeCompare(b)),
  )
}

describe('flagship tree manifests', () => {
  it('ship each flagship as its listing files and one manifest, and unpack to the exact shipped tree', () => {
    const dir = fixture()
    const before = dryRun(dir)
    const app = join(dir, 'templates/apps/fixture')
    expect(before).toContain('templates/apps/fixture/app/public/logo.png')
    expect(before).not.toContain('templates/apps/fixture/app/eslint.config.js')
    const sourceBefore = snapshot(app)

    expect(packTemplateTrees(dir, before)).toMatchObject({ templates: 1, files: 6 })
    const p = packed(dir)
    // OLD MUSTFAIL: the package carried all six flagship files, each one unpacked by npm.
    expect(p.files.map((f) => f.path).sort()).toEqual([
      'package.json',
      'templates/apps/fixture/CATALOG.md',
      'templates/apps/fixture/template.json',
      `templates/apps/fixture/${TEMPLATE_TREE_ARCHIVE}`,
      'templates/apps/registry.json',
      ...TEMPLATE_SHARED_ESLINT,
    ])
    const trees = {
      fixture: Object.keys(
        decodeTemplateTree(
          readFileSync(join(p.root, `templates/apps/fixture/${TEMPLATE_TREE_ARCHIVE}`)),
          'fixture',
        ),
      ),
    }
    expect(templatePackageIssues(p, trees)).toEqual([])

    const cache = join(dir, 'cache')
    const shipped = join(p.root, 'templates/apps/fixture')
    chmodSync(shipped, 0o555) // the installed package is never written
    let unpacked: string
    try {
      unpacked = resolveTemplateDir(p.root, 'fixture', cache)
    } finally {
      chmodSync(shipped, 0o755)
    }
    expect(unpacked.startsWith(join(cache, 'templates'))).toBe(true)
    const expected = Object.fromEntries(
      Object.entries(sourceBefore).filter(([rel]) =>
        before.includes(`templates/apps/fixture/${rel}`),
      ),
    )
    expect(snapshot(unpacked)).toEqual(expected)
    expect(snapshot(unpacked)['api/scripts/start.sh'].mode).toBe(0o755)

    // A second scaffold reads the same copy without unpacking again.
    writeFileSync(join(unpacked, 'sentinel'), '')
    expect(resolveTemplateDir(p.root, 'fixture', cache)).toBe(unpacked)
    expect(existsSync(join(unpacked, 'sentinel'))).toBe(true)
    expect(readdirSync(join(cache, 'templates'))).toEqual([
      relative(join(cache, 'templates'), unpacked),
    ])

    // postpack leaves the source checkout as it was.
    expect(cleanTemplateTrees(dir)).toBe(1)
    expect(snapshot(app)).toEqual(sourceBefore)
    expect(dryRun(dir)).toEqual(before)
  }, 60_000)

  it('counterexample: a source checkout reads its templates in place', () => {
    const dir = fixture()
    const cache = join(dir, 'cache')
    expect(resolveTemplateDir(dir, 'fixture', cache)).toBe(join(dir, 'templates/apps/fixture'))
    expect(resolveTemplateDir(dir, 'absent', cache)).toBe(join(dir, 'templates/apps/absent'))
    expect(existsSync(cache)).toBe(false)
  })

  it('a changed manifest unpacks into its own directory', () => {
    const dir = fixture()
    const cache = join(dir, 'cache')
    packTemplateTrees(dir, dryRun(dir))
    const first = resolveTemplateDir(dir, 'fixture', cache)
    cleanTemplateTrees(dir)
    write(dir, 'templates/apps/fixture/app/src/App.tsx', 'export const App = () => "v2"\n')
    packTemplateTrees(dir, dryRun(dir))
    const second = resolveTemplateDir(dir, 'fixture', cache)
    expect(second).not.toBe(first)
    expect(readFileSync(join(second, 'app/src/App.tsx'), 'utf8')).toBe(
      'export const App = () => "v2"\n',
    )
    expect(readFileSync(join(first, 'app/src/App.tsx'), 'utf8')).toContain('été')
  })

  it.each([
    ['../escape.ts', { mode: 0o644, text: 'x' }],
    ['app/../../escape.ts', { mode: 0o644, text: 'x' }],
    ['/abs.ts', { mode: 0o644, text: 'x' }],
    ['app\\win.ts', { mode: 0o644, text: 'x' }],
    ['app//double.ts', { mode: 0o644, text: 'x' }],
    ['mode.ts', { mode: 0o4755, text: 'x' }],
    ['both.ts', { mode: 0o644, text: 'x', base64: 'eA==' }],
    ['neither.ts', { mode: 0o644 }],
  ])('refuses manifest entry %s before writing anything', (rel, entry) => {
    const dir = fixture()
    const app = join(dir, 'templates/apps/fixture')
    writeFileSync(
      join(app, TEMPLATE_TREE_ARCHIVE),
      brotliCompressSync(
        Buffer.from(
          JSON.stringify({
            schema: 1,
            files: { 'ok.ts': { mode: 0o644, text: 'ok' }, [rel]: entry },
          }),
        ),
      ),
    )
    const cache = join(dir, 'cache')
    expect(() => resolveTemplateDir(dir, 'fixture', cache)).toThrow('invalid template file')
    expect(
      existsSync(join(cache, 'templates')) ? readdirSync(join(cache, 'templates')) : [],
    ).toEqual([])
  })

  it('refuses a corrupt manifest and leaves no partial copy', () => {
    const dir = fixture()
    writeFileSync(join(dir, 'templates/apps/fixture', TEMPLATE_TREE_ARCHIVE), 'corrupt')
    const cache = join(dir, 'cache')
    expect(() => resolveTemplateDir(dir, 'fixture', cache)).toThrow()
    expect(
      existsSync(join(cache, 'templates')) ? readdirSync(join(cache, 'templates')) : [],
    ).toEqual([])
  })

  it("refuses to pack over a flagship's own .npmignore, and clean leaves one in place", () => {
    const dir = fixture()
    const own = join(dir, 'templates/apps/fixture/.npmignore')
    writeFileSync(own, 'secret.txt\n')
    expect(() => packTemplateTrees(dir, dryRun(dir))).toThrow('has its own .npmignore')
    expect(cleanTemplateTrees(dir)).toBe(0)
    expect(readFileSync(own, 'utf8')).toBe('secret.txt\n')
  })

  it('the pack check refuses the 2.2.13 layout and a manifest it did not read', () => {
    // OLD MUSTFAIL: 2.2.13 passed with 29,413 files, 27,638 of them unpacked flagship files.
    const old = templatePackageIssues({
      size: 77_313_077,
      unpackedSize: 200_000_000,
      files: [
        ...Array.from({ length: 27_638 }, (_, n) => ({
          path: `templates/apps/a/app/src/f${n}.ts`,
          size: 1,
        })),
        ...Array.from({ length: 1_775 }, (_, n) => ({ path: `dist/f${n}.js`, size: 1 })),
      ],
    }).join('\n')
    expect(old).toContain('29413 files exceeds 4000')
    expect(old).toContain('27638 flagship files shipped outside their tree.json.br')
    expect(
      templatePackageIssues({
        size: 1,
        unpackedSize: 1,
        files: [{ path: `templates/apps/a/${TEMPLATE_TREE_ARCHIVE}`, size: 1 }],
      }),
    ).toEqual([`template tree manifest not inspected: templates/apps/a/${TEMPLATE_TREE_ARCHIVE}`])
    // Representation checks read the manifest: an ESLint copy inside it is refused like a loose one.
    expect(
      templatePackageIssues(
        {
          size: 1,
          unpackedSize: 1,
          files: [{ path: `templates/apps/a/${TEMPLATE_TREE_ARCHIVE}`, size: 1 }],
        },
        { a: ['app/package.json', 'app/eslint.config.js'] },
      ).join('\n'),
    ).toContain('template workspace ESLint copy shipped')
  })

  it.each([
    [{ MLCL_CACHE_DIR: '/c' }, 'linux', '/c'],
    [{ XDG_CACHE_HOME: '/x' }, 'linux', '/x/mlcl'],
    [{}, 'linux', '/h/.cache/mlcl'],
    [{}, 'darwin', '/h/Library/Caches/mlcl'],
    [{ LOCALAPPDATA: 'C:/L' }, 'win32', join('C:/L', 'mlcl', 'Cache')],
  ] as const)('caches under the platform cache directory (%o on %s)', (env, platform, want) => {
    expect(mlclCacheDir(env, platform, '/h')).toBe(want)
  })
})
