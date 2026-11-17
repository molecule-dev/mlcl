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
  process.env.SCAFFOLD_ESLINT_RULE_MODULE ??
    new URL('../../../templates/shared/prefer-declared-clients.mjs', import.meta.url),
  join(root, 'eslint-rules/prefer-declared-clients.mjs'),
)
await copyFile(
  new URL('../../../templates/shared/no-empty-interactive-target.mjs', import.meta.url),
  join(root, 'eslint-rules/no-empty-interactive-target.mjs'),
)
await copyFile(
  new URL('../../../templates/shared/no-dropped-action.mjs', import.meta.url),
  join(root, 'eslint-rules/no-dropped-action.mjs'),
)
await copyFile(
  new URL('../../../templates/shared/no-class-code.mjs', import.meta.url),
  join(root, 'eslint-rules/no-class-code.mjs'),
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
    '{invoice && <p>{invoice.note}</p>}{!invoice && <p>Waiting for invoice</p>}',
    '{!invoice && query.status === "loading" && <p>Waiting for invoice</p>}{invoice && <><h2>{invoice.number}</h2><p>{invoice.note}</p></>}',
    '{query.data && <p>{query.data.note}</p>}{query.status === "loading" && <Spinner />}',
  ])('the shipped config refuses sibling field/status guards: %s', async (body) => {
    const rows = await findings(`export function Invoice(){
      const query=useInvoice(); const invoice=query.data;
      return <section>${body}</section>
    }`)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ severity: 2 })
    expect(rows[0]?.message).toMatch(/(?:invoice|query.data)\.note/)
  })

  it('the shipped config admits status beside the complete invoice region', async () => {
    expect(
      await findings(`export function Invoice(){
      const {data:invoice}=useInvoice();
      return <main>{invoice && <section><p>{invoice.note}</p></section>}
        {!invoice && <p role="status">Waiting for invoice</p>}</main>
    }`),
    ).toEqual([])
  })

  it('rejects a non-benchmark order page that returns its data region before the order exists', async () => {
    const rows = await findings(`export function OrderSummary() {
      const { data: order } = useOrder()
      if (!order) return <main><section className="order-details"><p>Waiting for order</p></section></main>
      return <main><section className="order-details"><p>{format(order.total)}</p></section></main>
    }`)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.message).toContain('order.total')
  })
  it('keeps an early waiting panel outside the order data region', async () => {
    const rows = await findings(`export function OrderSummary() {
      const { data: order } = useOrder()
      if (!order) return <main><section role="status"><p>Waiting for order</p></section></main>
      return <main><section className="order-details"><p>{format(order.total)}</p></section></main>
    }`)
    expect(rows).toEqual([])
  })
  it('keeps the corrected retained profile loading outside its data region', async () => {
    const source = await readFile(
      new URL('./fixtures/l3190-profile-placeholder.tsx.txt', import.meta.url),
      'utf8',
    )
    const corrected = source.replace('className="user-info"', 'className="container page"')
    expect(await findings(corrected)).toEqual([])
  })

  it.each([
    ['p312-profile-loading-before.tsx.txt', 102, 85],
    ['l3164-profile-placeholder.tsx.txt', 86, 68],
    ['l3190-profile-placeholder.tsx.txt', 45, 68],
    ['p302-profile-loading-before.tsx.txt', 140, 120],
  ])('reports the retained profile page %s', async (fixture, line, fieldLine) => {
    const source = await readFile(new URL(`./fixtures/${fixture}`, import.meta.url), 'utf8')
    const rows = await findings(source)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ line, severity: 2 })
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
    [
      'a different element for the message',
      '{order ? <p>{order.total}</p> : <div role="status">Loading…</div>}',
    ],
  ])('reports a non-benchmark order page with %s', async (_name, body) => {
    const rows = await findings(order(body))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.message).toContain('`order`')
  })

  it.each([
    'accounting-invoicing/app/src/pages/CustomerDetail.tsx',
    'ai-travel-agent/app/src/pages/Pay.tsx',
    'api-documentation/app/src/pages/Settings.tsx',
    'course-marketplace/app/src/pages/Checkout.tsx',
    'flight-search/app/src/pages/Booking.tsx',
    'hotel-booking/app/src/pages/BookingConfirmation.tsx',
  ])('keeps placeholders outside the shipped template record region in %s', async (file) => {
    const source = await readFile(
      new URL(`../../../templates/apps/${file}`, import.meta.url),
      'utf8',
    )
    expect(await findings(source)).toEqual([])
  })

  it.each([
    ['l2606-profile-placeholder.tsx.txt', [68]],
    ['l2730-profile-placeholder.tsx.txt', [79]],
    ['l2787-profile-placeholder.tsx.txt', [87]],
    ['record-placeholder-query-chain.tsx.txt', [11, 13]],
    ['record-placeholder-hook-component.tsx.txt', [5]],
    ['record-placeholder-hook-status.tsx.txt', [5]],
    ['record-placeholder-hook-text.tsx.txt', [5]],
  ])('reports every missing-record branch in %s', async (fixture, lines) => {
    const source = await readFile(new URL(`./fixtures/${fixture}`, import.meta.url), 'utf8')
    const rows = await findings(source)
    expect(rows.map((row) => row.line)).toEqual(lines)
    expect(rows.every((row) => row.severity === 2)).toBe(true)
  })

  it.each([
    [
      'a host container displaying a field directly',
      '{orderQuery.data ? <div>{orderQuery.data.total}</div> : <Spinner label="Loading order…" />}',
    ],
    [
      'a component placeholder',
      '{orderQuery.data ? <p>{orderQuery.data.total}</p> : <Spinner label="Loading order…" />}',
    ],
    [
      'a live region',
      '{orderQuery.data ? <p>{orderQuery.data.total}</p> : <div role="status">Loading…</div>}',
    ],
    ['an alert', '{orderQuery.data ? <p>{orderQuery.data.total}</p> : <p role="alert">Failed</p>}'],
    ['a negated member', '{!orderQuery.data ? <Spinner /> : <p>{orderQuery.data.total}</p>}'],
    [
      'a member null comparison',
      '{orderQuery.data == null ? <Spinner /> : <p>{orderQuery.data.total}</p>}',
    ],
    [
      'a reversed undefined comparison',
      '{undefined !== orderQuery.data ? <p>{orderQuery.data.total}</p> : <Spinner />}',
    ],
    [
      'a loading status',
      '{orderQuery.status === "loading" ? <Spinner /> : <p>{orderQuery.data.total}</p>}',
    ],
    [
      'an error status with error detail',
      '{orderQuery.status === "error" ? <p>{orderQuery.error.message}</p> : <p>{orderQuery.data.total}</p>}',
    ],
    [
      'a successful status',
      '{orderQuery.status === "success" ? <p>{orderQuery.data.total}</p> : <Spinner />}',
    ],
    [
      'a reversed status comparison',
      '{"success" !== orderQuery.status ? <Spinner /> : <p>{orderQuery.data.total}</p>}',
    ],
    [
      'status with a presence test',
      '{orderQuery.status === "success" && orderQuery.data ? <p>{orderQuery.data.total}</p> : <Spinner />}',
    ],
    [
      'a chained status and presence test',
      '{orderQuery.status === "error" ? <p>Failed</p> : orderQuery.data ? <p>{orderQuery.data.total}</p> : <Spinner />}',
    ],
  ])('reports a non-X1 order with %s', async (_name, body) => {
    const rows = await findings(order(body, 'const orderQuery = useQuery(orderOptions(id))'))
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row.severity === 2)).toBe(true)
    expect(rows[0]?.message).toContain('`orderQuery.data`')
    expect(rows[0]?.message).toContain('`orderQuery.data.total`')
  })

  it.each([
    ['nothing while the record is missing', '{order ? <p>{order.total}</p> : null}'],
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

  it.each([
    [
      'list rows rendered from a query collection',
      'export function Tags(){const q=useQuery();return <aside>{q.data && q.data.tags.length > 0 ? <div>{q.data.tags.map(tag => <a href="/tags">{tag}</a>)}</div> : <p>No tags yet</p>}</aside>}',
    ],
    [
      'list rows rendered from an aliased record collection',
      'export function Order(){const {data:order}=useOrder();return <section>{order ? <ul>{order.lines.map(line => <li>{line.name}</li>)}</ul> : <p>Loading</p>}</section>}',
    ],
    [
      'a field used only to choose an empty-list message',
      'export function Calls(){const calls=useCalls();return <ul>{calls == null ? <li>Loading</li> : <li>{calls.length === 0 ? "No calls" : "Filtered out"}</li>}</ul>}',
    ],
    [
      'an optional record selected from a loaded list',
      'export function Newsletter(){const issues=useIssues();const issue=issues[0];return <section>{issue ? <h3>{issue.subject}</h3> : <h3>No issue yet</h3>}</section>}',
    ],
    [
      'an optional field of a settled object default',
      'export function Billing(){const q=useQuery();const billing=q.data ?? {};const method=billing.payment_method ?? null;return <section>{method ? <p>{method.brand}</p> : <p>No card on file</p>}</section>}',
    ],
    [
      'a placeholder beside the whole record region',
      `export function Order() {
      const q = useQuery(orderOptions())
      return <>{q.data ? <section className="order"><p>{q.data.total}</p></section> : <Spinner />}</>
    }`,
    ],
    [
      'a fragment inside a shared record region',
      `export function Order() {
      const q = useQuery(orderOptions())
      return <section>{q.data ? <div><p>{q.data.total}</p></div> : <Spinner />}</section>
    }`,
    ],
    [
      'status beside a list',
      `export function Orders() {
      const q = useQuery(ordersOptions())
      return <section>{q.status === 'loading' ? <p role="status">Loading…</p> : null}<ul>{(q.data ?? []).map(row => <li>{row.number}</li>)}</ul></section>
    }`,
    ],
    [
      'early returns',
      `export function Order() {
      const q = useQuery(orderOptions())
      if (q.status === 'error') return <p role="alert">Failed</p>
      if (!q.data) return <Spinner />
      return <section><p>{q.data.total}</p></section>
    }`,
    ],
    [
      'a ternary on a record field',
      `export function Order() {
      const q = useQuery(orderOptions())
      return <section>{q.data.draft ? <p>{q.data.total}</p> : <p>Published</p>}</section>
    }`,
    ],
    [
      'signed-in and signed-out navigation',
      `export function Nav() {
      const { user } = useAuth()
      return <nav>{user ? <span>{user.name}</span> : <a href="/login">Sign in</a>}</nav>
    }`,
    ],
    [
      'a field null comparison',
      `export function Order() {
      const q = useQuery(orderOptions())
      return <section>{q.data.draft == null ? <p>Published</p> : <p>{q.data.total}</p>}</section>
    }`,
    ],
  ])('keeps %s quiet', async (_name, source) => {
    expect(await findings(source)).toEqual([])
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
