import type * as React from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface WorkbookSummary {
  id: string
  name: string
  description: string
  /** Owner avatar initials (2 chars). */
  ownerInitials: string
  /** Display name for the owner. */
  ownerName: string
  /** Total rows across all sheets. */
  rowCount: number
  /** Total sheets in the workbook. */
  sheetCount: number
  /** ISO8601 timestamp. */
  updatedAt: string
  starred: boolean
  /** Optional brand-tinted dot for category. */
  category?: 'finance' | 'ops' | 'marketing' | 'product' | 'people'
}

interface WorkbookListItemProps {
  workbook: WorkbookSummary
  /** Optional handler — when provided, render an inline star toggle. */
  onToggleStar?: (id: string, nextStarred: boolean) => void
}

const CATEGORY_TINT: Record<NonNullable<WorkbookSummary['category']>, string> = {
  finance: 'bg-emerald-500',
  ops: 'bg-amber-500',
  marketing: 'bg-pink-500',
  product: 'bg-primary',
  people: 'bg-violet-500',
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'now'
  const min = Math.round(ms / 60_000)
  if (min < 60) return `${min}m`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h`
  const d = Math.round(hr / 24)
  if (d < 30) return `${d}d`
  return new Date(iso).toLocaleDateString()
}

/**
 * Editorial workbook list-item-row — category-tinted dot, owner avatar
 * tile, monospaced row-count meta, hover translate-x.
 *
 * Translated from api-documentation's EndpointsList row recipe (catalog
 * §3.1) but recoloured for spreadsheet vocabulary (rows × sheets, owner
 * avatar instead of HTTP method badge).
 */
export function WorkbookListItem({ workbook, onToggleStar }: WorkbookListItemProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tint = workbook.category ? CATEGORY_TINT[workbook.category] : 'bg-primary'

  function handleStarClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    onToggleStar?.(workbook.id, !workbook.starred)
  }

  return (
    <li className="group">
      <Link
        to={`/workbooks/${workbook.id}`}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'md' }),
          cm.sp('px', 5),
          cm.sp('py', 4),
          'hover:bg-surface-container-low transition-colors',
        )}
      >
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(10),
            cm.h(10),
            'rounded-xl bg-primary-fixed text-primary font-extrabold tracking-tight text-sm shrink-0',
          )}
          aria-hidden="true"
        >
          {workbook.ownerInitials.slice(0, 2).toUpperCase()}
        </span>
        <span className={cm.cn(cm.flex1, 'min-w-0')}>
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <span className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, tint)} aria-hidden="true" />
            <span className="font-bold text-on-surface truncate">{workbook.name}</span>
            {onToggleStar ? (
              <button
                type="button"
                onClick={handleStarClick}
                data-testid={`workbook-star-${workbook.id}`}
                aria-pressed={workbook.starred}
                aria-label={
                  workbook.starred
                    ? t(
                        'workbookListItem.unstar',
                        { name: workbook.name },
                        { defaultValue: 'Unstar {{name}}' },
                      )
                    : t(
                        'workbookListItem.star',
                        { name: workbook.name },
                        { defaultValue: 'Star {{name}}' },
                      )
                }
                className={cm.cn(
                  'shrink-0 rounded-full p-0.5 transition-colors',
                  workbook.starred
                    ? 'text-amber-400 hover:text-warning'
                    : 'text-on-surface-variant/50 hover:text-amber-400',
                )}
              >
                <span
                  className="material-symbols-outlined text-[16px]"
                  style={workbook.starred ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  aria-hidden="true"
                >
                  star
                </span>
              </button>
            ) : (
              workbook.starred && (
                <span
                  className="material-symbols-outlined text-amber-400 text-[16px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-label={t('status.starred', {}, { defaultValue: 'Starred' })}
                >
                  star
                </span>
              )
            )}
          </span>
          <span className={'block text-sm text-on-surface-variant truncate'}>
            {workbook.description}
          </span>
        </span>
        <span
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'end' }),
            'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant shrink-0 font-mono tabular-nums',
          )}
        >
          <span className={'text-on-surface text-sm font-extrabold'}>
            {workbook.rowCount.toLocaleString()}
          </span>
          <span>
            {t(
              'workbookListItem.rowsAndSheets',
              { rows: workbook.rowCount.toLocaleString(), sheets: workbook.sheetCount },
              { defaultValue: '{{sheets}} sheets · rows' },
            )}
          </span>
        </span>
        <span
          className={
            'text-[11px] font-bold uppercase tracking-widest text-on-surface-variant shrink-0 w-12 text-right'
          }
        >
          {formatRelative(workbook.updatedAt)}
        </span>
        <span
          className={
            'material-symbols-outlined text-on-surface-variant group-hover:text-primary group-hover:translate-x-0.5 transition-all text-base shrink-0'
          }
          aria-hidden="true"
        >
          arrow_forward
        </span>
      </Link>
    </li>
  )
}
