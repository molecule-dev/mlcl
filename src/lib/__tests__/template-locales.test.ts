import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { brotliCompressSync } from 'node:zlib'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { singlePackResult } from '../npm-pack-json.js'
import { copyTemplateInstance, shouldSkipDuringCopy } from '../scaffold.js'
import * as secretGenerate from '../secret-generate.js'
import { packTemplateDotfiles } from '../template-dotfiles.js'
import {
  cleanTemplateLocales,
  packTemplateLocales,
  readTemplateLocales,
  restoreTemplateLocales,
  TEMPLATE_LOCALES_ARCHIVE,
} from '../template-locales.js'
import { TEMPLATE_SHARED_ESLINT, templatePackageIssues } from '../template-package.js'
import {
  cleanTemplateTrees,
  decodeTemplateTree,
  packTemplateTrees,
  resolveTemplateDir,
  TEMPLATE_TREE_ARCHIVE,
} from '../template-tree.js'

const ROOT = resolve(import.meta.dirname, '../../..')
const scratch: string[] = []

afterEach(() => {
  vi.restoreAllMocks()
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function fixture(): { dir: string; templates: string; app: string } {
  const dir = mkdtempSync(join(tmpdir(), 'mlcl-locales-'))
  scratch.push(dir)
  const templates = join(dir, 'templates')
  const app = join(templates, 'apps/fixture')
  mkdirSync(app, { recursive: true })
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'locale-fixture', version: '1.0.0', files: ['templates'] }),
  )
  copyFileSync(join(ROOT, 'templates/apps/.npmignore'), join(templates, 'apps/.npmignore'))
  return { dir, templates, app }
}

function write(root: string, file: string, text: string | Buffer): void {
  mkdirSync(dirname(join(root, file)), { recursive: true })
  writeFileSync(join(root, file), text)
}

function tree(root: string): Record<string, string> {
  return Object.fromEntries(
    readdirSync(root, { recursive: true, withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => {
        const file = join(e.parentPath, e.name)
        return [relative(root, file), createHash('sha256').update(readFileSync(file)).digest('hex')]
      })
      .sort(([a], [b]) => a.localeCompare(b)),
  )
}

/** prepack's last step: each flagship's shipped files into its tree manifest, from npm's own list. */
function packTrees(dir: string): void {
  const raw = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: dir,
    encoding: 'utf8',
  })
  packTemplateTrees(
    dir,
    singlePackResult(raw).files.map((file) => file.path),
  )
}

/** The paths in each packed flagship's tree manifest, by slug. */
function treesOf(p: { root: string; files: { path: string }[] }): Record<string, string[]> {
  const trees: Record<string, string[]> = {}
  for (const { path } of p.files) {
    const slug = new RegExp(`^templates/apps/([^/]+)/${TEMPLATE_TREE_ARCHIVE}$`).exec(path)?.[1]
    if (slug) trees[slug] = Object.keys(decodeTemplateTree(readFileSync(join(p.root, path)), path))
  }
  return trees
}

function packed(
  dir: string,
  output = 'unpacked',
): {
  root: string
  files: { path: string; size: number }[]
  size: number
  unpackedSize: number
} {
  const raw = execFileSync('npm', ['pack', '--ignore-scripts', '--json'], {
    cwd: dir,
    encoding: 'utf8',
  })
  const pack = singlePackResult(raw)
  const root = join(dir, output)
  mkdirSync(root)
  execFileSync('tar', ['-xzf', join(dir, pack.filename), '-C', root])
  return { ...pack, root: join(root, 'package') }
}

