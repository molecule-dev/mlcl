/**
 * Two guards on the data a template hands the copier, both driven through the
 * real `copyTemplateInstance` against a synthetic template on disk:
 *
 * 1. `fonts.json` is a template-shipped list of PROJECT-RELATIVE paths, and the
 *    copier materializes each entry with `copyFile(pool/basename(rel), join(destDir, rel))
 *    — the destination was the only unvalidated path in that statement, so a
 *    `../…` entry wrote a file OUTSIDE the project being scaffolded. The sibling
 *    `copyFontFiles` has contained the same metadata for as long as it has
 *    existed ("reject path separators … so a crafted `../` in a segment can
 *    neither read from nor write outside the intended directories"); this path is
 *    the one that never got the rule.
 *
 * 2. `syncIdentityFromBranding` embeds the app's brand values into a
 *    `String.prototype.replace` REPLACEMENT string, where `$$`, `$&`, `` $` ``,
 *    `$'` and `$1` are special. `APP_NAME = 'A$&B'` spliced the entire matched
 *    `<title>…</title>` back into the output, shipping a nested-title document.
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { copyTemplateInstance } from '../scaffold.js'

let root: string | null = null

afterEach(async () => {
  vi.restoreAllMocks()
  if (root) await rm(root, { recursive: true, force: true })
  root = null
})

/** A minimal but real template tree: `<tmp>/templates/apps/<slug>` + the shared font pool. */
async function makeTemplate(opts: {
  fonts: string[]
  appName: string
  indexHtml: string
}): Promise<{ templateDir: string; destDir: string }> {
  root = await mkdtemp(join(tmpdir(), 'mlcl-template-copy-'))
  const templatesDir = join(root, 'templates')
  const templateDir = join(templatesDir, 'apps', 'fixture-app')
  const destDir = join(root, 'project')
  await mkdir(join(templateDir, 'app', 'src'), { recursive: true })
  await mkdir(join(templateDir, 'api'), { recursive: true })
  await mkdir(join(templatesDir, 'shared', 'fonts'), { recursive: true })

  await writeFile(
    join(templateDir, 'package.json'),
    JSON.stringify({ name: 'fixture-app', private: true, workspaces: ['api', 'app'] }, null, 2),
  )
  await writeFile(join(templateDir, 'api', 'package.json'), JSON.stringify({ name: 'fixture-api' }))
  await writeFile(join(templateDir, 'app', 'package.json'), JSON.stringify({ name: 'fixture-app' }))
  await writeFile(join(templateDir, '.gitignore'), 'node_modules\n.env*\n!.env.example\n')
  await writeFile(join(templateDir, 'app', 'index.html'), opts.indexHtml)
  await writeFile(
    join(templateDir, 'app', 'src', 'branding.ts'),
    [
      `export const APP_NAME = '${opts.appName}'`,
      "export const APP_DESCRIPTION = 'fixture template'",
      "export const BRAND_COLOR = '#123456'",
      '',
    ].join('\n'),
  )
  await writeFile(join(templateDir, 'fonts.json'), JSON.stringify(opts.fonts, null, 2))
  // Every `basename(rel)` in the manifest must exist in the pool, or the copy
  // fails for a different reason than the guard under test.
  for (const rel of opts.fonts) {
    await writeFile(join(templatesDir, 'shared', 'fonts', rel.split('/').pop()!), 'woff2-fixture')
  }
  return { templateDir, destDir }
}

describe('copyTemplateInstance — template-supplied paths and brand values', () => {
  it('never materializes a fonts.json entry outside the project it is copying into', async () => {
    const { templateDir, destDir } = await makeTemplate({
      fonts: ['app/public/fonts/Fixture-Regular.woff2', '../escaped.woff2'],
      appName: 'Fixture',
      indexHtml: '<html><head><title>fixture-app</title></head><body></body></html>',
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await copyTemplateInstance(templateDir, destDir, 'my-project', {})

    // The legitimate entry lands where the template says…
    expect(existsSync(join(destDir, 'app', 'public', 'fonts', 'Fixture-Regular.woff2'))).toBe(true)
    // …and the `../` entry does not escape the project: `join(destDir, '../escaped.woff2')`
    // is `<root>/escaped.woff2`, one level above the scaffolded project.
    expect(existsSync(join(root!, 'escaped.woff2'))).toBe(false)
    expect(warn.mock.calls.some(([msg]) => String(msg).includes('escaped.woff2'))).toBe(true)
  })

  it('keeps a brand value containing `$` sequences out of the replacement-string grammar', async () => {
    // `$&` in a replacement STRING expands to the whole matched `<title>…</title>`;
    // `$$` collapses to `$`. Both shipped a corrupt document.
    const { templateDir, destDir } = await makeTemplate({
      fonts: [],
      appName: 'A$&B$$C',
      indexHtml:
        '<html><head><title>fixture-app</title>' +
        '<meta property="og:title" content="placeholder"></head><body></body></html>',
    })

    await copyTemplateInstance(templateDir, destDir, 'my-project', {})

    const html = await readFile(join(destDir, 'app', 'index.html'), 'utf-8')
    // The title carries the brand verbatim — no re-spliced match, no collapsed `$$`.
    expect(html).toContain('<title>A$&B$$C</title>')
    expect(html.match(/<title>/g)?.length).toBe(1)
    expect(html).not.toContain('fixture-app')
    // The same value flows into the capture-group replacement without expanding
    // (`$1` there is a real backreference, and the value must not join it).
    expect(html).toContain('content="A$&B$$C"')
  })
})
