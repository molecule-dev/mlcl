/**
 * The Angular app template renders each page and shell component as an element
 * (`<app-header>`), which by default is an inline box of its own. The React template's
 * components render no wrapper, so a flex or grid parent lays out their root element
 * directly. An element-selector component therefore declares
 * `host: { style: 'display: contents' }`, or the Angular scaffold's layout drifts from
 * React's (measured: the footer and form shifted by the wrapper boxes).
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const ROOT = fileURLToPath(new URL('../../templates/app/angular', import.meta.url))

const templates = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return templates(path)
    return entry.name.endsWith('.ts.tpl') ? [path] : []
  })

/** Each `@Component({ … })` decorator's element selector and whether it declares the host style. */
const components = (source: string): { selector: string; contents: boolean }[] =>
  source
    .split('@Component({')
    .slice(1)
    .map((decorator) => {
      const body = decorator.slice(0, decorator.indexOf('template'))
      return {
        selector: /selector: '([^']+)'/.exec(body)?.[1] ?? '',
        contents: /host: \{ style: 'display: contents' \}/.test(body),
      }
    })

describe('Angular app template components', () => {
  const files = templates(ROOT)

  it('finds the template components', () => {
    expect(
      files.filter((f) => readFileSync(f, 'utf8').includes('@Component({')).length,
    ).toBeGreaterThan(20)
  })

  it('an element-selector component renders no box of its own', () => {
    const offenders = files.flatMap((file) =>
      components(readFileSync(file, 'utf8'))
        .filter(({ selector, contents }) => selector && !selector.includes('[') && !contents)
        .map(({ selector }) => `${relative(ROOT, file)} (${selector})`),
    )
    expect(offenders).toEqual([])
  })
})
