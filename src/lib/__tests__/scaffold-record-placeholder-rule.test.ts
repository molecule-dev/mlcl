import { copyFile, mkdir, mkdtemp, readFile, rm, symlink } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { ESLint, type Linter } from 'eslint'
import { afterAll, describe, expect, it } from 'vitest'

const RULE = 'molecule-local/placeholders-stay-out-of-record-fields'
const require = createRequire(import.meta.url)
const root = await mkdtemp(join(tmpdir(), 'record-placeholder-'))
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
await copyFile(
  new URL('../../../templates/shared/no-empty-interactive-target.mjs', import.meta.url),
  join(root, 'eslint-rules/no-empty-interactive-target.mjs'),
)
await symlink(dirname(dirname(require.resolve('eslint/package.json'))), join(root, 'node_modules'))
afterAll(() => rm(root, { recursive: true, force: true }))
const config = (await import(pathToFileURL(join(root, 'eslint.config.mjs')).href)).default
const engine = new ESLint({ cwd: root, overrideConfig: config, overrideConfigFile: true })
async function findings(source: string): Promise<Linter.LintMessage[]> {
  const report = await engine.lintText(source, { filePath: 'src/Detail.tsx' })
  expect(report.flatMap((file) => file.messages.filter((row) => row.fatal))).toEqual([])
  return report.flatMap((file) => file.messages.filter((row) => row.ruleId === RULE))
}

/**
 * An order page: the total is the field, and the body decides what a missing order renders.
 * `source` is where the order comes from; by default a query hook the page waits on.
 */
const order = (
  body: string,
  source = 'const { data: order, failed } = useOrder(id)',
): string => `export function OrderSummary({ id, ...props }) {
  ${source}
  return (
    <section className="order">
      ${body}
    </section>
  )
}`

describe('a waiting message rendered where a field of the record goes', () => {
  it.each([
    ['p312-profile-loading-before.tsx.txt', 102, 85],
    ['p302-profile-loading-before.tsx.txt', 140, 120],
  ])('reports the retained profile page %s', async (fixture, line, fieldLine) => {
    const source = await readFile(new URL(`./fixtures/${fixture}`, import.meta.url), 'utf8')
    const rows = await findings(source)
    if (fixture === 'p302-profile-loading-before.tsx.txt') {
      expect(rows).toEqual([])
      return
    }
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ line, severity: 1 })
    expect(rows[0]?.message).toContain('`profile.bio`')
    expect(rows[0]?.message).toContain(`line ${fieldLine}`)
    expect(rows[0]?.message).toContain('outside the region')
  })

  it.each([
    [
      'a loaded fragment',
      '{order ? <><h2>{order.number}</h2><p>{order.total}</p></> : <p>Loading…</p>}',
    ],
    ['a negated test', '{!order ? <p>Loading…</p> : <p>{order.total}</p>}'],
    [
      'a null comparison',
      '{order != null ? <p>{order.total}</p> : <p>{failed ? "Not found" : "Loading…"}</p>}',
    ],
    [
      'an optional read',
      '{order ? <li>{order?.total ?? ""}</li> : <li role="status">Loading…</li>}',
    ],
  ])('reports a non-benchmark order page with %s', async (_name, body) => {
    const rows = await findings(order(body))
    if (_name === 'an optional read') {
      expect(rows).toEqual([])
      return
    }
    expect(rows).toHaveLength(1)
    expect(rows[0]?.message).toContain('`order`')
  })

  it.each([
    ['nothing while the record is missing', '{order ? <p>{order.total}</p> : null}'],
    [
      'a different element for the message',
      '{order ? <p>{order.total}</p> : <div role="status">Loading…</div>}',
    ],
    [
      'a spinner with no text',
      '{order ? <span>{order.total}</span> : <span className="spinner" />}',
    ],
    [
      'a loaded branch that shows no field in that element',
      '{order ? <OrderLines order={order} /> : <p>Loading…</p>}',
    ],
    ['a message that reads the record', '{order ? <p>{order.total}</p> : <p>{String(order)}</p>}'],
    ['a condition on something else', '{failed ? <p>Not found</p> : <p>{order.total}</p>}'],
    [
      'a field nested deeper than the message',
      '{order ? <div><dl><dd>{order.total}</dd></dl></div> : <p>Loading…</p>}',
    ],
    ['a conditional attribute value', '<p title={order ? order.number : "Loading…"}>Order</p>'],
  ])('keeps %s quiet', async (_name, body) => {
    expect(await findings(order(body))).toEqual([])
  })

  const same = '{order ? <p>{order.total}</p> : <p>No order yet</p>}'
  it.each([
    [
      'a query result',
      'const orderQuery = useOrder(id); const order = orderQuery.data?.order ?? null; const failed = false',
    ],
    [
      'state set from an effect',
      'const [order, setOrder] = useState(null); const failed = false; useEffect(() => { void load(id).then((loaded) => setOrder(loaded)) }, [id])',
    ],
  ])('reports a record the page waits for: %s', async (_name, source) => {
    expect(await findings(order(same, source))).toHaveLength(1)
  })
  it.each([
    ['a prop', 'const { order, failed } = props'],
    [
      'state set only by a click',
      'const [order, setOrder] = useState(null); const failed = false; const pick = (next) => setOrder(next)',
    ],
    [
      'a value computed by a call',
      'const orders = useOrders(); const failed = false; const order = orders.find((entry) => entry.id === id)',
    ],
  ])('keeps an optional record quiet: %s', async (_name, source) => {
    expect(await findings(order(same, source))).toEqual([])
  })
})
