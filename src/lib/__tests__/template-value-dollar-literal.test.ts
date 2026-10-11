// @vitest-environment node
/**
 * A value spliced into generated content is DATA, and a replacement STRING is
 * not a literal: `$&` means the whole match, `` $` `` and `$'` the text around
 * it, `$$` a single `$`, and `$1` a capture group. Three sites in the scaffold /
 * planner pass data through a replacement string, so a value carrying one of
 * those sequences silently spliced the PLACEHOLDER (or the surrounding template
 * text) into the generated file instead of the value — the same class of bug
 * `syncIdentityFromBranding` and the font-block merge already guard with a
 * function replacement:
 *
 * - `processTemplate` — the `{{KEY}}` engine, whose values are a project name, a
 *   brand description, an SVG's inner markup (`LOGO_CONTENT`) and a font-link
 *   list;
 * - `applyTransformation` — a plan's `transform.to`, an import specifier / path /
 *   snippet;
 * - the `mol:design-resources` splice — the template's own CSS/markup file,
 *   inserted verbatim into the project's `index.html`.
 *
 * Each test drives the REAL function (the planner and the scaffold code, not a
 * copy), so the assertion below fails on the pre-fix code and passes after it.
 *
 * @module
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { executeInjection, type InjectionPlan } from '../injector.js'
import { copyTemplateDomainFiles, processTemplate } from '../scaffold.js'

const dirs: string[] = []
const tempDir = async (prefix: string): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), prefix))
  dirs.push(dir)
  return dir
}

afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true })
})

describe('processTemplate — a value is inserted verbatim, never as a replacement pattern', () => {
  it('keeps a `$&` in the value instead of splicing the placeholder back in', () => {
    // Pre-fix: 'a {{X}} b' — `$&` expands to the matched `{{X}}`.
    expect(processTemplate('a {{X}} b', { X: '$&' })).toBe('a $& b')
  })

  it('keeps `$$` as two characters instead of collapsing them to one', () => {
    expect(processTemplate('cost {{X}}', { X: 'A$$B' })).toBe('cost A$$B')
  })

  it("keeps the `` $` `` and `$'` sequences instead of the text around the match", () => {
    // Pre-fix: `` $` `` is the text BEFORE the match ('a ') and `$'` the text
    // after it (' b'), so the line read 'a a  b b'.
    expect(processTemplate('a {{X}} b', { X: "$`$'" })).toBe("a $`$' b")
  })

  it('still substitutes an ordinary value', () => {
    expect(processTemplate('Hello {{NAME}}!', { NAME: 'demo-app' })).toBe('Hello demo-app!')
  })

  it('keeps a value that carries another key’s placeholder — a value is data, not template source', () => {
    // Pre-fix the substitution went key by key: the earlier key's value was
    // written into the content and the LATER key's search then ran over it, so
    // this description came out as 'Demo dark' — the value was substituted
    // instead of inserted, contradicting the function's own "verbatim"
    // contract. One pass over the template is what makes the contract true.
    expect(
      processTemplate('{{APP_DESCRIPTION}}', {
        APP_DESCRIPTION: 'Demo {{THEME}} build',
        THEME: 'dark',
      }),
    ).toBe('Demo {{THEME}} build')
  })

  it('leaves a placeholder with no variable untouched, however it is written', () => {
    // The single pass must not invent substitutions for keys it was not given:
    // `{{UNKNOWN}}` is template text, and so is a braced pair nested in a value.
    expect(processTemplate('a {{UNKNOWN}} b', { NAME: 'demo-app' })).toBe('a {{UNKNOWN}} b')
    expect(processTemplate('{{NAME}}', { NAME: '{{UNKNOWN}}' })).toBe('{{UNKNOWN}}')
  })
})

/** The smallest plan `executeInjection` accepts, carrying one file op. */
const planWith = (files: InjectionPlan['files']): InjectionPlan => ({
  molecule: '@molecule/test',
  moleculePackage: {
    name: '@molecule/test',
    version: '1.0.0',
    dependencies: {},
    peerDependencies: {},
    type: 'utility',
    routes: [],
    tables: [],
    exports: [],
    path: '/fake',
  },
  files,
  dependencies: [],
  migrations: [],
  bondSetup: null,
  conflicts: [],
})

describe('executeInjection — a transformation writes its `to` value verbatim', () => {
  it('keeps a `$` sequence in `transform.to` instead of re-reading the match', async () => {
    const dir = await tempDir('mlcl-inject-transform-dollar-')
    const sourcePath = join(dir, 'template.txt')
    const targetPath = join(dir, 'out.txt')
    await writeFile(sourcePath, 'price=__PRICE__\n')

    const result = await executeInjection(
      planWith([
        {
          action: 'copy',
          sourcePath,
          targetPath,
          // Both forms a plan can emit: `$$` must stay two characters, and `$&`
          // (the whole match) must not splice `__PRICE__` back in.
          transformations: [
            { type: 'replace-string', from: '__PRICE__', to: 'A$$9' },
            { type: 'replace-string', from: 'price=', to: 'total=$&' },
          ],
          description: 'transform with $ sequences in the replacement',
        },
      ]),
      dir,
      { autoInstall: false },
    )

    expect(result.errors).toEqual([])
    // Pre-fix: 'total=price=A$9' — `price=` spliced back in and `$$` collapsed.
    expect(await readFile(targetPath, 'utf-8')).toBe('total=$&A$$9\n')
  })
})

describe('copyTemplateDomainFiles — the design-resources block is inserted verbatim', () => {
  it('keeps a `$&` in the template’s design-resources file', async () => {
    const cliRoot = await tempDir('mlcl-dsignres-cli-')
    const appPath = await tempDir('mlcl-dsignres-app-')
    const templateAppDir = join(cliRoot, 'templates', 'apps', 'probe', 'app')
    await mkdir(templateAppDir, { recursive: true })
    // A template-shipped CSS/markup file containing a `$` sequence (a literal
    // currency glyph in generated content, a code sample, …). Pre-fix, `${block}`
    // read `$&` as the whole match — the placeholder comment — and spliced it
    // into the injected block.
    await writeFile(
      join(templateAppDir, 'index-design-resources.html'),
      '<style>\n  .price::before { content: "$&"; }\n</style>\n',
    )
    // The real placeholder shape (see templates/apps/blog/app/index.html).
    await writeFile(
      join(appPath, 'index.html'),
      '<html>\n  <head>\n    <!-- mol:design-resources -->\n    <!-- /mol:design-resources -->\n  </head>\n</html>\n',
    )

    await copyTemplateDomainFiles('probe', 'react', appPath, null, cliRoot)

    const html = await readFile(join(appPath, 'index.html'), 'utf-8')
    expect(html).toContain('content: "$&"')
    // …and the placeholder block appears exactly once, not spliced inside itself.
    expect(html.match(/<!-- mol:design-resources -->/g)).toHaveLength(1)
    expect(html.match(/<!-- \/mol:design-resources -->/g)).toHaveLength(1)
  })
})
