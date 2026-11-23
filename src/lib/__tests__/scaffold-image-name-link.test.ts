import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'

import { Linter, type Rule } from 'eslint'
import tseslint from 'typescript-eslint'
import { afterAll, describe, expect, it } from 'vitest'

import { createAppProject } from '../scaffold.js'

const require = createRequire(import.meta.url)
const execFileAsync = promisify(execFile)
const roots: string[] = []
const id = 'molecule-local/single-image-name-link'
const module = (await import('@molecule/eslint-config/rules/prefer-declared-clients.mjs')) as {
  scaffoldRules: (parser: unknown) => Record<string, Rule.RuleModule>
}
// A prior scaffold has no listener for this policy, rather than a broken ESLint
// configuration. This also lets the exact pre-fix source run the regression cases.
const rule = module.scaffoldRules(tseslint.parser)['single-image-name-link'] ?? {
  create: () => ({}),
}
const linter = new Linter()
const config: Linter.Config[] = [
  {
    files: ['**/*.tsx'],
    languageOptions: { parser: tseslint.parser },
    plugins: { 'molecule-local': { rules: { 'single-image-name-link': rule } } },
    rules: { [id]: 'error' },
  },
]
function findings(source: string): Linter.LintMessage[] {
  const messages = linter.verify(source, config, { filename: 'Identity.tsx' })
  expect(messages.filter((message) => message.fatal)).toEqual([])
  return messages.filter((message) => message.ruleId === id)
}
/** ESLint's own --fix result; the fixed source must parse and leave nothing for the rule. */
function fixed(source: string): string {
  const result = linter.verifyAndFix(source, config, { filename: 'Identity.tsx' })
  expect(result.fixed).toBe(true)
  expect(findings(result.output)).toEqual([])
  return result.output
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
    expect(result[0].message).toContain('aria-hidden="true" tabIndex={-1}')
    expect(result[0].message).not.toContain('UserChip')
  })

  it('fixes itself by hiding the image link, keeping its markup, classes and destination', () => {
    const classed = row.replace('<a href=', '<a className={cm.avatarLink} href=')
    expect(fixed(source(classed))).toBe(
      source(
        classed.replace(
          `<a className={cm.avatarLink} href={${destination}}>`,
          `<a className={cm.avatarLink} href={${destination}} aria-hidden="true" tabIndex={-1}>`,
        ),
      ),
    )
  })

  it('replaces an existing tabIndex instead of adding a second one', () => {
    const tabbed = row.replace('<a href=', '<a tabIndex={0} href=')
    expect(fixed(source(tabbed))).toBe(
      source(
        tabbed.replace(
          `<a tabIndex={0} href={${destination}}>`,
          `<a tabIndex={-1} href={${destination}} aria-hidden="true">`,
        ),
      ),
    )
  })

  it.each([
    ['an empty alt', row.replace('alt={person.name}', 'alt=""')],
    ['an empty expression alt', row.replace('alt={person.name}', "alt={''}")],
    ['no alt', row.replace(' alt={person.name}', '')],
  ])('reports and fixes a nameless image link beside its name link (%s)', (_label, markup) => {
    expect(findings(source(markup))).toMatchObject([{ messageId: 'unnamed' }])
    expect(fixed(source(markup))).toContain(
      `<a href={${destination}} aria-hidden="true" tabIndex={-1}>`,
    )
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
    ['an image-only link with no name link beside it', `<div>${image}</div>`],
    [
      'a nameless image link beside a different destination',
      `<div><a href="/gallery"><img src={person.image} alt="" /></a>${name}</div>`,
    ],
    [
      'a nameless image link beside a link without text',
      `<div><a href={${destination}}><img src={person.image} alt="" /></a><a href={${destination}}><Icon /></a></div>`,
    ],
    [
      'an image link already hidden',
      row.replace('<a href=', '<a aria-hidden="true" tabIndex={-1} href='),
    ],
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
  it('warns on redundant identity links, and the scaffold lint:fix script hides the image link', async () => {
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
    // Keep the scaffold's real prebuild and lint flags; lint only this file. The marker proves
    // whether npm passed that hook, without bundling an unrelated application in this test.
    expect(manifest.scripts.lint).toBe('eslint src/')
    expect(manifest.scripts['lint:fix']).toBe('eslint src/ --fix')
    manifest.scripts.lint = 'eslint src/Identity.tsx'
    manifest.scripts['lint:fix'] = 'eslint src/Identity.tsx --fix'
    manifest.scripts.build = 'node -e "console.log(\'IDENTITY_BUILD_REACHED\')"'
    await writeFile(manifestPath, JSON.stringify(manifest))
    await writeFile(file, source(describedImageRow))
    const run = async (script: string): Promise<{ code: number; output: string }> => {
      try {
        const result = await execFileAsync('npm', ['run', script], { cwd: root, timeout: 120_000 })
        return { code: 0, output: result.stdout + result.stderr }
      } catch (error) {
        const result = error as { code: number; stdout: string; stderr: string }
        return { code: result.code, output: result.stdout + result.stderr }
      }
    }
    // A fixable warning, like the scaffold's other fixable rules: the build is reached.
    const warned = await run('build')
    expect(warned.code, warned.output).toBe(0)
    expect(warned.output).toContain(id)
    expect(warned.output).toContain('IDENTITY_BUILD_REACHED')
    const fix = await run('lint:fix')
    expect(fix.code, fix.output).toBe(0)
    expect(await readFile(file, 'utf8')).toContain(`aria-hidden="true" tabIndex={-1}`)
    const clean = await run('lint')
    expect(clean.code, clean.output).toBe(0)
    expect(clean.output).not.toContain(id)
  }, 270_000)
})
