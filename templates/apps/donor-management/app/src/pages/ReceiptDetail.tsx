import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatMoney } from '../lib/format.js'
import { unwrapSingle } from '../lib/unwrap.js'
import type { ReceiptDetail } from '../types.js'

/**
 * Print-friendly receipt view — donor-management's signature artifact.
 *
 * The receipt document itself renders in a plain `.receipt-sheet` card
 * (black on white, no app chrome); everything else on the page carries
 * the `no-print` class and is hidden by the `@media print` rules in
 * index.css. The UIClassMap has no print utilities, so the print rules
 * live there as app CSS — the documented fallback for exactly this case.
 * There is no PDF binary generation and no email sending on purpose: the
 * integration point for automated delivery is a documents bond (PDF) +
 * the emails bond, wired at this route.
 */
export function ReceiptDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/receipts/${id}`)
      .then((res) => {
        if (!cancelled) setReceipt(unwrapSingle<ReceiptDetail>(res))
      })
      .catch(() => {
        if (!cancelled) setError(t('receipts.notFound', {}, { defaultValue: 'Receipt not found.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (loading) {
    return (
      <p className={cm.cn(cm.sp('p', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loading', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }
  if (error || !receipt) {
    return (
      <div className={cm.cn(cm.sp('p', 16), cm.textCenter)}>
        <p className={'text-error'}>{error}</p>
        <Link to="/receipts" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          ← {t('receipts.backToList', {}, { defaultValue: 'Back to receipts' })}
        </Link>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('3xl'), cm.mxAuto)}>
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <nav>
          <Link to="/receipts" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
            ← {t('receipts.backToList', {}, { defaultValue: 'Back to receipts' })}
          </Link>
        </nav>
        <button
          type="button"
          onClick={() => window.print()}
          data-mol-id="receipt-print"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          {t('receipts.print', {}, { defaultValue: 'Print receipt' })}
        </button>
      </div>

      {/* Statement banner — the design's "Receipt Statement #…" header. */}
      <div
        data-mol-id="receipt-statement-banner"
        className={cm.cn(
          cm.sp('mt', 4),
          cm.sp('p', 4),
          'no-print rounded-xl bg-surface-container-low flex items-start justify-between gap-3 flex-wrap',
        )}
      >
        <div className={cm.stack(1)}>
          <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'font-display')}>
            {t('receipts.statementHeading', {}, { defaultValue: 'Receipt statement' })}{' '}
            <span className={'tabular-nums'}>#{receipt.receipt_number}</span>
          </h2>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'receipts.statementSub',
              { year: receipt.year },
              {
                defaultValue:
                  'Consolidated statutory acknowledgment for federal tax year {{year}}.',
              },
            )}
          </p>
        </div>
        <span
          className={cm.cn(
            cm.sp('px', 2),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'rounded uppercase bg-primary-container text-on-primary-container',
          )}
        >
          {t('receipts.statementBadge', {}, { defaultValue: 'IRS Sec. 170(f)(8) compliant' })}
        </span>
      </div>

      <article className={'receipt-sheet mt-4'}>
        <header className={cm.flex({ align: 'start', justify: 'between' })}>
          <div>
            <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
              {t('receipts.sheet.heading', {}, { defaultValue: 'Receipt for tax purposes' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'receipts.sheet.taxYear',
                { year: receipt.year },
                { defaultValue: 'Tax year {{year}}' },
              )}
            </p>
          </div>
          <div className={cm.textRight}>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {t('receipts.sheet.number', {}, { defaultValue: 'Receipt #' })}{' '}
              {receipt.receipt_number}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('receipts.sheet.issued', {}, { defaultValue: 'Issued' })}{' '}
              {receipt.issued_at.slice(0, 10)}
            </p>
          </div>
        </header>

        <section className={cm.sp('mt', 6)}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wider',
            )}
          >
            {t('receipts.sheet.donor', {}, { defaultValue: 'Donor' })}
          </h2>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('medium'))}>
            {receipt.donor?.name ?? receipt.donor_name}
            {receipt.donor?.is_organization
              ? t('receipts.sheet.orgSuffix', {}, { defaultValue: ' (organization)' })
              : ''}
          </p>
          {receipt.donor?.address ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {receipt.donor.address}
            </p>
          ) : null}
          {receipt.donor?.email ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {receipt.donor.email}
            </p>
          ) : null}
        </section>

        <section className={cm.sp('mt', 6)}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wider',
            )}
          >
            {t('receipts.sheet.ledgerHeading', {}, { defaultValue: 'Substantiated Gifts Ledger' })}
          </h2>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}>
            {t(
              'receipts.sheet.ledgerSub',
              { year: receipt.year },
              {
                defaultValue:
                  'Itemized qualified contributions received in tax year {{year}} — one line per settled gift.',
              },
            )}
          </p>
        </section>

        <table className={cm.cn(cm.sp('mt', 3), 'w-full text-left text-sm')}>
          <thead>
            <tr className={'border-b border-outline-variant'}>
              <th className={cm.cn(cm.sp('py', 2), cm.textSize('xs'), 'uppercase tracking-wider')}>
                {t('receipts.sheet.col.date', {}, { defaultValue: 'Date' })}
              </th>
              <th className={cm.cn(cm.sp('py', 2), cm.textSize('xs'), 'uppercase tracking-wider')}>
                {t('receipts.sheet.col.fund', {}, { defaultValue: 'Fund' })}
              </th>
              <th className={cm.cn(cm.sp('py', 2), cm.textSize('xs'), 'uppercase tracking-wider')}>
                {t('receipts.sheet.col.method', {}, { defaultValue: 'Method' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  'uppercase tracking-wider',
                  cm.textRight,
                )}
              >
                {t('receipts.sheet.col.amount', {}, { defaultValue: 'Amount' })}
              </th>
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((item) => (
              <tr key={item.id} className={'border-b border-outline-variant'}>
                <td className={cm.sp('py', 2)}>{item.gift_date}</td>
                <td className={cm.sp('py', 2)}>
                  {t(`gift.fund.${item.fund}`, {}, { defaultValue: item.fund })}
                </td>
                <td className={cm.sp('py', 2)}>
                  {t(`gift.method.${item.method}`, {}, { defaultValue: item.method })}
                </td>
                <td className={cm.cn(cm.sp('py', 2), cm.textRight)}>
                  {formatMoney(item.amount_cents)}
                </td>
              </tr>
            ))}
            <tr>
              <td
                colSpan={3}
                className={cm.cn(cm.sp('py', 2), cm.fontWeight('bold'), cm.textRight)}
              >
                {t('receipts.sheet.total', {}, { defaultValue: 'Total given' })}
              </td>
              <td className={cm.cn(cm.sp('py', 2), cm.fontWeight('bold'), cm.textRight)}>
                {formatMoney(receipt.total_cents)}
              </td>
            </tr>
          </tbody>
        </table>

        <section className={cm.sp('mt', 6)}>
          <h3
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wider',
            )}
          >
            {t(
              'receipts.sheet.disclosureHeading',
              {},
              {
                defaultValue: 'Mandatory IRS Fiduciary Disclosure Language (Safe-Harbor Verbatim)',
              },
            )}
          </h3>
          <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'receipts.sheet.declaration',
              {},
              {
                defaultValue:
                  'This receipt acknowledges the gifts listed above. No goods or services were provided in exchange unless otherwise noted.',
              },
            )}
          </p>
        </section>
        <p className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'font-medium')}>
          {t(
            'receipts.sheet.thankYou',
            {},
            { defaultValue: 'Thank you for your generous support.' },
          )}
        </p>
      </article>

      {/* Dispatch timeline — the record of how this statement travelled. */}
      <section
        data-mol-id="receipt-dispatch-timeline"
        className={cm.cn(cm.card(), 'no-print mt-6', cm.sp('p', 6), cm.stack(3))}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {t(
            'receipts.timelineHeading',
            {},
            { defaultValue: 'Transmission & Audit Dispatch Timeline' },
          )}
        </h2>
        <ol className={cm.stack(3)}>
          <li className={cm.cn(cm.flex({ align: 'start', gap: 2 }), cm.textSize('sm'))}>
            <span className="material-symbols-outlined text-primary text-base" aria-hidden="true">
              schedule
            </span>
            <span>
              {t(
                'receipts.timelineIssued',
                { date: receipt.issued_at.slice(0, 10) },
                { defaultValue: 'Statement issued {{date}} with a sequential receipt number.' },
              )}
            </span>
          </li>
          <li className={cm.cn(cm.flex({ align: 'start', gap: 2 }), cm.textSize('sm'))}>
            <span className="material-symbols-outlined text-primary text-base" aria-hidden="true">
              person
            </span>
            <span>
              {t(
                'receipts.timelineDonor',
                { donor: receipt.donor?.name ?? receipt.donor_name },
                {
                  defaultValue:
                    'Recorded against {{donor}} — the acknowledgment names them verbatim.',
                },
              )}
            </span>
          </li>
          <li className={cm.cn(cm.flex({ align: 'start', gap: 2 }), cm.textSize('sm'))}>
            <span className="material-symbols-outlined text-primary text-base" aria-hidden="true">
              receipt_long
            </span>
            <span>
              {t(
                'receipts.timelineItems',
                { count: receipt.items.length, total: formatMoney(receipt.total_cents) },
                {
                  defaultValue:
                    '{{count}} substantiated gift lines totaling {{total}} — re-printable any time without alteration.',
                },
              )}
            </span>
          </li>
        </ol>
      </section>
    </div>
  )
}
