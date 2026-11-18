import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

import { Linter, type Rule } from 'eslint'
import tseslint from 'typescript-eslint'
import { afterAll, describe, expect, it } from 'vitest'

import { createAppProject } from '../scaffold.js'

const require = createRequire(import.meta.url)
const execFileAsync = promisify(execFile)
const roots: string[] = []
const id = 'molecule-local/single-image-name-link'
const templates = join(import.meta.dirname, '../../../templates/shared')
const module = (await import(
  pathToFileURL(join(templates, 'prefer-declared-clients.mjs')).href
)) as { scaffoldRules: (parser: unknown) => Record<string, Rule.RuleModule> }
// A prior scaffold has no listener for this policy, rather than a broken ESLint
// configuration. This also lets the exact pre-fix source run the regression cases.
const rule = module.scaffoldRules(tseslint.parser)['single-image-name-link'] ?? {
  create: () => ({}),
}
const linter = new Linter()
function findings(source: string): Linter.LintMessage[] {
  const messages = linter.verify(
    source,
    [
      {
        files: ['**/*.tsx'],
        languageOptions: { parser: tseslint.parser },
        plugins: { 'molecule-local': { rules: { 'single-image-name-link': rule } } },
        rules: { [id]: 'error' },
      },
    ],
    { filename: 'Identity.tsx' },
  )
  expect(messages.filter((message) => message.fatal)).toEqual([])
  return messages.filter((message) => message.ruleId === id)
}

const destination = '`/people/${encodeURIComponent(person.handle)}`'
const image = `<a href={${destination}}><img src={person.image} alt={person.name} /></a>`
const name = `<a href={${destination}}>{person.name}</a>`
const row = `<div>${image}<div>${name}<small>{person.role}</small></div></div>`
const describedImageRow = row.replace('alt={person.name}', 'alt={`${person.name} portrait`}')
const source = (markup: string): string => `export function Identity({ person }: {
  person: { name: string; handle: string; image: string; role: string }
}) { return ${markup} }`

afterAll(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })))
})

