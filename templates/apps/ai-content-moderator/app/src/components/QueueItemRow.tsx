import { useEffect, useRef } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ConfidenceMeter } from './ConfidenceMeter.js'
import type { Verdict } from './VerdictBadge.js'
import { VerdictBadge } from './VerdictBadge.js'

export interface QueueItem {
  id: string
  preview: string
  source: string
  verdict: Verdict
  /** AI confidence in [0, 1]. */
  confidence: number
  /** Time since submission (e.g. "2m ago"). */
  age: string
  /** Priority level controls the colored dot. */
  priority?: 'urgent' | 'high' | 'normal' | 'low'
}

interface QueueItemRowProps {
  item: QueueItem
  /** Show selection checkbox column. */
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
  /** Highlight as the keyboard-cursor row (J/K navigation). */
  active?: boolean
}

const PRIORITY_DOT: Record<NonNullable<QueueItem['priority']>, string> = {
  urgent: 'bg-red-500',
  high: 'bg-amber-500',
  normal: 'bg-sky-500',
  low: 'bg-border-secondary border border-outline-variant',
}

/**
 * One row in the moderation queue table — colored priority dot,
 * 2-line content preview, source, verdict pill, AI confidence meter,
 * relative timestamp.
 */
export function QueueItemRow({
  item,
  selectable,
  selected,
  onToggleSelect,
  active,
}: QueueItemRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const dot = PRIORITY_DOT[item.priority ?? 'normal']
  const rowRef = useRef<HTMLTableRowElement>(null)

  // Keep the keyboard-cursor row in view while navigating with J/K.
  useEffect(() => {
    if (active) rowRef.current?.scrollIntoView({ block: 'nearest' })
  }, [active])

  return (
    <tr
      ref={rowRef}
      data-mol-id={`queue-row-${item.id}`}
      data-active={active || undefined}
      className={cm.cn(
        'h-[56px] hover:bg-surface-container-low/50 transition-colors group',
        active ? 'bg-primary/10' : '',
      )}
    >
      {selectable && (
        <td className={cm.cn('px-4 text-center align-middle w-10')}>
          <input
            type="checkbox"
            aria-label={t(
              'queue.selectItem',
              { id: item.id },
              { defaultValue: `Select item ${item.id}` },
            )}
            checked={!!selected}
            onChange={() => onToggleSelect?.(item.id)}
            className={cm.cn('w-4 h-4 rounded text-primary focus:ring-primary')}
          />
        </td>
      )}
      <td className={cm.cn('px-4 text-center align-middle w-12')}>
        <span
          aria-label={t(
            'queue.priorityLabel',
            { priority: item.priority ?? 'normal' },
            { defaultValue: `Priority ${item.priority ?? 'normal'}` },
          )}
          className={cm.cn('inline-block w-2 h-2 rounded-full', dot)}
        />
      </td>
      <td className={cm.cn('px-4 py-2 align-middle')}>
        <Link
          to={`/queue/${item.id}`}
          className={cm.cn(
            'line-clamp-2 text-xs leading-snug text-on-surface font-medium hover:text-primary transition-colors',
          )}
        >
          {item.preview}
        </Link>
      </td>
      <td className={cm.cn('px-4 text-xs text-on-surface-variant align-middle whitespace-nowrap')}>
        {item.source}
      </td>
      <td className={cm.cn('px-4 align-middle')}>
        <VerdictBadge verdict={item.verdict} />
      </td>
      <td className={cm.cn('px-4 align-middle w-32')}>
        <ConfidenceMeter value={item.confidence} variant="compact" />
      </td>
      <td
        className={cm.cn(
          'px-4 text-right text-xs text-on-surface-variant whitespace-nowrap align-middle',
        )}
      >
        {item.age}
      </td>
    </tr>
  )
}
