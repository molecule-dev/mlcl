import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { ESLint, type Linter } from 'eslint'
import { afterAll, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const root = await mkdtemp(join(tmpdir(), 'paragraph-rule-'))
await mkdir(join(root, 'eslint-rules'))
await mkdir(join(root, 'src'))
await copyFile(
  process.env.SCAFFOLD_ESLINT_TEMPLATE ??
    new URL('../../../templates/shared/eslint.config.js.tpl', import.meta.url),
  join(root, 'eslint.config.mjs'),
)
await copyFile(
  new URL('../../../templates/shared/prefer-declared-clients.mjs', import.meta.url),
  join(root, 'eslint-rules/prefer-declared-clients.mjs'),
)
await symlink(dirname(dirname(require.resolve('eslint/package.json'))), join(root, 'node_modules'))
afterAll(() => rm(root, { recursive: true, force: true }))
const config = (await import(pathToFileURL(join(root, 'eslint.config.mjs')).href)).default
const engine = new ESLint({ cwd: root, overrideConfig: config, overrideConfigFile: true })
const fixture = async (name: string): Promise<string> =>
  readFile(new URL(`./fixtures/p313-${name}.tsx.txt`, import.meta.url), 'utf8')
async function findings(source: string): Promise<Linter.LintMessage[]> {
  const report = await engine.lintText(source, { filePath: join(root, 'src/Detail.tsx') })
  expect(report.flatMap((file) => file.messages.filter((row) => row.fatal))).toEqual([])
  return report.flatMap((file) =>
    file.messages.filter((row) => row.ruleId === 'molecule-local/no-block-in-paragraph'),
  )
}

describe('paragraph content through local component roots', () => {
  it('reports retained l2366 CommentSection and its actual Markdown renderer at line 96', async () => {
    await writeFile(join(root, 'src/Markdown.tsx'), await fixture('Markdown'))
    const rows = await findings(await fixture('CommentSection'))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ line: 96, severity: 1 })
    expect(rows[0]!.message).toContain('<div> through Markdown')
  })
  it('accepts the exact retained outer-div correction', async () => {
    expect(
      await findings(
        (await fixture('CommentSection'))
          .replace('<p className="card-text">', '<div className="card-text">')
          .replace('              </p>', '              </div>'),
      ),
    ).toEqual([])
  })
  it.each([
    '<p><div>Invoice lines</div></p>',
    '<p><span><section>Invoice lines</section></span></p>',
    '<p>{open ? <div>Invoice</div> : null}</p>',
    '<p>{open && <p>Invoice</p>}</p>',
    '<p><Body /></p>',
  ])('reports a non-benchmark invoice paragraph: %s', async (body) => {
    expect(
      await findings(
        `const Body = () => <article>Invoice</article>; export const Detail = () => ${body}`,
      ),
    ).toHaveLength(1)
  })
  it.each([
    '<p><span>Inline <strong>copy</strong></span></p>',
    '<div><p>One</p><p>Two</p></div>',
    '<p><Unknown><div>Discardable child</div></Unknown></p>',
    '<p>{text}</p>',
    '<p><Inline /></p>',
    '<p>{false && <div>Unreachable</div>}</p>',
    '<p>{false ? <div>Unreachable</div> : <span>Inline</span>}</p>',
    '<p>{true || <div>Unreachable</div>}</p>',
  ])('keeps valid phrasing and opaque renderers quiet: %s', async (body) => {
    expect(
      await findings(
        `const Inline = () => <span>Invoice</span>; export const Detail = () => ${body}`,
      ),
    ).toEqual([])
  })
  it('keeps a shadowing component prop opaque', async () => {
    expect(
      await findings(
        'const Body = () => <div />; export function Detail({Body}) { return <p><Body /></p> }',
      ),
    ).toEqual([])
  })
  it('keeps a prop-dependent component root unverified', async () => {
    expect(
      await findings(
        'function Body({inline}) {return inline ? <span/> : <div/>}; export const Detail = () => <p><Body inline /></p>',
      ),
    ).toEqual([])
  })
})