describe('offline npm template locales', () => {
  it('keeps English/root modules raw, excludes other locale trees through npm, and restores their exact bytes', async () => {
    const f = fixture()
    const en = '\ufeffexport const ui = { title: "English" }\r\n'
    const fr = 'export const ui = { title: "Été 🌻" }\r\n'
    write(f.app, 'app/src/locales/en/ui.ts', en)
    write(f.app, 'app/src/locales/types.ts', 'export type UI = string\n')
    write(f.app, 'app/src/locales/fr/ui.ts', fr)
    write(f.app, 'app/src/locales/zh-TW/nested/ui.ts', '中文\n')
    const source = tree(f.templates)
    expect(packTemplateLocales(f.templates, shouldSkipDuringCopy)).toMatchObject({
      templates: 1,
      files: 2,
    })
    packTrees(f.dir)
    const p = packed(f.dir)
    expect(templatePackageIssues(p, treesOf(p))).toEqual([])
    const shippedDir = join(p.root, 'templates/apps/fixture')
    const shippedBefore = tree(shippedDir)
    // Extraction must work when npm's package is read-only and no install runs: the tree unpacks
    // into the user's cache.
    chmodSync(shippedDir, 0o555)
    const installed = (() => {
      try {
        return resolveTemplateDir(p.root, 'fixture', join(f.dir, 'cache'))
      } finally {
        chmodSync(shippedDir, 0o755)
      }
    })()
    expect(readFileSync(join(installed, 'app/src/locales/en/ui.ts'), 'utf8')).toBe(en)
    expect(existsSync(join(installed, 'app/src/locales/fr'))).toBe(false)
    const installedBefore = tree(installed)
    await restoreTemplateLocales(installed, join(f.dir, 'project'))
    expect(tree(shippedDir)).toEqual(shippedBefore)
    expect(readFileSync(join(f.dir, 'project/app/src/locales/fr/ui.ts'), 'utf8')).toBe(fr)
    expect(readFileSync(join(f.dir, 'project/app/src/locales/zh-TW/nested/ui.ts'), 'utf8')).toBe(
      '中文\n',
    )
    expect(tree(installed)).toEqual(installedBefore)
    expect(cleanTemplateTrees(f.dir)).toBe(1)
    expect(cleanTemplateLocales(f.templates)).toBe(1)
    expect(tree(f.templates)).toEqual(source)
  })

  it('rejects the original 2.1.41 sizes/file count and uncompressed locale layout', () => {
    const issues = templatePackageIssues({
      size: 89_585_297,
      unpackedSize: 406_010_782,
      files: Array.from({ length: 42_998 }, (_, n) => ({ path: `old/${n}.ts`, size: 1 })),
    })
    expect(issues).toHaveLength(3)
    expect(issues.join('\n')).toContain('packed bytes')
    expect(issues.join('\n')).toContain('unpacked bytes')
    expect(issues.join('\n')).toContain('files')
    expect(
      templatePackageIssues({
        size: 1,
        unpackedSize: 1,
        files: [{ path: 'templates/apps/a/app/src/locales/fr/ui.ts', size: 1 }],
      }).join('\n'),
    ).toContain('uncompressed non-English')
    expect(
      templatePackageIssues({
        size: 1,
        unpackedSize: 1,
        files: [{ path: 'templates/apps/a/app/src/locales/en/ui.ts', size: 1 }],
      }).join('\n'),
    ).toContain('missing restoration archive')
    // The flagship files are read out of its tree manifest, as the publish check does.
    const archive = { path: `templates/apps/a/${TEMPLATE_TREE_ARCHIVE}`, size: 1 }
    const workspace = 'api/package.json'
    const shared = TEMPLATE_SHARED_ESLINT.map((path) => ({ path, size: 1 }))
    expect(
      templatePackageIssues(
        { size: 1, unpackedSize: 1, files: [archive, shared[0]] },
        { a: [workspace] },
      ),
    ).toEqual(
      TEMPLATE_SHARED_ESLINT.slice(1).map(
        (path) => `template ESLint copies missing their shared source: ${path}`,
      ),
    )
    expect(
      templatePackageIssues(
        { size: 1, unpackedSize: 1, files: [archive, ...shared] },
        { a: [workspace] },
      ),
    ).toEqual([])
    // A workspace's rule copy from before @molecule/eslint-config is refused by name, whichever
    // rule it is (2.2.8: two new rules shipped 606 copies and the package passed its 32,000-file
    // budget).
    const copy = 'app/eslint-rules/no-resource-table-writes.mjs'
    expect(
      templatePackageIssues(
        { size: 1, unpackedSize: 1, files: [archive, ...shared] },
        { a: [workspace, copy] },
      ),
    ).toEqual([
      'template workspace ESLint copy shipped (scaffoldEslint writes the config from templates/shared; leave it out in templates/apps/.npmignore): */app/eslint-rules/no-resource-table-writes.mjs',
    ])
    // A package without flagship workspaces needs neither.
    expect(templatePackageIssues({ size: 1, unpackedSize: 1, files: [] })).toEqual([])
  })

  it('every flagship workspace lints through the shared config and carries no rule copies', () => {
    // The package leaves each workspace's eslint.config.js out and scaffoldEslint writes the
    // template back, so a workspace config that differs from it would change on install. The rules
    // come from @molecule/eslint-config, so an eslint-rules/ folder is a leftover copy.
    const apps = join(ROOT, 'templates/apps')
    const template = readFileSync(join(ROOT, 'templates/shared/eslint.config.js.tpl'), 'utf8')
    const drift: string[] = []
    let configs = 0
    for (const app of readdirSync(apps, { withFileTypes: true }))
      for (const half of app.isDirectory() ? ['api', 'app'] : []) {
        const dir = join(apps, app.name, half)
        if (existsSync(join(dir, 'eslint-rules'))) drift.push(`${app.name}/${half}/eslint-rules/`)
        const config = join(dir, 'eslint.config.js')
        if (!existsSync(config)) continue
        configs++
        if (readFileSync(config, 'utf8') !== template)
          drift.push(`${app.name}/${half}/eslint.config.js`)
      }
    expect(configs).toBeGreaterThan(250)
    expect(drift).toEqual([])
  })

  it('a source checkout wins over a stale manifest, and a template without locales is unchanged', async () => {
    const f = fixture()
    expect(packTemplateLocales(f.templates, shouldSkipDuringCopy).templates).toBe(0)
    await restoreTemplateLocales(f.app, join(f.dir, 'none'))
    expect(existsSync(join(f.dir, 'none'))).toBe(false)
    write(f.app, 'app/src/locales/fr/ui.ts', 'old\n')
    packTemplateLocales(f.templates, shouldSkipDuringCopy)
    write(f.app, 'app/src/locales/fr/ui.ts', 'edited\n')
    write(f.dir, 'project/app/src/locales/fr/ui.ts', 'edited\n')
    await restoreTemplateLocales(f.app, join(f.dir, 'project'))
    expect(readFileSync(join(f.dir, 'project/app/src/locales/fr/ui.ts'), 'utf8')).toBe('edited\n')
  })

  it.each([
    '../escape.ts',
    'fr/../../escape.ts',
    'fr\\escape.ts',
    '/fr/ui.ts',
    'C:/ui.ts',
    'fr//ui.ts',
    'en/ui.ts',
  ])('refuses escaping or English archive path %s before writing', async (rel) => {
    const f = fixture()
    writeFileSync(
      join(f.app, TEMPLATE_LOCALES_ARCHIVE),
      brotliCompressSync(
        Buffer.from(
          JSON.stringify({ schema: 1, files: { 'fr/ui.ts': 'valid', [rel]: 'invalid' } }),
        ),
      ),
    )
    await expect(restoreTemplateLocales(f.app, join(f.dir, 'project'))).rejects.toThrow(
      'invalid template locale',
    )
    expect(existsSync(join(f.dir, 'project'))).toBe(false)
  })

  it('refuses invalid UTF-8 source, corrupt archives and non-string manifest entries', () => {
    const f = fixture()
    write(f.app, 'app/src/locales/fr/ui.ts', Buffer.from([0xff]))
    expect(() => packTemplateLocales(f.templates, shouldSkipDuringCopy)).toThrow('not UTF-8')
    writeFileSync(join(f.app, TEMPLATE_LOCALES_ARCHIVE), 'corrupt')
    expect(() => readTemplateLocales(f.app)).toThrow()
    writeFileSync(
      join(f.app, TEMPLATE_LOCALES_ARCHIVE),
      brotliCompressSync(Buffer.from(JSON.stringify({ schema: 1, files: { 'fr/ui.ts': 42 } }))),
    )
    expect(() => readTemplateLocales(f.app)).toThrow('invalid template locale')
  })

  it.each(['blog', 'personal-finance'])(
    'preserves the complete %s scaffold tree and its superset package inputs after real npm packing',
    async (slug) => {
      const f = fixture()
      const source = join(ROOT, 'templates/apps', slug)
      const before = join(f.dir, 'before')
      // Hold generated secret values constant so the ENTIRE tree can be
      // byte-compared. Secret generation has its own real-crypto coverage.
      vi.spyOn(secretGenerate, 'generateSecretValues').mockImplementation(
        (secrets) =>
          new Map(secrets.filter((s) => s.generate).map((s) => [s.name, `fixture-${s.name}`])),
      )
      const versions = JSON.parse(readFileSync(join(source, 'api/package.json'), 'utf8'))
        .dependencies as Record<string, string>
      const copied = join(f.templates, 'apps', slug)
      cpSync(source, copied, {
        recursive: true,
        filter: (src) => {
          const name = src.split('/').at(-1)!
          return name !== 'node_modules' && name !== '.keys' && !shouldSkipDuringCopy(name)
        },
      })
      const fontFiles = JSON.parse(readFileSync(join(source, 'fonts.json'), 'utf8')) as string[]
      for (const font of fontFiles) {
        const name = font.split('/').at(-1)!
        const dst = join(f.templates, 'shared/fonts', name)
        mkdirSync(dirname(dst), { recursive: true })
        copyFileSync(join(ROOT, 'templates/shared/fonts', name), dst)
      }
      for (const shared of TEMPLATE_SHARED_ESLINT)
        copyFileSync(join(ROOT, shared), join(f.dir, shared))
      packTemplateDotfiles(f.templates, shouldSkipDuringCopy)
      // Compare the old and new REAL npm representations. npm applies the
      // template's .gitignore rules to other generated files too; no private
      // Git metadata or bespoke ignore engine is needed by this regression.
      rmSync(join(f.templates, 'apps/.npmignore'))
      const old = packed(f.dir, 'old-unpacked')
      await copyTemplateInstance(
        join(old.root, 'templates/apps', slug),
        before,
        'same-project',
        versions,
      )
      copyFileSync(join(ROOT, 'templates/apps/.npmignore'), join(f.templates, 'apps/.npmignore'))
      packTemplateLocales(f.templates, shouldSkipDuringCopy)
      packTrees(f.dir)
      const p = packed(f.dir)
      expect(templatePackageIssues(p, treesOf(p))).toEqual([])
      // The package carries the flagship as its listing files and one manifest; the scaffold reads
      // the tree it unpacks into the user's cache.
      expect(
        p.files
          .map((file) => file.path)
          .filter((path) => path.startsWith(`templates/apps/${slug}/`)),
      ).toEqual(
        ['CATALOG.md', 'template.json', TEMPLATE_TREE_ARCHIVE]
          .filter((file) => existsSync(join(source, file)) || file === TEMPLATE_TREE_ARCHIVE)
          .map((file) => `templates/apps/${slug}/${file}`)
          .sort(),
      )
      const installed = resolveTemplateDir(p.root, slug, join(f.dir, 'cache'))
      for (const half of ['app', 'api'])
        expect(readFileSync(join(installed, half, 'package.json'))).toEqual(
          readFileSync(join(source, half, 'package.json')),
        )
      // The package leaves each workspace's synced ESLint config out (the old one carried it), and
      // the scaffold writes the shared one back.
      const workspaceEslint = ['eslint.config.js']
      for (const half of ['app', 'api'])
        for (const file of workspaceEslint) {
          expect(existsSync(join(old.root, 'templates/apps', slug, half, file)), file).toBe(true)
          expect(existsSync(join(installed, half, file)), file).toBe(false)
        }
      const after = join(f.dir, 'after')
      await copyTemplateInstance(installed, after, 'same-project', versions, undefined, {
        templatesRoot: join(p.root, 'templates'),
      })
      const beforeTree = tree(before)
      const afterTree = tree(after)
      const differences = [...new Set([...Object.keys(beforeTree), ...Object.keys(afterTree)])]
        .filter((file) => beforeTree[file] !== afterTree[file])
        .map((file) => ({ file, before: beforeTree[file], after: afterTree[file] }))
      expect(differences, JSON.stringify(differences)).toEqual([])
      for (const half of ['app', 'api']) {
        expect(readFileSync(join(after, half, 'eslint.config.js'))).toEqual(
          readFileSync(join(ROOT, 'templates/shared/eslint.config.js.tpl')),
        )
        expect(existsSync(join(after, half, 'eslint-rules'))).toBe(false)
      }
      expect(
        Object.keys(tree(after)).filter((p) => p.includes('/locales/')).length,
      ).toBeGreaterThan(75)
    },
    60_000,
  )
})
