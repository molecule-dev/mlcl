/** Exercise the shipped lint config, including its real stylesheet loading boundary. */
import { execFile } from 'node:child_process'
import {
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'

import { ESLint, type Linter } from 'eslint'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { runCheckLocal } from '../check.js'
import { createAppProject } from '../scaffold.js'

const require = createRequire(import.meta.url)
const execFileAsync = promisify(execFile)
const shared = new URL('../../../templates/shared/', import.meta.url)
const ruleId = 'molecule-local/no-empty-interactive-target'
let root: string
let engine: ESLint

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'empty-interactive-target-'))
  await mkdir(join(root, 'src'), { recursive: true })
  await mkdir(join(root, 'eslint-rules'))
  await symlink(
    dirname(dirname(require.resolve('eslint/package.json'))),
    join(root, 'node_modules'),
  )
  await writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module' }))
  await copyFile(
    process.env.SCAFFOLD_ESLINT_TEMPLATE ?? new URL('eslint.config.js.tpl', shared),
    join(root, 'eslint.config.mjs'),
  )
  for (const file of await readdir(shared)) {
    if (file.endsWith('.mjs'))
      await copyFile(new URL(file, shared), join(root, 'eslint-rules', file))
  }
  engine = new ESLint({
    cwd: root,
    overrideConfigFile: join(root, 'eslint.config.mjs'),
    overrideConfig: { languageOptions: { parserOptions: { tsconfigRootDir: root } } },
  })
})

afterAll(async () => rm(root, { recursive: true, force: true }))

async function findings(source: string, file = 'Control.tsx'): Promise<Linter.LintMessage[]> {
  const results = await engine.lintText(source, { filePath: join(root, 'src', file) })
  expect(results.flatMap((result) => result.messages.filter((row) => row.fatal))).toEqual([])
  return results.flatMap((result) => result.messages.filter((row) => row.ruleId === ruleId))
}

const control = (markup: string): string =>
  `export function Control({ act, label, props }) {\n  return ${markup}\n}`

