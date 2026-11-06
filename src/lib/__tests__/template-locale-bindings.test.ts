import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

const ROOT = resolve(import.meta.dirname, '../../..')
const scratch: string[] = []
afterEach(() => scratch.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })))

function check(
  calls: string,
  translations: Record<string, string>,
): ReturnType<typeof spawnSync<string>> {
  const root = mkdtempSync(join(tmpdir(), 'locale-bindings-'))
  scratch.push(root)
  for (const [rel, text] of Object.entries({
    'package.json': '{"type":"module"}',
    'templates/apps/fixture/app/src/pages/Page.tsx': calls,
    'templates/apps/fixture/app/src/locales/fr/ui.ts': `export const ui = ${JSON.stringify(translations, null, 2)}\n`,
  })) {
    mkdirSync(dirname(join(root, rel)), { recursive: true })
    writeFileSync(join(root, rel), text)
  }
  mkdirSync(join(root, 'scripts'))
  copyFileSync(
    join(ROOT, 'scripts/check-template-locale-placeholders.js'),
    join(root, 'scripts/check-template-locale-placeholders.js'),
  )
  symlinkSync(realpathSync(join(ROOT, 'node_modules')), join(root, 'node_modules'), 'dir')
  return spawnSync(process.execPath, ['scripts/check-template-locale-placeholders.js'], {
    cwd: root,
    encoding: 'utf8',
  })
}

describe('template locale interpolation bindings', () => {
  it('accepts supplied values absent from English, omitted/repeated values and scaffold branding', () => {
    const result = check(
      `
      t('extra', { days: 30 }, { defaultValue: 'Quality trend' })
      t('omitted', { count: 2 }, { defaultValue: 'Balances ({{count}})' })
      t('repeated', { name: 'Ada' }, { defaultValue: 'Hello {{name}}' })
      t('branding', {}, { defaultValue: '{{appName}}' })
    `,
      {
        extra: '{{days}} jours',
        omitted: 'Soldes',
        repeated: '{{name}}, bonjour {{name}}',
        branding: '{{appName}}',
      },
    )
    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toContain('1 file(s) across 1 tree(s)')
  })

  it('reads nested calls independently instead of borrowing the inner defaultValue', () => {
    const result = check(
      `t('outer', { name: t('inner', {}, { defaultValue: 'Ada' }) }, { defaultValue: '{{name}}' })`,
      { outer: '{{name}}', inner: 'Ada' },
    )
    expect(result.status, result.stderr).toBe(0)
  })

  it('checks an outer call even when a nested translation supplies its value', () => {
    const result = check(
      `t('outer', { name: t('inner', {}, { defaultValue: 'Ada' }) }, { defaultValue: '{{name}}' })`,
      { outer: '{{wrong}}', inner: 'Ada' },
    )
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('wrong')
  })

  it('preserves literal template syntax explicitly present in English help text', () => {
    const result = check(`t('hint', {}, { defaultValue: 'Write {{API_TOKEN}} here' })`, {
      hint: 'Écrivez {{API_TOKEN}} ici',
    })
    expect(result.status, result.stderr).toBe(0)
  })

  it.each([
    ['{ from: 1, to: 2 }', '{{v}}', 'v'],
    ["{ name: 'Ada' }", '{{nmae}}', 'nmae'],
    ['{}', '{{count}}', 'count'],
  ])('refuses an unbound token with values %s', (values, translation, name) => {
    const result = check(`t('label', ${values}, { defaultValue: 'Heading' })`, {
      label: translation,
    })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(name)
  })

  it('requires a value at every literal call site, not just one call with the same key', () => {
    const result = check(
      `t('label', { name: 'Ada' }, { defaultValue: '{{name}}' }); t('label', {}, { defaultValue: 'Second' })`,
      { label: '{{name}}' },
    )
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('name')
  })
})
