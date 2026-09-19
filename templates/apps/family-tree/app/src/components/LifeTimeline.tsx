import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatFullDate, type LifeEvent, type LifeEventKind } from '../lib/people.js'

export interface LifeTimelineProps {
  events: LifeEvent[]
}

const KIND_COLOR: Record<LifeEventKind, string> = {
  birth: 'var(--color-tree-parent)',
  death: 'var(--color-tree-deceased)',
  partnership: 'var(--color-tree-partner)',
  child: 'var(--color-tree-child)',
}

const KIND_ICON: Record<LifeEventKind, string> = {
  birth: 'child_care',
  death: 'eco',
  partnership: 'favorite',
  child: 'person_add',
}

/**
 * Life timeline — the per-person chronological view of the family graph:
 * birth, partnerships, each child's birth, and death, rendered as a vertical
 * timeline with left-gutter dates (donor's visit-timeline pattern,
 * recoloured to the Branches genealogy palette).
 */
export function LifeTimeline({ events }: LifeTimelineProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (events.length === 0) {
    return (
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t(
          'lifeTimeline.empty',
          {},
          { defaultValue: 'No life events recorded yet — add dates on this profile.' },
        )}
      </p>
    )
  }

  const detailLine = (e: LifeEvent): string => {
    switch (e.kind) {
      case 'birth':
        return e.detail
          ? t('lifeTimeline.bornIn', { place: e.detail }, { defaultValue: 'Born in {{place}}' })
          : t('lifeTimeline.born', {}, { defaultValue: 'Born' })
      case 'death':
        return e.detail
          ? t('lifeTimeline.diedIn', { place: e.detail }, { defaultValue: 'Died in {{place}}' })
          : t('lifeTimeline.died', {}, { defaultValue: 'Died' })
      case 'partnership':
        return t(
          'lifeTimeline.partnershipWith',
          { name: e.detail },
          { defaultValue: 'Partnership with {{name}}' },
        )
      case 'child':
        return e.date
          ? t(
              'lifeTimeline.childBorn',
              { name: e.detail, date: formatFullDate(e.date) ?? '' },
              { defaultValue: '{{name}} born {{date}}' },
            )
          : t('lifeTimeline.child', { name: e.detail }, { defaultValue: 'Child: {{name}}' })
    }
  }

  return (
    <ol className={cm.cn(cm.flex({ direction: 'col' }), 'gap-0')} data-mol-id="life-timeline">
      {events.map((e, idx) => {
        const isLast = idx === events.length - 1
        return (
          <li
            key={`${e.kind}-${e.date ?? 'undated'}-${idx}`}
            className={cm.cn(cm.flex({ gap: 'md' }))}
          >
            <div
              className={cm.cn(cm.shrink0, cm.flex({ direction: 'col', align: 'center' }), 'w-12')}
            >
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'tabular-nums uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {e.date ? formatFullDate(e.date)?.split(', ')[0] : '—'}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'tabular-nums text-on-surface-variant/70')}>
                {e.date ? e.date.slice(0, 4) : ''}
              </p>
              <div
                className={cm.cn(cm.sp('mt', 1), cm.w(3), cm.h(3), cm.roundedFull, 'shrink-0 z-10')}
                style={{ backgroundColor: KIND_COLOR[e.kind] }}
                aria-hidden="true"
              />
              {!isLast && (
                <div
                  className={cm.cn(
                    cm.flex1,
                    cm.w(0),
                    'border-l-2 border-outline-variant/40 mt-1 min-h-10',
                  )}
                  aria-hidden="true"
                />
              )}
            </div>

            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('pb', 6))}>
              <span
                className={cm.cn('material-symbols-outlined text-base')}
                style={{ color: KIND_COLOR[e.kind] }}
                aria-hidden="true"
              >
                {KIND_ICON[e.kind]}
              </span>
              <p className={cm.cn(cm.textSize('sm'))}>{detailLine(e)}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export default LifeTimeline
