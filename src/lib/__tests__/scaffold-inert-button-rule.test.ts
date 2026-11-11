import { copyFile, mkdir, mkdtemp, readFile, rm, symlink } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { ESLint, type Linter } from 'eslint'
import { afterAll, describe, expect, it } from 'vitest'

const RULE = 'molecule-local/buttons-have-an-action'
const require = createRequire(import.meta.url)
const root = await mkdtemp(join(tmpdir(), 'inert-button-'))
await mkdir(join(root, 'eslint-rules'))
await copyFile(
  // SCAFFOLD_ESLINT_TEMPLATE points the same cases at another copy of the config (an older one).
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
async function findings(source: string): Promise<Linter.LintMessage[]> {
  const report = await engine.lintText(source, { filePath: 'src/Control.tsx' })
  expect(report.flatMap((file) => file.messages.filter((row) => row.fatal))).toEqual([])
  return report.flatMap((file) => file.messages.filter((row) => row.ruleId === RULE))
}

/** A share control drawn for the layout; the component that copies the link was never wired. */
const invoice = (button: string): string => `export function InvoiceRow({ invoice, onOpen }) {
  return (
    <li>
      <a href={'/invoices/' + invoice.id}>{invoice.number}</a>
      ${button}
    </li>
  )
}`

describe('a button that cannot do anything', () => {
  it('reports the placeholder favorite button P312 l2359 deployed', async () => {
    const source = await readFile(
      new URL('./fixtures/p312-article-preview-before.tsx.txt', import.meta.url),
      'utf8',
    )
    const rows = await findings(source)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ line: 28, severity: 1 })
    expect(rows[0]?.message).toContain('Control.tsx:28')
    expect(rows[0]?.message).toContain('pressing it does nothing')
  })

  it('reports a non-benchmark invoice row whose copy-link button has no handler', async () => {
    const rows = await findings(
      invoice('<button type="button" className="copy">Copy link</button>'),
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ line: 5 })
  })

  it.each([
    ['a click handler', '<button type="button" onClick={() => onOpen(invoice)}>Open</button>'],
    ['another event handler', '<button type="button" onPointerDown={onOpen}>Open</button>'],
    ['spread props', '<button type="button" {...invoice.actionProps}>Open</button>'],
    ['a submit button', '<button type="submit">Save</button>'],
    ['a button with no type, which submits a parent form', '<button>Save</button>'],
    ['a computed type', '<button type={invoice.kind}>Save</button>'],
    ['a control that is switched off', '<button type="button" disabled>Soon</button>'],
    ['a ref a script can bind', '<button type="button" ref={invoice.ref}>Open</button>'],
    ['a native popover invoker', '<button type="button" popoverTarget="menu">Menu</button>'],
    ['a data hook a script can bind', '<button type="button" data-action="copy">Copy</button>'],
    [
      'a handler on an ancestor',
      '<div onClick={() => onOpen(invoice)}><button type="button">Open</button></div>',
    ],
    ['a label that forwards the click', '<label><button type="button">Pick</button></label>'],
    ['a component, not the element', '<Button type="button">Open</Button>'],
  ])('keeps %s quiet', async (_name, button) => {
    expect(await findings(invoice(button))).toEqual([])
  })
})
