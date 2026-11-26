/**
 * Each flagship ships as one tree manifest that a scaffold unpacks into the user's cache. npm
 * unpacks a package file by file: 2.2.13 shipped 29,413 files, 27,638 of them flagship files, and a
 * first `npx mlcl` spent about 20 of its 24 s unpacking them (the harness install eval, r38). These
 * run real `npm pack` over fixture packages.
 */
import { execFile, execFileSync } from 'node:child_process'
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
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { promisify } from 'node:util'
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

function writeTree(root: string, files: Record<string, object>): Buffer {
  const bytes = brotliCompressSync(Buffer.from(JSON.stringify({ schema: 1, files })))
  write(root, `templates/apps/packed/${TEMPLATE_TREE_ARCHIVE}`, bytes)
  return bytes
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

function dryRun(dir: string): ReturnType<typeof singlePackResult>['files'] {
  const raw = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: dir,
    encoding: 'utf8',
  })
  return singlePackResult(raw).files
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
    const byPath = new Map(before.map(({ path, mode }) => [path, mode]))
    expect(byPath.has('templates/apps/fixture/app/public/logo.png')).toBe(true)
    expect(byPath.has('templates/apps/fixture/app/eslint.config.js')).toBe(false)
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
      Object.entries(sourceBefore).flatMap(([rel, file]) => {
        const mode = byPath.get(`templates/apps/fixture/${rel}`)
        return mode === undefined ? [] : [[rel, { ...file, mode }]]
      }),
    )
    expect(snapshot(unpacked)).toEqual(expected)
    expect(snapshot(unpacked)['api/scripts/start.sh'].mode).toBe(0o755)

    // A second scaffold reads the same copy without unpacking again.
    const cachedFile = join(unpacked, 'app/src/App.tsx')
    utimesSync(cachedFile, 10, 10)
    expect(resolveTemplateDir(p.root, 'fixture', cache)).toBe(unpacked)
    expect(statSync(cachedFile).mtimeMs).toBe(10_000)
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

  it('scaffolds from current source after a pack leaves a stale manifest', () => {
    const dir = fixture()
    const cache = join(dir, 'cache')
    write(dir, 'src/lib/template-tree.ts', '// source checkout')
    packTemplateTrees(dir, dryRun(dir))
    write(dir, 'templates/apps/fixture/app/src/App.tsx', 'current source\n')
    const source = resolveTemplateDir(dir, 'fixture', cache)
    expect(source).toBe(join(dir, 'templates/apps/fixture'))
    expect(readFileSync(join(source, 'app/src/App.tsx'), 'utf8')).toBe('current source\n')
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
    ['C:/drive.ts', { mode: 0o644, text: 'x' }],
    ['app//double.ts', { mode: 0o644, text: 'x' }],
    ['app/.. /file.ts', { mode: 0o644, text: 'x' }],
    ['app/file.ts.', { mode: 0o644, text: 'x' }],
    ['app/COM¹.txt', { mode: 0o644, text: 'x' }],
    ['app/NUL .txt', { mode: 0o644, text: 'x' }],
    ['app/file?.ts', { mode: 0o644, text: 'x' }],
    ['mode.ts', { mode: 0o4755, text: 'x' }],
    ['both.ts', { mode: 0o644, text: 'x', base64: 'eA==' }],
    ['both-types.ts', { mode: 0o644, text: 'x', base64: false }],
    ['bad-base64.ts', { mode: 0o644, base64: 'eA==?' }],
    ['bad-text.ts', { mode: 0o644, text: '\ud800' }],
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

  it.each([
    ['a', 'a/b.ts'],
    ['a/b.ts', 'a'],
    ['app/Readme.md', 'app/README.md'],
    ['App/a.ts', 'app/b.ts'],
    ['café/x.ts', 'cafe\u0301/x.ts'],
  ])('rejects a conflicting pair before extraction (%s, %s)', (first, second) => {
    const dir = fixture()
    const entry = { mode: 0o644, text: 'fixture' }
    const tree = writeTree(dir, { [first]: entry, [second]: entry })
    expect(() => decodeTemplateTree(tree, 'fixture')).toThrow('conflicting template path')
  })

  it('retains empty files, exact UTF-8 bytes and file names that are object properties', () => {
    const dir = fixture()
    const app = 'templates/apps/fixture'
    const oddBytes = Buffer.from([0xef, 0xbb, 0xbf, 0xef, 0xbf, 0xbd, 0, 0xc0, 0xaf])
    write(dir, `${app}/__proto__`, '')
    write(dir, `${app}/mixed.dat`, oddBytes)
    mkdirSync(join(dir, app, 'empty-dir'))
    packTemplateTrees(dir, dryRun(dir))
    const files = decodeTemplateTree(readFileSync(join(dir, app, TEMPLATE_TREE_ARCHIVE)), 'fixture')
    expect(Object.hasOwn(files, '__proto__')).toBe(true)
    expect(files.__proto__.data).toEqual(Buffer.alloc(0))
    expect(files['mixed.dat'].data).toEqual(oddBytes)
    expect(Object.hasOwn(files, 'empty-dir')).toBe(false)
  })

  it('rejects conflicting names during prepack', () => {
    const dir = fixture()
    for (const name of ['app/Example.ts', 'app/EXAMPLE.ts']) {
      write(dir, `templates/apps/fixture/${name}`, 'fixture')
    }
    expect(() =>
      packTemplateTrees(dir, [
        { path: 'templates/apps/fixture/app/Example.ts', mode: 0o644 },
        { path: 'templates/apps/fixture/app/EXAMPLE.ts', mode: 0o644 },
      ]),
    ).toThrow('conflicting template path')
    expect(existsSync(join(dir, 'templates/apps/fixture', TEMPLATE_TREE_ARCHIVE))).toBe(false)
  })

  it('rebuilds an incomplete cache without following links inside an old extraction', () => {
    const dir = fixture()
    const cache = join(dir, 'cache')
    writeTree(dir, {
      'app/package.json': { mode: 0o644, text: '{}' },
      'app/main.txt': { mode: 0o644, text: 'published' },
    })
    const first = resolveTemplateDir(dir, 'packed', cache)
    rmSync(join(first, 'app/package.json'))
    write(dir, 'outside/main.txt', 'unrelated')
    rmSync(join(first, 'app/main.txt'))
    symlinkSync(join(dir, 'outside/main.txt'), join(first, 'app/main.txt'))
    const repaired = resolveTemplateDir(dir, 'packed', cache)
    expect(snapshot(repaired)).toEqual({
      'app/main.txt': { data: Buffer.from('published').toString('base64'), mode: 0o644 },
      'app/package.json': { data: Buffer.from('{}').toString('base64'), mode: 0o644 },
    })
    expect(resolveTemplateDir(dir, 'packed', cache)).toBe(repaired)
    expect(readFileSync(join(dir, 'outside/main.txt'), 'utf8')).toBe('unrelated')
  })

  it('requires every expected file, even when a Unicode alias keeps the cache file count equal', () => {
    const dir = fixture()
    const cache = join(dir, 'cache')
    const entry = { mode: 0o644, text: 'published' }
    writeTree(dir, { 'café.txt': entry, 'missing.txt': entry })
    const first = resolveTemplateDir(dir, 'packed', cache)
    rmSync(join(first, 'missing.txt'))
    write(first, 'cafe\u0301.txt', entry.text, entry.mode)
    const repaired = resolveTemplateDir(dir, 'packed', cache)
    expect(existsSync(join(repaired, 'missing.txt'))).toBe(true)
    expect(readFileSync(join(repaired, 'missing.txt'), 'utf8')).toBe('published')
  })

  it.each(['cache', 'cache/templates'])('rejects a symlink at %s', (rel) => {
    const dir = fixture()
    writeTree(dir, { 'app/main.txt': { mode: 0o644, text: 'packed' } })
    mkdirSync(join(dir, 'elsewhere'))
    mkdirSync(dirname(join(dir, rel)), { recursive: true })
    symlinkSync(join(dir, 'elsewhere'), join(dir, rel), 'junction')
    expect(() => resolveTemplateDir(dir, 'packed', join(dir, 'cache'))).toThrow(
      'Unsafe template cache directory',
    )
    expect(readdirSync(join(dir, 'elsewhere'))).toEqual([])
  })

  it('creates a private cache and rejects an existing cache writable by other users on POSIX', () => {
    const dir = fixture()
    const cache = join(dir, 'cache')
    writeTree(dir, { 'app/main.txt': { mode: 0o644, text: 'packed' } })
    resolveTemplateDir(dir, 'packed', cache)
    if (process.getuid) {
      expect(statSync(cache).mode & 0o077).toBe(0)
      expect(statSync(join(cache, 'templates')).mode & 0o077).toBe(0)
      chmodSync(cache, 0o777)
      expect(() => resolveTemplateDir(dir, 'packed', cache)).toThrow(
        'Unsafe template cache directory',
      )
    }
  })

  it('refuses a POSIX cache under a directory other users can rename its entries in', () => {
    const dir = fixture()
    const parent = join(dir, 'shared')
    mkdirSync(parent)
    writeTree(dir, { 'app/main.txt': { mode: 0o644, text: 'packed' } })
    if (process.getuid) {
      chmodSync(parent, 0o777)
      expect(() => resolveTemplateDir(dir, 'packed', join(parent, 'cache'))).toThrow(
        'Unsafe template cache directory',
      )
    }
  })

  it('repairs one cache generation across two processes and clears interrupted staging', async () => {
    const dir = fixture()
    const cache = join(dir, 'cache')
    writeTree(dir, { 'app/main.txt': { mode: 0o644, text: 'packed' } })
    const first = resolveTemplateDir(dir, 'packed', cache)
    rmSync(join(first, 'app/main.txt'))
    const exitedPid = Number(
      execFileSync(process.execPath, ['-p', 'process.pid'], { encoding: 'utf8' }),
    )
    const cacheRoot = join(cache, 'templates')
    const abandoned = join(cacheRoot, `.${relative(cacheRoot, first)}-${exitedPid}-AbCd01`)
    const active = join(cacheRoot, `.${relative(cacheRoot, first)}-${process.pid}-AbCd02`)
    write(abandoned, 'in-progress.txt', 'old')
    write(active, 'in-progress.txt', 'active')
    const run = async (): Promise<string> => {
      const { stdout } = await promisify(execFile)(
        process.execPath,
        [
          '--import',
          'tsx',
          '--input-type=module',
          '-e',
          "import { resolveTemplateDir } from './src/lib/template-tree.ts'; console.log(resolveTemplateDir(...process.argv.slice(1)))",
          dir,
          'packed',
          cache,
        ],
        { cwd: ROOT, encoding: 'utf8' },
      )
      return stdout.trim()
    }
    const [one, two] = await Promise.all([run(), run()])
    expect(one).toBe(two)
    expect(existsSync(abandoned)).toBe(false)
    expect(existsSync(active)).toBe(true)
    expect(readFileSync(join(one, 'app/main.txt'), 'utf8')).toBe('packed')
  }, 30_000)

  it('refuses a corrupt manifest and leaves no partial copy', () => {
    const dir = fixture()
    writeFileSync(join(dir, 'templates/apps/fixture', TEMPLATE_TREE_ARCHIVE), 'corrupt')
    const cache = join(dir, 'cache')
    expect(() => resolveTemplateDir(dir, 'fixture', cache)).toThrow()
    expect(
      existsSync(join(cache, 'templates')) ? readdirSync(join(cache, 'templates')) : [],
    ).toEqual([])
  })

  it('refuses malformed UTF-8 in a tree instead of replacing its bytes', () => {
    const tree = brotliCompressSync(
      Buffer.concat([
        Buffer.from('{"schema":1,"files":{"file.txt":{"mode":420,"text":"'),
        Buffer.from([0xff]),
        Buffer.from('"}}}'),
      ]),
    )
    expect(() => decodeTemplateTree(tree, 'fixture')).toThrow('UTF-8')
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
    [{ XDG_CACHE_HOME: 'relative' }, 'linux', '/h/.cache/mlcl'],
    [{}, 'linux', '/h/.cache/mlcl'],
    [{}, 'darwin', '/h/Library/Caches/mlcl'],
    [{ LOCALAPPDATA: 'C:/L' }, 'win32', 'C:\\L\\mlcl\\Cache'],
    [{}, 'win32', '\\h\\AppData\\Local\\mlcl\\Cache'],
  ] as const)('caches under the platform cache directory (%o on %s)', (env, platform, want) => {
    expect(mlclCacheDir(env, platform, '/h')).toBe(want)
  })
})
