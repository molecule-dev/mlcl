/**
 * Editorial activity feed — recent invoices with status pill, icon chip,
 * customer + due date meta, tabular amount on the right. Search filter
 * along the heading.
 *
 * Translated from personal-finance's AccountRecentTransactions.tsx
 * (icon-chip + meta + right-aligned amount + status pill at end).
 */
import { useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface RecentInvoiceItem {
  id: string
  number: string
  customer_name: string
  due_date: string
  amount_cents: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void'
}

export interface RecentInvoicesCardProps {
  invoices: RecentInvoiceItem[]
}

const STATUS_ICON: Record<RecentInvoiceItem['status'], string> = {
  draft: 'edit_note',
  sent: 'send',
  paid: 'task_alt',
  overdue: 'schedule',
  void: 'block',
}

const STATUS_TONE: Record<RecentInvoiceItem['status'], { bg: string; text: string }> = {
  draft: { bg: 'bg-surface-container', text: 'text-on-surface-variant' },
  sent: { bg: 'bg-info/15', text: 'text-info' },
  paid: { bg: 'bg-success/15', text: 'text-success' },
  overdue: { bg: 'bg-error/15', text: 'text-error' },
  void: { bg: 'bg-surface-container', text: 'text-on-surface-variant' },
}

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function RecentInvoicesCard({ invoices }: RecentInvoicesCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')

  const filtered = search
    ? invoices.filter(
        (inv) =>
          inv.number.toLowerCase().includes(search.toLowerCase()) ||
          inv.customer_name.toLowerCase().includes(search.toLowerCase()),
      )
    : invoices

  return (
    <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-lowest rounded-[2rem]')}>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          'flex-wrap',
          cm.sp('mb', 6),
        )}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.2em] text-on-surface-variant',
            )}
          >
            {t('recentInvoicesCard.eyebrow', {}, { defaultValue: 'Accounts receivable' })}
          </p>
          <h3
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'text-on-surface',
            )}
          >
            {t('recentInvoicesCard.title', {}, { defaultValue: 'Recent invoices' })}
          </h3>
        </div>
        {/* Max-w keeps the desktop 16rem footprint; w-full stops the fixed
            width clipping past the viewport at 390px. */}
        <div className={cm.cn('relative w-full max-w-64')}>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant',
            )}
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t(
              'recentInvoicesCard.searchAriaLabel',
              {},
              { defaultValue: 'Search invoices' },
            )}
            placeholder={t(
              'recentInvoicesCard.searchPlaceholder',
              {},
              { defaultValue: 'Search invoices…' },
            )}
            className={cm.cn(
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.roundedFull,
              cm.w('full'),
              'bg-surface-container border-none focus:ring-2 focus:ring-primary/30 placeholder:text-on-surface-variant',
            )}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('recentInvoicesCard.empty', {}, { defaultValue: 'No invoices match.' })}
        </p>
      ) : (
        <ul className={cm.cn('space-y-3')}>
          {filtered.map((inv) => {
            const tone = STATUS_TONE[inv.status]
            const icon = STATUS_ICON[inv.status]
            const isPositive = inv.status === 'paid'
            return (
              <li key={inv.id}>
                <Link
                  to={`/invoices/${inv.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('p', 4),
                    'rounded-xl',
                    'bg-surface-container-low hover:shadow-sm hover:shadow-on-surface/5 transition-all group',
                  )}
                >
                  <div className={cm.flex({ align: 'center', gap: 'md' })}>
                    <div
                      className={cm.cn(
                        cm.w(11),
                        cm.h(11),
                        'rounded-xl',
                        cm.flex({ align: 'center', justify: 'center' }),
                        tone.bg,
                        tone.text,
                      )}
                      aria-hidden="true"
                    >
                      <span className="material-symbols-outlined">{icon}</span>
                    </div>
                    <div className={cm.cn('min-w-0')}>
                      <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface truncate')}>
                        {inv.number}
                        <span
                          className={cm.cn(
                            cm.fontWeight('normal'),
                            cm.sp('ml', 2),
                            'text-on-surface-variant',
                          )}
                        >
                          · {inv.customer_name}
                        </span>
                      </p>
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.sp('mt', 0),
                          'text-on-surface-variant',
                        )}
                      >
                        {t(
                          'recentInvoicesCard.dueMeta',
                          { date: fmtDate(inv.due_date) },
                          { defaultValue: 'Due {{date}}' },
                        )}
                      </p>
                    </div>
                  </div>
                  <div className={cm.flex({ align: 'center', gap: 'md' })}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        cm.roundedFull,
                        'uppercase tracking-widest',
                        tone.bg,
                        tone.text,
                      )}
                    >
                      {inv.status}
                    </span>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'tabular-nums',
                        isPositive ? 'text-success' : 'text-on-surface',
                      )}
                    >
                      {fmtUsd(inv.amount_cents)}
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <Link
        to="/invoices"
        className={cm.cn(
          'block w-full mt-6 py-3 text-sm font-bold text-center text-on-surface-variant hover:text-primary transition-colors',
        )}
      >
        {t('recentInvoicesCard.viewAll', {}, { defaultValue: 'View all invoices →' })}
      </Link>
    </section>
  )
}

export default RecentInvoicesCard
