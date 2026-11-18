/** Missing font dependencies must fail the project's real checks before its first build. */
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { promisify } from 'node:util'

import { afterEach, describe, expect, it } from 'vitest'

import { type CheckStepResult, runCheckLocal } from '../check.js'
import { createAppProject } from '../scaffold.js'

const require = createRequire(import.meta.url)
const execFileAsync = promisify(execFile)
const roots: string[] = []
const budgetMs = 60_000
const rule = 'molecule-local/require-icon-font-setup'
const built = 'FIRST_BUILD_REACHED'
const setup = `import { setFont } from '@molecule/app-fonts'
import { font } from '@molecule/app-fonts-ionicons'
setFont(font)
`

// The recurring shapes include a sizing exemption, a contentful parent, keyboard
// activation, nested controls and private-use CSS. None supplies the missing font.
// Names and event behavior are ordinary equipment controls, independent of a spec.
interface FixtureOptions {
  sizingExemption?: boolean
  css?: string
}

const shapes: [string, string, FixtureOptions][] = [
  [
    'direct pointer activation',
    '<i className="ion-close-round" role="button" tabIndex={0} aria-label="Remove equipment" onClick={act} onKeyDown={act} />',
    {},
  ],
  [
    'keyboard activation',
    '<i className="ion-trash-a" role="button" tabIndex={0} aria-label="Remove equipment" onKeyDown={act} />',
    {},
  ],
  [
    'accessible name with a sizing exemption',
    '<i className="ion-close-round" role="button" tabIndex={0} aria-label="Remove equipment" onClick={act} onKeyDown={act} />',
    { sizingExemption: true },
  ],
  [
    'activation on its parent',
    '<span role="button" tabIndex={0} aria-label="Remove equipment" onClick={act} onKeyDown={act}><i className="ion-trash-a" /></span>',
    {},
  ],
  [
    'private-use CSS glyph',
    '<i className="ion-close-round" role="button" tabIndex={0} aria-label="Remove equipment" onClick={act} onKeyDown={act} />',
    // Geometry and a private-use code point cannot draw a glyph without its font.
    { css: '.ion-close-round::before { content: "\\f129"; }' },
  ],
  [
    'contentful button with an empty glyph',
    '<button onClick={act}><i className="ion-trash-a" aria-hidden="true" />Remove equipment</button>',
    {},
  ],
  [
    'a sized button with an unpainted icon child',
    '<button className="equipment-remove" aria-label="Remove equipment" onClick={act}><i className="ion-trash-a" aria-hidden="true" /></button>',
    { css: '.equipment-remove { display: inline-flex; width: 2rem; height: 2rem; }' },
  ],
  [
    'multiple classes',
    '<i className="equipment-remove ion-close-round" role="button" tabIndex={0} aria-label="Remove equipment" onClick={act} onKeyDown={act} />',
    {},
  ],
]

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

async function project(markup: string, options: FixtureOptions = {}): Promise<string> {
  const container = await mkdtemp(join(tmpdir(), 'first-build-font-'))
  roots.push(container)
  const root = join(container, 'app')
  await createAppProject(root, 'equipment-console', 'react')
  // Resolve installed tools through the parent. The app's node_modules/.cache
  // must remain private rather than writing logs through the installation link.
  await symlink(
    dirname(dirname(require.resolve('eslint/package.json'))),
    join(container, 'node_modules'),
  )
  await mkdir(join(root, 'src'), { recursive: true })
  await writeFile(
    join(root, 'src/Control.tsx'),
    `${options.sizingExemption ? '/* eslint molecule-local/no-empty-interactive-target: "off" -- Geometry has separate browser coverage. */\n' : ''}export function Control({ act }: { act: () => void }) {
  return ${markup}
}
`,
  )
  if (options.css) {
    await writeFile(join(root, 'src/control.css'), `${options.css}\n`)
    const main = join(root, 'src/main.tsx')
    await writeFile(main, "import './control.css'\n" + (await readFile(main, 'utf8')))
  }
  const manifestPath = join(root, 'package.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
    scripts: Record<string, string>
  }
  // Keep the generated prebuild verbatim. A tiny build command proves whether
  // npm reached the build after that hook, without invoking a second compiler.
  manifest.scripts.build = `node -e "console.log('${built}')"`
  manifest.scripts.lint = 'eslint src/Control.tsx --max-warnings 0'
  await writeFile(manifestPath, JSON.stringify(manifest))
  await execFileAsync('git', ['init', '-q', root])
  return root
}

async function check(
  root: string,
  steps: string[],
): Promise<{ ok: boolean; report: string; results: CheckStepResult[] }> {
  const result = await runCheckLocal(root, { steps }, { budgetMs })
  if ('error' in result) throw new Error(result.error)
  for (const step of result.results) {
    const log = relative(await realpath(root), await realpath(step.logPath))
    expect(log).not.toMatch(/^\.\.(?:[/\\]|$)/)
  }
  return result
}

describe('first-build icon font dependency', () => {
  it.each(shapes)(
    'the native check rejects %s before a build',
    async (_name, markup, options) => {
      const root = await project(markup, options)
      const result = await check(root, ['lint'])
      expect(result.ok, result.report).toBe(false)
      const diagnostic = result.results.flatMap((step) => step.errors).join('\n')
      expect(diagnostic).toContain(rule)
      expect(diagnostic).toContain('@molecule/app-fonts-ionicons')
      expect(diagnostic).toContain('src/Control.tsx:')
    },
    budgetMs + 10_000,
  )

  it(
    'the generated npm prebuild rejects the missing font and admits its invoked setup',
    async () => {
      const root = await project(shapes[0][1])
      const before = await check(root, ['build'])
      expect(before.ok, before.report).toBe(false)
      expect(before.results[0].errors.join('\n')).toContain(rule)
      expect(await readFile(before.results[0].logPath, 'utf8')).not.toContain(built)

      await writeFile(join(root, 'src/bonds/icon-font.ts'), setup)
      const bonds = join(root, 'src/bonds/index.ts')
      await writeFile(bonds, "import './icon-font.js'\n" + (await readFile(bonds, 'utf8')))
      const after = await check(root, ['lint', 'build'])
      expect(after.ok, after.report).toBe(true)
      const build = after.results.find((step) => step.kind === 'build')
      expect(build?.status).toBe('passed')
      expect(await readFile(build!.logPath, 'utf8')).toContain(built)
      expect(after.report).not.toContain(rule)
    },
    3 * budgetMs + 10_000,
  )

  it.each([
    [
      'text fallback',
      '<i className="ion-close-round" role="button" tabIndex={0} aria-label="Remove equipment" onClick={act} onKeyDown={act}>×</i>',
    ],
    [
      'SVG fallback',
      '<i className="ion-trash-a" role="button" tabIndex={0} aria-label="Remove equipment" onClick={act} onKeyDown={act}><svg width="16" height="16" aria-hidden="true"><path d="M0 0h16v16H0z" /></svg></i>',
    ],
  ])(
    'admits a real %s without adding a font requirement',
    async (_name, markup) => {
      const result = await check(await project(markup), ['lint', 'build'])
      expect(result.ok, result.report).toBe(true)
      expect(result.report).not.toContain(rule)
    },
    budgetMs + 10_000,
  )
})
