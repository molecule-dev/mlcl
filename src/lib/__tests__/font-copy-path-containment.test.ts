/**
 * `copyFontFiles` joins package/registry METADATA into a filesystem path and
 * copies whatever it finds there into the project's SERVED static directory
 * (`<project>/public/fonts/`). It guarded two of the three metadata segments
 * (`fontsDir`, `file` — no path separators) and said so in its own comment
 * ("so a crafted `../` in a segment can neither read from nor write outside the
 * intended directories") — but `packageName`, the FIRST segment, was never
 * checked. A package name carrying `../` walks the whole entry out of
 * node_modules: `join(nm, '@molecule/../../..', '.', 'id_rsa')` resolves to
 * `<project>/../id_rsa`, and the copy puts that file (a private key, a
 * `.npmrc` token, `.bash_history`) into `public/`, where a Vite dev server
 * serves it and a deploy publishes it.
 *
 * The name is data, not a literal: `syncProjectAssets` builds it from the
 * PROJECT MANIFEST's `@molecule/*` dependency keys and `generateFontHtml` from
 * a scanned package's own `package.json` (`scanPackage` reads that file's
 * `name` field). `mlcl inject` and `mlcl swap` both run `syncProjectAssets`, so
 * a cloned project's manifest is enough to drive the read.
 *
 * Both directions are pinned here against the REAL exported `copyFontFiles`,
 * with nothing mocked: the escape must not copy, and an ordinary scoped package
 * must still copy (the guard may not be a blanket refusal).
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { copyFontFiles } from '../scaffold.js'

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'mlcl-font-containment-'))
  // The project the copy targets, with the node_modules directory the metadata
  // paths are resolved against.
  await mkdir(join(root, 'project', 'node_modules'), { recursive: true })
})

afterEach(async () => {
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})

const projectPath = (): string => join(root, 'project')
const copiedFile = (name: string): string => join(projectPath(), 'public', 'fonts', name)

describe('copyFontFiles — a metadata path never leaves node_modules', () => {
  it('never copies a file a package name reaches outside node_modules', async () => {
    // `@molecule/../../..` from `<root>/project/node_modules` resolves the whole
    // entry out of node_modules and lands on `<root>/id_rsa` — a file that has
    // nothing to do with any font package. Without the containment check the
    // sentinel is copied into `public/fonts/` and served with the app.
    await writeFile(join(root, 'id_rsa'), 'PRIVATE KEY')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await copyFontFiles(projectPath(), [
      { packageName: '@molecule/../../..', fontsDir: '.', file: 'id_rsa' },
    ])

    expect(existsSync(copiedFile('id_rsa')), 'the escaped file must not be copied').toBe(false)
    // …and the refusal is visible, not a silent skip.
    expect(
      warn.mock.calls.some(([message]) => String(message).includes('outside node_modules')),
    ).toBe(true)
  })

  it('still copies a scoped package’s declared font (no over-tightening)', async () => {
    // The everyday shape the guard must not break: a real scoped name, whose
    // `@molecule/` separator is a legal part of the name.
    const fontDir = join(root, 'project', 'node_modules', '@molecule', 'app-font-fixture', 'fonts')
    await mkdir(fontDir, { recursive: true })
    await writeFile(join(fontDir, 'Fixture-Regular.woff2'), 'woff2-fixture')

    await copyFontFiles(projectPath(), [
      {
        packageName: '@molecule/app-font-fixture',
        fontsDir: 'fonts',
        file: 'Fixture-Regular.woff2',
      },
    ])

    expect(existsSync(copiedFile('Fixture-Regular.woff2'))).toBe(true)
    expect(await readFile(copiedFile('Fixture-Regular.woff2'), 'utf-8')).toBe('woff2-fixture')
  })
})
