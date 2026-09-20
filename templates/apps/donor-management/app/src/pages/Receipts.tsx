import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatMoney } from '../lib/format.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'
import type { Donor, Receipt, ReceiptPreview } from '../types.js'

export function Receipts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [donors, setDonors] = useState<Donor[]>([])
  const [donorId, setDonorId] = useState('')
  const [year, setYear] = useState(new Date().getFullYear() - 1)
  const [preview, setPreview] = useState<ReceiptPreview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/receipts').then((r) => unwrapList<Receipt>(r)),
      http.get('/api/donors').then((r) => unwrapList<Donor>(r)),
    ])
      .then(([rc, dn]) => {
        if (cancelled) return
        setReceipts(rc)
        setDonors(dn)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('receipts.loadError', {}, { defaultValue: 'Failed to load receipts.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function runPreview() {
    if (!donorId) {
      setError(t('receipts.pickDonor', {}, { defaultValue: 'Pick a donor first.' }))
      return
    }
    setPreviewing(true)
    setError(null)
    try {
      const res = await http.get(`/api/receipts/preview?donor_id=${donorId}&year=${year}`)
      setPreview(unwrapSingle<ReceiptPreview>(res))
    } catch (err) {
      setPreview(null)
      setError(
        err instanceof Error
          ? err.message
          : t('receipts.previewError', {}, { defaultValue: 'Failed to preview the receipt.' }),
      )
    } finally {
      setPreviewing(false)
    }
  }

  async function generate() {
    if (!donorId) return
    setGenerating(true)
    setError(null)
    try {
      const res = await http.post('/api/receipts/generate', { donor_id: donorId, year })
      const created = unwrapSingle<Receipt>(res)
      setPreview(null)
      if (created) setReceipts((prev) => [created, ...prev])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('receipts.generateError', {}, { defaultValue: 'Failed to generate the receipt.' }),
      )
    } finally {
      setGenerating(false)
    }
  }

  const years: number[] = []
  const thisYear = new Date().getFullYear()
  for (let y = thisYear; y >= thisYear - 5; y--) years.push(y)

  const inputCls = cm.cn(
    cm.sp('px', 3),
    cm.sp('py', 2),
    cm.textSize('sm'),
    'border border-outline-variant rounded-md w-full',
  )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-6')}>
      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('receipts.heading', {}, { defaultValue: 'Tax receipts' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'receipts.subheading',
            {},
            {
              defaultValue:
                'Year-end: pick a donor and a year — every unreceipted gift becomes one numbered, itemized receipt you can print.',
            },
          )}
        </p>
      </header>

      <section className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4')}>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {t('receipts.generateHeading', {}, { defaultValue: 'Generate a receipt' })}
        </h2>
        <div className={cm.grid({ cols: 3, gap: 'md' })}>
          <label className={cm.stack(1)}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
              {t('receipts.donor', {}, { defaultValue: 'Donor' })}
            </span>
            <select
              value={donorId}
              onChange={(e) => setDonorId(e.target.value)}
              className={inputCls}
            >
              <option value="">
                {t('receipts.pickDonor', {}, { defaultValue: 'Pick a donor first.' })}
              </option>
              {donors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className={cm.stack(1)}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
              {t('receipts.year', {}, { defaultValue: 'Year' })}
            </span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className={inputCls}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <div className={cm.flex({ align: 'end', gap: 'sm' })}>
            <button
              type="button"
              onClick={runPreview}
              disabled={previewing || !donorId}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'border border-outline-variant rounded-md disabled:opacity-50',
              )}
            >
              {previewing
                ? t('receipts.previewing', {}, { defaultValue: 'Previewing…' })
                : t('receipts.preview', {}, { defaultValue: 'Preview' })}
            </button>
          </div>
        </div>

        {preview ? (
          <div className={cm.cn(cm.sp('p', 4), 'rounded-lg bg-surface-container-low space-y-3')}>
            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t(
                  'receipts.previewSummary',
                  { donor: preview.donor_name, year: preview.year },
                  { defaultValue: '{{donor}} · {{year}}' },
                )}
              </p>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'receipts.previewCounts',
                  { count: preview.gift_count, total: formatMoney(preview.total_cents) },
                  { defaultValue: '{{count}} unreceipted gifts · {{total}}' },
                )}
              </p>
            </div>
            {preview.gift_count === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'receipts.nothingToReceipt',
                  {},
                  {
                    defaultValue:
                      'Nothing to receipt — this donor has no unreceipted gifts in that year.',
                  },
                )}
              </p>
            ) : (
              <>
                <ul className={cm.stack(1)}>
                  {preview.gifts.map((g) => (
                    <li key={g.id} className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {g.gift_date} · {formatMoney(g.amount_cents)} ·{' '}
                      {t(`gift.method.${g.method}`, {}, { defaultValue: g.method })}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={generate}
                  disabled={generating}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'bg-primary text-on-primary rounded-md disabled:opacity-50',
                  )}
                >
                  {generating
                    ? t('receipts.generating', {}, { defaultValue: 'Generating…' })
                    : t(
                        'receipts.generate',
                        { total: formatMoney(preview.total_cents) },
                        { defaultValue: 'Generate receipt for {{total}}' },
                      )}
                </button>
              </>
            )}
          </div>
        ) : null}

        {error ? (
          <p className={'text-error text-sm'} role="alert">
            {error}
          </p>
        ) : null}
      </section>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : receipts.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t(
            'receipts.empty',
            {},
            { defaultValue: 'No receipts issued yet — generate the first one above.' },
          )}
        </p>
      ) : (
        <div className={cm.cn(cm.card(), 'overflow-x-auto')}>
          <table className={'w-full text-left text-sm'}>
            <thead>
              <tr className={'border-b border-outline-variant'}>
                <Th>{t('receipts.col.number', {}, { defaultValue: 'Receipt #' })}</Th>
                <Th>{t('receipts.col.donor', {}, { defaultValue: 'Donor' })}</Th>
                <Th>{t('receipts.col.year', {}, { defaultValue: 'Year' })}</Th>
                <Th>{t('receipts.col.total', {}, { defaultValue: 'Total' })}</Th>
                <Th>{t('receipts.col.issued', {}, { defaultValue: 'Issued' })}</Th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr
                  key={r.id}
                  className={'border-b border-outline-variant hover:bg-surface-container'}
                >
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.fontWeight('medium'))}>
                    <Link to={`/receipts/${r.id}`}>{r.receipt_number}</Link>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <Link to={`/donors/${r.donor_id}`}>{r.donor_name}</Link>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {r.year}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.fontWeight('semibold'))}>
                    {formatMoney(r.total_cents)}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {r.issued_at.slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <th
      className={cm.cn(
        cm.sp('px', 4),
        cm.sp('py', 3),
        cm.textSize('xs'),
        cm.fontWeight('semibold'),
        'text-on-surface-variant',
        'uppercase tracking-wider',
      )}
    >
      {children}
    </th>
  )
}