describe('empty interactive targets', () => {
  it('rejects a named, keyboard-accessible but undrawn target at its source line', async () => {
    const messages = await findings(
      control(
        '<i className="missing-glyph" role="button" tabIndex={0} aria-label={label} onClick={act} />',
      ),
    )
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({ line: 2, severity: 2 })
    expect(messages[0]?.message).toContain('visible content')
    expect(messages[0]?.message).toContain('Icon')
  })

  it.each([
    '<span onClick={act} aria-label={label} />',
    '<div role="button" tabIndex={0} aria-label={label}></div>',
    '<a href="/help" aria-label={label} />',
    '<span onClick={act} aria-label={label}>{/* a name does not draw anything */}</span>',
    '<a href="/help" title={label}><i className="absent-glyph" /></a>',
    '<i role="button" onClick={act} className="missing-glyph">{null}{false}{""}</i>',
    '<span role="switch" tabIndex={0} aria-label={label} onKeyDown={act} />',
  ])('rejects an empty target: %s', async (markup) => {
    expect(await findings(control(markup))).toHaveLength(1)
  })

  it.each([
    '<button onClick={act}>Open</button>',
    '<button onClick={act}>{0}</button>',
    '<button onClick={act}><svg width="20" height="20"><path d="M0 0h20v20H0z" /></svg></button>',
    '<button onClick={act}><Icon name="x-mark" /></button>',
    '<button onClick={act}><img src="/close.svg" alt="Close" /></button>',
    '<button onClick={act}>{label}</button>',
    '<button onClick={act} children={label} />',
    '<button onClick={act} children={0} />',
    '<button onClick={act} {...props} />',
    '<button onClick={act} dangerouslySetInnerHTML={props} />',
    '<button onClick={act} className={props.className} />',
    '<div onClick={act} style={props.style} />',
    '<span onClick={act} style={{ display: "inline-block", width: 24, height: 24, background: "red" }} />',
    '<input type="checkbox" aria-label={label} />',
    '<rect onClick={act} width={24} height={24} fill="red" />',
    '<ellipse onClick={act} cx={20} cy={20} rx={10} ry={10} fill="red" />',
    '<line onClick={act} x1={0} x2={20} y1={0} y2={20} stroke="red" />',
    '<button onClick={act} aria-label={label} />',
    '<div onClick={act} role="presentation" className="generated-overlay" />',
    '<div onClick={act} aria-hidden="true" className="generated-overlay" />',
    '<div onClick={act} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)" }} />',
    '<span className="decoration" />',
    '<button hidden onClick={act} />',
    '<Icon name="x-mark" onClick={act} />',
  ])(
    'preserves content, explicit styling, native controls and unknown runtime values: %s',
    async (markup) => {
      expect(await findings(control(markup))).toEqual([])
    },
  )

  it('does not treat an unused stylesheet as loaded', async () => {
    await writeFile(join(root, 'src/unused.css'), '.unloaded::before { content: "×"; }')
    expect(
      await findings(control('<i role="button" onClick={act} className="unloaded" />')),
    ).toHaveLength(1)
  })

  it('accepts the same empty element when its module imports CSS that draws it', async () => {
    await writeFile(join(root, 'src/control.css'), '.drawn::before { content: "×"; }')
    const source = `import './control.css'\n${control('<i role="button" onClick={act} className="drawn" />')}`
    expect(await findings(source)).toEqual([])
  })

  it('follows global entry imports and CSS imports without needing a test suite', async () => {
    await writeFile(join(root, 'index.html'), '<script type="module" src="/src/main.tsx"></script>')
    await writeFile(join(root, 'src/main.tsx'), "import './global.css'; import './Control.js'")
    await writeFile(join(root, 'src/global.css'), '@import "./glyph.css";')
    await writeFile(join(root, 'src/glyph.css'), '.global-glyph::before { content: "×"; }')
    const markup = '<i role="button" onClick={act} className="global-glyph" />'
    expect(await findings(control(markup))).toEqual([])
    expect(
      await findings(control('<i role="button" onClick={act} className="still-missing" />')),
    ).toHaveLength(1)
  })

  it('accepts an HTML-linked stylesheet and inline style block', async () => {
    await writeFile(join(root, 'src/linked.css'), '.linked::before { content: "×"; }')
    await writeFile(
      join(root, 'index.html'),
      '<link rel="stylesheet" href="/src/linked.css"><style>#drawn-by-id { display:inline-block; width:20px; height:20px; background:red }</style>',
    )
    expect(await findings(control('<i role="button" onClick={act} className="linked" />'))).toEqual(
      [],
    )
    expect(
      await findings(control('<span role="button" onClick={act} id="drawn-by-id" />')),
    ).toEqual([])
  })

  it('does not mistake a stylesheet comment or cursor-only styling for a visual', async () => {
    await writeFile(
      join(root, 'src/no-glyph.css'),
      '/* .pretend::before { content: "×" } */\n.cursor-only { cursor: pointer; color: red }',
    )
    for (const className of ['pretend', 'cursor-only']) {
      expect(
        await findings(
          `import './no-glyph.css';\n${control(`<i role="button" onClick={act} className="${className}" />`)}`,
        ),
      ).toHaveLength(1)
    }
  })

  it('handles delegated clicks with a stylesheet-drawn child', async () => {
    await writeFile(join(root, 'src/child.css'), '.child-glyph::before { content: "×" }')
    expect(
      await findings(
        `import './child.css';\n${control('<button onClick={act}><i className="child-glyph" /></button>')}`,
      ),
    ).toEqual([])
  })

  it('does not let an unrelated remote stylesheet certify an arbitrary missing class', async () => {
    await writeFile(
      join(root, 'index.html'),
      '<link rel="stylesheet" href="https://example.invalid/fonts.css">',
    )
    expect(
      await findings(control('<i role="button" onClick={act} className="missing-glyph" />')),
    ).toHaveLength(1)
  })

  it('does not let an unrelated data import certify a missing glyph', async () => {
    await writeFile(join(root, 'src/settings.json'), '{"theme":"day"}')
    expect(
      await findings(
        `import settings from './settings.json'\n${control('<i role="button" onClick={act} aria-label={settings.theme} className="missing-glyph" />')}`,
      ),
    ).toHaveLength(1)
  })

  it('does not let an imported image disable the missing-glyph check', async () => {
    await writeFile(
      join(root, 'src/logo.png'),
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5mVSkAAAAASUVORK5CYII=',
        'base64',
      ),
    )
    expect(
      await findings(
        `import logo from './logo.png'\n${control('<i role="button" onClick={act} aria-label={logo} className="missing-glyph" />')}`,
      ),
    ).toHaveLength(1)
  })

  it('does not let unrelated class or attribute selectors certify a missing glyph', async () => {
    await writeFile(
      join(root, 'src/unrelated.css'),
      '.other::before { content: "×" }\n[role="dialog"] { width: 20px }\n[data-box] { padding: 4px }',
    )
    expect(
      await findings(
        `import './unrelated.css'\n${control('<i role="button" onClick={act} className="missing-glyph" />')}`,
      ),
    ).toHaveLength(1)
    await writeFile(join(root, 'src/attribute.css'), '[data-glyph]::before { content: "×" }')
    expect(
      await findings(
        `import './attribute.css'\n${control('<i role="button" data-glyph="close" onClick={act} />')}`,
      ),
    ).toEqual([])
  })

  it('checks a representative non-benchmark template through its own lint config', async () => {
    const app = new URL('../../../templates/apps/note-taking/app/', import.meta.url)
    const templateEngine = new ESLint({
      cwd: new URL('.', app).pathname,
      overrideConfigFile: new URL('eslint.config.js', app).pathname,
      overrideConfig: {
        languageOptions: { parserOptions: { tsconfigRootDir: new URL('.', app).pathname } },
      },
    })
    const results = await templateEngine.lintFiles(['src/**/*.{ts,tsx}'])
    expect(results.length).toBeGreaterThan(10)
    expect(
      results.flatMap((result) =>
        result.messages.filter((row) => row.fatal || row.ruleId === ruleId),
      ),
    ).toEqual([])
    const [mutant] = await templateEngine.lintText(
      control('<i role="button" onClick={act} className="missing-custom-glyph" />'),
      { filePath: new URL('src/Control.tsx', app).pathname },
    )
    expect(mutant.messages.filter((row) => row.ruleId === ruleId)).toHaveLength(1)
    // Native lint feedback is identical for code in a suite or in an app with no suite.
    expect(
      await findings(control('<i role="button" onClick={act} />'), 'Control.spec.tsx'),
    ).toHaveLength(1)
  })

  it('delivers the rule to a custom scaffold and mlcl check rejects it before a browser walk', async () => {
    const app = join(root, 'generated-app')
    await createAppProject(app, 'equipment-console', 'react')
    expect(await readFile(join(app, 'eslint-rules/no-empty-interactive-target.mjs'), 'utf8')).toBe(
      await readFile(new URL('no-empty-interactive-target.mjs', shared), 'utf8'),
    )
    await execFileAsync('git', ['init', '-q', app])
    await execFileAsync('git', ['add', '--', '.'], { cwd: app })
    const source =
      'export function Control({ act }: { act: () => void }) { return <i role="button" tabIndex={0} aria-label="Dismiss" className="missing-glyph" onClick={act} onKeyDown={act} /> }\n'
    await writeFile(join(app, 'src/Control.tsx'), source)
    const result = await runCheckLocal(app, { steps: ['lint'] }, { budgetMs: 20_000 })
    expect('error' in result).toBe(false)
    if ('error' in result) throw new Error(result.error)
    expect(result.ok, JSON.stringify(result)).toBe(false)
    expect(result.report).toContain('FAIL lint')
    expect(result.results[0].errors.join('\n')).toContain('visible content')
    expect(result.results[0].errors.join('\n')).toContain('Control.tsx')
    await writeFile(
      join(app, 'src/Control.tsx'),
      source.replace(/<i .*\/>/, '<button onClick={act}>Dismiss</button>'),
    )
    const fixed = await runCheckLocal(app, { steps: ['lint'] }, { budgetMs: 20_000 })
    expect('error' in fixed).toBe(false)
    if ('error' in fixed) throw new Error(fixed.error)
    expect(fixed.ok).toBe(true)
  })
})