describe('adjacent image/name links', () => {
  it('rejects a redundant equipment assignee identity without reading classes or tests', () => {
    const result = findings(source(row))
    expect(result).toHaveLength(1)
    expect(result[0].messageId).toBe('redundant')
    expect(result[0].line).toBeGreaterThan(0)
    expect(result[0].message).toContain('UserChip')
  })

  it('resolves imported router aliases and the same dynamic destination', () => {
    const markup = row
      .replaceAll('<a href=', '<ProfileLink to=')
      .replaceAll('</a>', '</ProfileLink>')
    expect(
      findings(`import { Link as ProfileLink } from 'react-router';\n${source(markup)}`),
    ).toHaveLength(1)
  })

  it('reports the image link when its alt text decorates the same displayed name', () => {
    const markup = describedImageRow
      .replaceAll('<a href=', '<ProfileLink to=')
      .replaceAll('</a>', '</ProfileLink>')
      .replace('<div><ProfileLink', '<div>\n<ProfileLink')
    expect(
      findings(`import { Link as ProfileLink } from 'react-router';\n${source(markup)}`),
    ).toMatchObject([{ line: 5, column: 1, messageId: 'redundant' }])
  })

  it('supports NavLink, comments and whitespace separating the two links', () => {
    const markup = row
      .replaceAll('<a href=', '<NavLink to=')
      .replaceAll('</a>', '</NavLink>')
      .replace('</NavLink><div>', '</NavLink>{/* byline */}{" "}<div>')
    expect(findings(`import { NavLink } from 'react-router-dom';\n${source(markup)}`)).toHaveLength(
      1,
    )
  })

  it('rejects a literal image/name pair in a storefront product row', () => {
    expect(
      findings(
        '<div><a href="/stock/42"><img src="/stock.png" alt="Blue wrench" /></a><a href="/stock/42">Blue wrench</a></div>',
      ),
    ).toHaveLength(1)
  })

  it.each([
    [
      'one combined link',
      `<div><a href={${destination}}><img src={person.image} alt="" /><span>{person.name}</span></a></div>`,
    ],
    ['a decorative image and name link', `<div><img src={person.image} alt="" />${name}</div>`],
    [
      'the existing shared identity component',
      '<UserChip name={person.name} href={person.handle} src={person.image} />',
    ],
    ['independent rows', `<main><header>${image}</header><footer>${name}</footer></main>`],
    [
      'different destinations',
      row.replace('href={' + destination + '}><img', 'href="/portrait"><img'),
    ],
    ['different purposes', row.replace('alt={person.name}', 'alt="View full portrait"')],
    [
      'an image description using a different value',
      row.replace('alt={person.name}', 'alt={`Portrait by ${person.role}`}'),
    ],
    [
      'an image description identifying two different values',
      row.replace('alt={person.name}', 'alt={`${person.name} and ${person.role}`}'),
    ],
    ['a link with its own action', row.replace('<a href=', '<a onClick={openMenu} href=')],
    ['a distinct target', row.replace('<a href=', '<a target="_blank" href=')],
    ['an explicitly named link', row.replace('<a href=', '<a aria-label="View portrait" href=')],
    [
      'spread attributes that may change the accessible name',
      row.replace('<a href=', '<a {...linkProps} href='),
    ],
    [
      'an opaque custom component',
      row.replaceAll('<a href=', '<Link href=').replaceAll('</a>', '</Link>'),
    ],
    ['conditional layouts', `<div>${image}{expanded ? ${name} : null}</div>`],
    ['unrelated content between the links', `<div>${image}<p>{person.role}</p>${name}</div>`],
  ])('allows %s', (_label, markup) => {
    expect(findings(source(markup))).toEqual([])
  })

  it('does not confuse a local Link with an imported router binding', () => {
    const markup = row
      .replaceAll('<a href=', '<ProfileLink to=')
      .replaceAll('</a>', '</ProfileLink>')
    const code = `import { Link as ProfileLink } from 'react-router';
function Demo({ ProfileLink, person }) { return ${markup} }`
    expect(findings(code)).toEqual([])
  })
})

describe('generated native first-build lifecycle', () => {
  it('stops redundant identity links before build and accepts the corrected row', async () => {
    const container = await mkdtemp(join(tmpdir(), 'identity-first-build-'))
    roots.push(container)
    const root = join(container, 'app')
    await createAppProject(root, 'equipment-console', 'react')
    await symlink(
      dirname(dirname(require.resolve('eslint/package.json'))),
      join(container, 'node_modules'),
    )
    await mkdir(join(root, 'src'), { recursive: true })
    const file = join(root, 'src/Identity.tsx')
    const manifestPath = join(root, 'package.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      scripts: Record<string, string>
    }
    // Preserve the scaffold's real prebuild. The marker proves whether npm passed
    // that hook, without bundling an unrelated application as part of this test.
    manifest.scripts.lint = 'eslint src/Identity.tsx --max-warnings 0'
    manifest.scripts.build = 'node -e "console.log(\'IDENTITY_BUILD_REACHED\')"'
    await writeFile(manifestPath, JSON.stringify(manifest))
    await writeFile(file, source(describedImageRow))
    const build = async (): Promise<{ code: number; output: string }> => {
      try {
        const result = await execFileAsync('npm', ['run', 'build'], { cwd: root, timeout: 120_000 })
        return { code: 0, output: result.stdout + result.stderr }
      } catch (error) {
        const result = error as { code: number; stdout: string; stderr: string }
        return { code: result.code, output: result.stdout + result.stderr }
      }
    }
    const bad = await build()
    expect(bad.code, bad.output).toBe(1)
    expect(bad.output).toContain(id)
    expect(bad.output).not.toContain('IDENTITY_BUILD_REACHED')
    await writeFile(file, source(`<div><img src={person.image} alt="" />${name}</div>`))
    const corrected = await build()
    expect(corrected.code, corrected.output).toBe(0)
    expect(corrected.output).toContain('IDENTITY_BUILD_REACHED')
  }, 270_000)
})
